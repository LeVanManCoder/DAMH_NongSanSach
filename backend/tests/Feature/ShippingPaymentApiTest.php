<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'shipping.google_maps_api_key' => null,
            'shipping.origin_address' => null,
            'shipping.fallback_distance_km' => 5,
        ]);
        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
    }

    public function test_shipping_quote_calculates_fee_from_distance_and_haversine_fallback(): void
    {
        $token = $this->tokenFor('customer');

        $this->withToken($token)
            ->postJson('/api/shipping/calculate', ['khoang_cach_km' => '4.50'])
            ->assertOk()
            ->assertJsonPath('data.khoang_cach_km', '4.50')
            ->assertJsonPath('data.phi_van_chuyen', 22500)
            ->assertJsonPath('data.phuong_thuc_tinh', 'khoang_cach_cung_cap');

        config([
            'shipping.origin_latitude' => 0,
            'shipping.origin_longitude' => 0,
        ]);

        $this->withToken($token)
            ->postJson('/api/shipping/calculate', [
                'dia_chi_giao' => 'Địa chỉ kiểm thử',
                'vi_do' => 0,
                'kinh_do' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('data.khoang_cach_km', '111.19')
            ->assertJsonPath('data.phi_van_chuyen', 555950)
            ->assertJsonPath('data.phuong_thuc_tinh', 'haversine');
    }

    public function test_order_shipping_fee_is_recalculated_server_side_instead_of_trusting_client(): void
    {
        $token = $this->tokenFor('customer');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        $this->withToken($token)->postJson('/api/cart', [
            'product_id' => $product->getKey(),
            'so_luong' => '1.00',
        ])->assertCreated();

        $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Nguyễn Thị An',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
            'phi_van_chuyen' => 0,
        ])->assertUnprocessable();

        $order = $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Nguyễn Thị An',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
        ])->assertCreated()
            ->assertJsonPath('data.khoang_cach_km', '5.00')
            ->assertJsonPath('data.phi_van_chuyen', '25000')
            ->assertJsonPath('data.tong_thanh_toan', '70000')
            ->json('data');

        $this->assertSame(0, Order::query()->where('id', $order['id'])->where('phi_van_chuyen', 0)->count());
    }

    public function test_successful_payment_ipn_allocates_fefo_stock_once_and_is_idempotent(): void
    {
        $token = $this->tokenFor('customer');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        $this->withToken($token)->postJson('/api/cart', [
            'product_id' => $product->getKey(),
            'so_luong' => '10.00',
        ])->assertCreated();

        $orderId = $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Trần Văn Bình',
            'sdt_nguoi_nhan' => '0912345678',
            'dia_chi_giao' => '45 Đường Nông Trại, Đà Lạt',
        ])->assertCreated()->json('data.id');

        $payment = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'momo',
        ])->assertCreated()
            ->assertJsonPath('data.payment.trang_thai', 'cho_xu_ly')
            ->assertJsonPath('data.payment.so_tien', '475000')
            ->json('data');

        $callback = [
            'ma_giao_dich' => $payment['payment']['ma_giao_dich'],
            'so_tien' => 475000,
            'trang_thai' => 'thanh_cong',
        ];

        $this->postJson('/api/payments/ipn', $callback)
            ->assertOk()
            ->assertJsonPath('data.order.trang_thai', 'da_thanh_toan')
            ->assertJsonPath('data.payment.trang_thai', 'thanh_cong');

        $this->assertSame('0.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertSame(2, Order::query()->findOrFail($orderId)->details()->count());
        $this->assertDatabaseHas('order_details', [
            'order_id' => $orderId,
            'batch_id' => Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('id'),
            'so_luong' => '3.00',
        ]);
        $this->assertDatabaseHas('order_details', [
            'order_id' => $orderId,
            'batch_id' => Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('id'),
            'so_luong' => '7.00',
        ]);

        $this->postJson('/api/payments/ipn', $callback)
            ->assertOk()
            ->assertJsonPath('data.order.trang_thai', 'da_thanh_toan');

        $this->assertSame('0.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertSame('da_thanh_toan', Order::query()->findOrFail($orderId)->trang_thai);
    }

    public function test_payment_ipn_rejects_an_incorrect_amount_without_changing_payment_or_inventory(): void
    {
        $token = $this->tokenFor('customer');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        $this->withToken($token)->postJson('/api/cart', [
            'product_id' => $product->getKey(),
            'so_luong' => '1.00',
        ])->assertCreated();

        $orderId = $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Lê Minh Anh',
            'sdt_nguoi_nhan' => '0900000000',
            'dia_chi_giao' => 'Địa chỉ kiểm thử, Đà Lạt',
        ])->assertCreated()->json('data.id');

        $payment = $this->withToken($token)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'vnpay',
        ])->assertCreated()->json('data.payment');

        $this->postJson('/api/payments/ipn', [
            'ma_giao_dich' => $payment['ma_giao_dich'],
            'so_tien' => (int) $payment['so_tien'] - 1,
            'trang_thai' => 'thanh_cong',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.so_tien.0', 'Số tiền callback không khớp với giao dịch.');

        $this->assertDatabaseHas('payments', [
            'id' => $payment['id'],
            'trang_thai' => 'cho_xu_ly',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'trang_thai' => 'cho_duyet',
        ]);
        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
    }

    private function tokenFor(string $role): string
    {
        $user = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();

        return app(JwtTokenService::class)->issue($user);
    }
}
