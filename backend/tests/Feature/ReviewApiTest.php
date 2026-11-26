<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Product;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
    }

    public function test_customer_can_review_a_product_in_their_delivered_order_once(): void
    {
        $customer = $this->customer();
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $order = $this->orderWithProduct($customer, $product, 'da_giao');

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/products/'.$product->getKey().'/reviews', [
                'order_id' => $order->getKey(),
                'so_sao' => 5,
                'noi_dung' => 'Tươi ngon, giao đúng hẹn.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.so_sao', 5)
            ->assertJsonPath('data.noi_dung', 'Tươi ngon, giao đúng hẹn.')
            ->assertJsonPath('data.user.ho_ten', $customer->ho_ten);

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/products/'.$product->getKey().'/reviews', [
                'order_id' => $order->getKey(),
                'so_sao' => 4,
            ])
            ->assertStatus(409);

        $this->getJson('/api/products/'.$product->getKey().'/reviews')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.average_rating', 5)
            ->assertJsonPath('data.0.noi_dung', 'Tươi ngon, giao đúng hẹn.');
    }

    public function test_review_requires_a_delivered_order_owned_by_customer_that_contains_product(): void
    {
        $customer = $this->customer();
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $pendingOrder = $this->orderWithProduct($customer, $product, 'da_thanh_toan');
        $otherProduct = Product::query()->where('slug', 'ca-chua-bi-huu-co')->firstOrFail();
        $deliveredOrder = $this->orderWithProduct($customer, $otherProduct, 'da_giao');

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/products/'.$product->getKey().'/reviews', [
                'order_id' => $pendingOrder->getKey(),
                'so_sao' => 4,
            ])
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['order_id']]);

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/products/'.$product->getKey().'/reviews', [
                'order_id' => $deliveredOrder->getKey(),
                'so_sao' => 4,
            ])
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['order_id']]);
    }

    public function test_review_rating_must_be_between_one_and_five(): void
    {
        $customer = $this->customer();
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $order = $this->orderWithProduct($customer, $product, 'da_giao');

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/products/'.$product->getKey().'/reviews', [
                'order_id' => $order->getKey(),
                'so_sao' => 6,
            ])
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['so_sao']]);
    }

    private function customer(): User
    {
        return User::query()->create([
            'ho_ten' => 'Khách đánh giá',
            'email' => Str::uuid().'@example.test',
            'password' => 'Password@123',
        ]);
    }

    private function tokenFor(User $user): string
    {
        return app(JwtTokenService::class)->issue($user);
    }

    private function orderWithProduct(User $customer, Product $product, string $status): Order
    {
        $order = Order::query()->create([
            'ma_don' => Str::upper(Str::random(20)),
            'user_id' => $customer->getKey(),
            'loai_don' => 'le',
            'ten_nguoi_nhan' => 'Khách đánh giá',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => 'Địa chỉ kiểm thử',
            'tong_tien_hang' => 45000,
            'phi_van_chuyen' => 0,
            'tong_thanh_toan' => 45000,
            'trang_thai' => $status,
            'ngay_giao_thuc_te' => $status === 'da_giao' ? now()->subHour() : null,
        ]);
        OrderDetail::query()->create([
            'order_id' => $order->getKey(),
            'product_id' => $product->getKey(),
            'so_luong' => 1,
            'don_gia' => $product->gia_ban_co_ban,
        ]);

        return $order;
    }
}
