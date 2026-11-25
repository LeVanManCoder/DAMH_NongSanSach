<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ComplaintApiTest extends TestCase
{
    use RefreshDatabase;

    private const PNG_FIXTURE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    public function test_customer_can_submit_a_complaint_for_a_recently_delivered_order_with_image_evidence(): void
    {
        $customer = $this->customer();
        $order = $this->deliveredOrder($customer);

        $response = $this->withToken($this->tokenFor($customer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'hu_hong',
                'mo_ta' => 'Một phần sản phẩm bị dập.',
                'anh_minh_chung' => $this->pngFile('minh-chung.png', 1024),
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.order_id', $order->getKey())
            ->assertJsonPath('data.ly_do', 'hu_hong')
            ->assertJsonPath('data.trang_thai', 'cho_xu_ly')
            ->assertJsonPath('data.media.0.loai', 'anh');

        $mediaPath = $response->json('data.media.0.media_url');
        Storage::disk('public')->assertExists($mediaPath);
        $this->assertDatabaseHas('complaints', [
            'order_id' => $order->getKey(),
            'user_id' => $customer->getKey(),
            'ly_do' => 'hu_hong',
        ]);
        $this->assertDatabaseHas('complaint_media', [
            'media_url' => $mediaPath,
            'loai' => 'anh',
            'mime_type' => 'image/png',
        ]);
    }

    public function test_customer_cannot_submit_an_invalid_image_file(): void
    {
        $customer = $this->customer();
        $order = $this->deliveredOrder($customer);

        $this->withToken($this->tokenFor($customer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'khac',
                'anh_minh_chung' => UploadedFile::fake()->create('minh-chung.gif', 100, 'image/gif'),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error')
            ->assertJsonStructure(['errors' => ['anh_minh_chung']]);

        $this->assertDatabaseCount('complaints', 0);
        Storage::disk('public')->assertDirectoryEmpty('complaints');
    }

    public function test_customer_cannot_submit_an_image_larger_than_five_megabytes(): void
    {
        $customer = $this->customer();
        $order = $this->deliveredOrder($customer);

        $this->withToken($this->tokenFor($customer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'khac',
                'anh_minh_chung' => $this->pngFile('qua-lon.png', 5121),
            ])
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['anh_minh_chung']]);

        $this->assertDatabaseCount('complaints', 0);
        Storage::disk('public')->assertDirectoryEmpty('complaints');
    }

    public function test_customer_cannot_submit_a_complaint_more_than_twenty_four_hours_after_delivery(): void
    {
        $customer = $this->customer();
        $order = $this->deliveredOrder($customer, now()->subHours(25));

        $this->withToken($this->tokenFor($customer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'khac',
                'anh_minh_chung' => $this->pngFile('minh-chung.png'),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.order.0', 'Chỉ có thể khiếu nại đơn đã giao trong vòng 24 giờ.');

        $this->assertDatabaseCount('complaints', 0);
        Storage::disk('public')->assertDirectoryEmpty('complaints');
    }

    public function test_paid_but_not_delivered_order_is_not_eligible_for_a_complaint(): void
    {
        $customer = $this->customer();
        $order = $this->deliveredOrder($customer, now(), 'da_thanh_toan');

        $this->withToken($this->tokenFor($customer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'khac',
                'anh_minh_chung' => $this->pngFile('minh-chung.png'),
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.order.0', 'Chỉ có thể khiếu nại đơn đã giao trong vòng 24 giờ.');

        $this->assertDatabaseCount('complaints', 0);
        Storage::disk('public')->assertDirectoryEmpty('complaints');
    }

    public function test_customer_cannot_submit_a_complaint_for_another_customers_order(): void
    {
        $owner = $this->customer();
        $otherCustomer = $this->customer();
        $order = $this->deliveredOrder($owner);

        $this->withToken($this->tokenFor($otherCustomer))
            ->post('/api/orders/'.$order->getKey().'/complaints', [
                'ly_do' => 'khac',
                'anh_minh_chung' => $this->pngFile('minh-chung.png'),
            ])
            ->assertNotFound()
            ->assertJsonPath('status', 'error');

        $this->assertDatabaseCount('complaints', 0);
        Storage::disk('public')->assertDirectoryEmpty('complaints');
    }

    private function customer(): User
    {
        return User::query()->create([
            'ho_ten' => 'Khách hàng khiếu nại',
            'email' => Str::uuid().'@example.test',
            'password' => 'Password@123',
        ]);
    }

    private function tokenFor(User $customer): string
    {
        return app(JwtTokenService::class)->issue($customer);
    }

    private function pngFile(string $name, int $sizeInKilobytes = 1): UploadedFile
    {
        return UploadedFile::fake()
            ->createWithContent($name, base64_decode(self::PNG_FIXTURE))
            ->size($sizeInKilobytes);
    }

    private function deliveredOrder(
        User $customer,
        mixed $deliveredAt = null,
        string $status = 'da_giao',
    ): Order {
        return Order::query()->create([
            'ma_don' => Str::upper(Str::random(20)),
            'user_id' => $customer->getKey(),
            'loai_don' => 'le',
            'ten_nguoi_nhan' => 'Khách hàng kiểm thử',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => 'Địa chỉ kiểm thử',
            'tong_tien_hang' => 100000,
            'phi_van_chuyen' => 0,
            'tong_thanh_toan' => 100000,
            'trang_thai' => $status,
            'ngay_giao_thuc_te' => $deliveredAt ?? now()->subHour(),
        ]);
    }
}
