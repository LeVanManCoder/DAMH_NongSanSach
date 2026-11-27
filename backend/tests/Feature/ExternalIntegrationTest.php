<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\ImageStorageService;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExternalIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private const PNG_FIXTURE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
        Storage::fake('public');
    }

    public function test_image_storage_falls_back_to_public_disk_and_returns_a_public_url(): void
    {
        config([
            'app.env' => 'testing',
            'services.cloudinary.cloud_name' => 'demo',
            'services.cloudinary.api_key' => 'test-key',
            'services.cloudinary.api_secret' => 'test-secret',
        ]);

        $images = app(ImageStorageService::class);
        $url = $images->store($this->pngFile('proof.png'), 'nong-lanh/complaints');

        $path = $images->storagePath($url);
        $this->assertIsString($path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame('http://localhost/storage/'.$path, $url);
    }

    public function test_image_storage_uploads_to_cloudinary_and_returns_its_https_url(): void
    {
        config([
            'app.env' => 'local',
            'services.cloudinary.cloud_name' => 'demo-cloud',
            'services.cloudinary.api_key' => 'test-api-key',
            'services.cloudinary.api_secret' => 'test-api-secret',
        ]);
        $capturedParts = [];
        Http::fake(function ($request, array $options) use (&$capturedParts) {
            $capturedParts = $options['multipart'] ?? $options['laravel_data'] ?? [];

            return Http::response([
                'secure_url' => 'https://res.cloudinary.com/demo-cloud/image/upload/proof.jpg',
            ]);
        });

        $url = app(ImageStorageService::class)->store(
            $this->pngFile('proof.png'),
            'nong-lanh/farming-logs',
        );

        $this->assertSame('https://res.cloudinary.com/demo-cloud/image/upload/proof.jpg', $url);
        $fields = collect($capturedParts)
            ->filter(fn (array $part): bool => ($part['name'] ?? null) !== 'file')
            ->mapWithKeys(fn (array $part): array => [$part['name'] => $part['contents']])
            ->all();
        $expected = sha1(
            'folder=nong-lanh/farming-logs&timestamp='.($fields['timestamp'] ?? '').'test-api-secret',
        );
        $this->assertTrue(
            ($fields['folder'] ?? null) === 'nong-lanh/farming-logs'
                && ($fields['api_key'] ?? null) === 'test-api-key'
                && hash_equals($expected, (string) ($fields['signature'] ?? '')),
            'Cloudinary upload should use a valid SHA-1 request signature.',
        );
        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
        config(['app.env' => 'testing']);
    }

    public function test_vietqr_payment_returns_dynamic_bank_transfer_qr_details(): void
    {
        config([
            'services.vietqr.bank_id' => '970415',
            'services.vietqr.account_no' => '0123456789',
            'services.vietqr.account_name' => 'NONG LANH',
            'services.vietqr.template' => 'compact2',
        ]);
        $token = $this->tokenForRole('customer');
        $orderId = $this->createOrder($token, '1.00');

        $response = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'vietqr',
        ])->assertCreated()
            ->assertJsonPath('data.payment.phuong_thuc', 'vietqr')
            ->assertJsonPath('data.transfer.bank_id', '970415')
            ->assertJsonPath('data.transfer.account_no', '0123456789')
            ->assertJsonPath('data.transfer.account_name', 'NONG LANH')
            ->assertJsonPath('data.transfer.amount', 70000);

        $paymentId = $response->json('data.payment.id');
        $this->assertSame(
            'https://img.vietqr.io/image/970415-0123456789-compact2.png?amount=70000&addInfo=NL'.$paymentId.'&accountName=NONG%20LANH',
            $response->json('data.qr_image_url'),
        );
        $this->assertSame($response->json('data.qr_image_url'), $response->json('data.payment_url'));
        $this->assertSame('NL'.$paymentId, $response->json('data.transfer.transfer_content'));
    }

    public function test_payos_falls_back_to_vietqr_without_credentials(): void
    {
        config([
            'services.payos.client_id' => null,
            'services.payos.api_key' => null,
            'services.payos.checksum_key' => null,
            'services.vietqr.bank_id' => '970415',
            'services.vietqr.account_no' => '0123456789',
            'services.vietqr.account_name' => 'NONG LANH',
        ]);
        Http::fake();
        $token = $this->tokenForRole('customer');
        $orderId = $this->createOrder($token, '1.00');

        $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'payos',
        ])->assertCreated()
            ->assertJsonPath('data.payment.phuong_thuc', 'payos')
            ->assertJsonPath('data.transfer.bank_id', '970415')
            ->assertJsonPath('data.can_simulate', true);

        Http::assertNothingSent();
    }

    public function test_vnpay_ipn_verifies_signature_and_is_idempotent_for_fefo_allocation(): void
    {
        config([
            'services.vnpay.tmn_code' => 'TESTTMN',
            'services.vnpay.hash_secret' => 'vnpay-test-secret',
            'services.vnpay.return_url' => 'http://localhost/checkout',
        ]);
        $token = $this->tokenForRole('customer');
        $orderId = $this->createOrder($token, '10.00');
        $createResponse = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'vnpay',
        ])->assertCreated();
        $payment = $createResponse->json('data.payment');
        $paymentUrl = $createResponse->json('data.payment_url');
        parse_str((string) parse_url($paymentUrl, PHP_URL_QUERY), $urlParams);
        $urlSignature = $urlParams['vnp_SecureHash'] ?? null;
        unset($urlParams['vnp_SecureHash']);
        ksort($urlParams, SORT_STRING);
        $this->assertSame(
            hash_hmac(
                'sha512',
                http_build_query($urlParams, '', '&', PHP_QUERY_RFC3986),
                'vnpay-test-secret',
            ),
            $urlSignature,
        );
        $this->assertSame((int) $payment['so_tien'] * 100, (int) ($urlParams['vnp_Amount'] ?? 0));

        $params = [
            'vnp_TmnCode' => 'TESTTMN',
            'vnp_TxnRef' => (string) $payment['id'],
            'vnp_Amount' => (string) ((int) $payment['so_tien'] * 100),
            'vnp_ResponseCode' => '00',
            'vnp_TransactionStatus' => '00',
        ];
        $invalidSignature = $params + ['vnp_SecureHash' => 'invalid'];
        $this->postJson('/api/payments/vnpay/ipn', $invalidSignature)
            ->assertOk()
            ->assertJsonPath('RspCode', '97');
        $signedParams = $this->signVnpay($params);

        $this->postJson('/api/payments/vnpay/ipn', $signedParams)
            ->assertOk()
            ->assertExactJson(['RspCode' => '00', 'Message' => 'Confirm Success']);
        $this->postJson('/api/payments/vnpay/ipn', $signedParams)
            ->assertOk()
            ->assertExactJson(['RspCode' => '00', 'Message' => 'Confirm Success']);

        $this->assertSame('0.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertSame(2, Order::query()->findOrFail($orderId)->details()->count());
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'trang_thai' => 'da_thanh_toan']);
    }

    public function test_payos_webhook_checks_hmac_and_confirms_payment_once(): void
    {
        config([
            'services.payos.client_id' => 'test-client-id',
            'services.payos.api_key' => 'test-api-key',
            'services.payos.checksum_key' => 'payos-test-checksum',
        ]);
        Http::fake([
            'https://api-merchant.payos.vn/v2/payment-requests' => Http::response([
                'code' => '00',
                'data' => [
                    'checkoutUrl' => 'https://pay.payos.vn/web/checkout',
                    'qrCode' => '000201010212',
                    'paymentLinkId' => 'payos-link-1',
                ],
            ]),
        ]);

        $token = $this->tokenForRole('customer');
        $orderId = $this->createOrder($token, '10.00');
        $payment = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'payos',
        ])->assertCreated()
            ->assertJsonPath('data.payment_url', 'https://pay.payos.vn/web/checkout')
            ->assertJsonPath('data.qr_payload', '000201010212')
            ->json('data.payment');
        Http::assertSent(function ($request): bool {
            $data = $request->data();
            $signature = $data['signature'] ?? '';
            unset($data['signature']);
            ksort($data, SORT_STRING);
            $canonical = collect($data)
                ->map(fn ($value, $key) => $key.'='.$value)
                ->implode('&');

            return $request->hasHeader('x-client-id', 'test-client-id')
                && $request->hasHeader('x-api-key', 'test-api-key')
                && hash_equals(
                    hash_hmac('sha256', $canonical, 'payos-test-checksum'),
                    (string) $signature,
                );
        });

        $data = [
            'orderCode' => $payment['id'],
            'amount' => (int) $payment['so_tien'],
            'code' => '00',
            'description' => 'NL'.$payment['id'],
        ];
        $payload = [
            'code' => '00',
            'success' => true,
            'data' => $data,
            'signature' => $this->signPayOs($data),
        ];

        $this->postJson('/api/payments/payos/webhook', $payload)
            ->assertOk()
            ->assertJsonPath('code', '00');
        $this->postJson('/api/payments/payos/webhook', $payload)
            ->assertOk()
            ->assertJsonPath('code', '00');

        $this->assertSame('0.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'trang_thai' => 'da_thanh_toan']);
        $this->assertDatabaseHas('payments', ['id' => $payment['id'], 'trang_thai' => 'thanh_cong']);
    }

    public function test_payos_webhook_rejects_an_invalid_signature(): void
    {
        config(['services.payos.checksum_key' => 'payos-test-checksum']);

        $this->postJson('/api/payments/payos/webhook', [
            'success' => true,
            'data' => ['orderCode' => 1, 'amount' => 70000],
            'signature' => 'not-a-valid-signature',
        ])->assertUnauthorized()
            ->assertJsonPath('code', '97');
    }

    public function test_legacy_simulated_ipn_cannot_confirm_provider_payments_in_production(): void
    {
        $token = $this->tokenForRole('customer');
        $orderId = $this->createOrder($token, '1.00');
        $payment = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'momo',
        ])->assertCreated()->json('data.payment');

        config(['app.env' => 'production']);
        $this->postJson('/api/payments/ipn', [
            'ma_giao_dich' => $payment['ma_giao_dich'],
            'so_tien' => (int) $payment['so_tien'],
            'trang_thai' => 'thanh_cong',
        ])->assertForbidden();

        $this->assertDatabaseHas('payments', [
            'id' => $payment['id'],
            'trang_thai' => 'cho_xu_ly',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'trang_thai' => 'cho_duyet',
        ]);
    }

    private function createOrder(string $token, string $quantity): int
    {
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $this->withToken($token)->postJson('/api/cart', [
            'product_id' => $product->getKey(),
            'so_luong' => $quantity,
        ])->assertCreated();

        return $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Khách hàng tích hợp',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
        ])->assertCreated()->json('data.id');
    }

    private function pngFile(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::PNG_FIXTURE));
    }

    private function tokenForRole(string $role): string
    {
        $user = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();

        return app(JwtTokenService::class)->issue($user);
    }

    /**
     * @param  array<string, string>  $params
     * @return array<string, string>
     */
    private function signVnpay(array $params): array
    {
        ksort($params, SORT_STRING);
        $params['vnp_SecureHash'] = hash_hmac(
            'sha512',
            http_build_query($params, '', '&', PHP_QUERY_RFC3986),
            (string) config('services.vnpay.hash_secret'),
        );

        return $params;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function signPayOs(array $data): string
    {
        ksort($data, SORT_STRING);
        $canonical = collect($data)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode('&');

        return hash_hmac('sha256', $canonical, (string) config('services.payos.checksum_key'));
    }
}
