<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Product;
use App\Models\Role;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AddressSubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_customer_can_create_update_delete_addresses_and_transfer_default(): void
    {
        $customer = $this->customer();
        $token = $this->tokenFor($customer);

        $firstId = $this->withToken($token)->postJson('/api/addresses', [
            'ten_nguoi_nhan' => 'Nguyễn An',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => '12 Đường Xanh, Đà Lạt',
            'vi_do' => 11.94,
            'kinh_do' => 108.45,
        ])->assertCreated()
            ->assertJsonPath('data.la_mac_dinh', true)
            ->assertJsonPath('data.vi_do', '11.9400000')
            ->json('data.id');

        $secondId = $this->withToken($token)->postJson('/api/addresses', [
            'ten_nguoi_nhan' => 'Nguyễn An',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => '45 Đường Nông Trại, Đà Lạt',
            'la_mac_dinh' => true,
        ])->assertCreated()
            ->assertJsonPath('data.la_mac_dinh', true)
            ->json('data.id');

        $this->assertDatabaseHas('addresses', ['id' => $firstId, 'la_mac_dinh' => 0]);

        $this->withToken($token)->putJson('/api/addresses/'.$firstId, [
            'ten_nguoi_nhan' => 'Trần An',
            'so_dien_thoai' => '0912345678',
            'dia_chi' => 'Địa chỉ đã cập nhật',
            'vi_do' => null,
            'kinh_do' => null,
        ])->assertOk()
            ->assertJsonPath('data.ten_nguoi_nhan', 'Trần An')
            ->assertJsonPath('data.la_mac_dinh', false);

        $this->withToken($token)
            ->patchJson('/api/addresses/'.$firstId.'/default')
            ->assertOk()
            ->assertJsonPath('data.la_mac_dinh', true);
        $this->assertDatabaseHas('addresses', ['id' => $secondId, 'la_mac_dinh' => 0]);

        $this->withToken($token)->deleteJson('/api/addresses/'.$firstId)->assertNoContent();
        $this->assertDatabaseHas('addresses', ['id' => $secondId, 'la_mac_dinh' => 1]);
        $this->withToken($token)
            ->getJson('/api/addresses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $secondId);
    }

    public function test_customer_cannot_view_or_change_another_customers_address(): void
    {
        $owner = $this->customer();
        $otherCustomer = $this->customer();
        $address = Address::query()->create([
            'user_id' => $owner->getKey(),
            'ten_nguoi_nhan' => 'Chủ địa chỉ',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => 'Địa chỉ riêng',
            'la_mac_dinh' => true,
        ]);
        $token = $this->tokenFor($otherCustomer);

        $this->withToken($token)->putJson('/api/addresses/'.$address->getKey(), [
            'ten_nguoi_nhan' => 'Thay đổi',
            'so_dien_thoai' => '0912345678',
            'dia_chi' => 'Không được phép',
        ])->assertNotFound();

        $this->withToken($token)
            ->patchJson('/api/addresses/'.$address->getKey().'/default')
            ->assertNotFound();
        $this->withToken($token)
            ->deleteJson('/api/addresses/'.$address->getKey())
            ->assertNotFound();

        $this->assertDatabaseHas('addresses', [
            'id' => $address->getKey(),
            'dia_chi' => 'Địa chỉ riêng',
            'la_mac_dinh' => 1,
        ]);
    }

    public function test_customer_can_register_subscription_with_products_and_pause_resume_or_cancel_it(): void
    {
        $customer = $this->customer();
        $address = Address::query()->create([
            'user_id' => $customer->getKey(),
            'ten_nguoi_nhan' => 'Khách gói định kỳ',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => '12 Đường Xanh, Đà Lạt',
            'la_mac_dinh' => true,
        ]);
        $plan = SubscriptionPlan::query()->where('is_active', true)->firstOrFail();
        $product = Product::query()->where('slug', 'ca-chua-bi-huu-co')->firstOrFail();
        $token = $this->tokenFor($customer);

        $subscriptionId = $this->withToken($token)->postJson('/api/subscriptions', [
            'plan_id' => $plan->getKey(),
            'address_id' => $address->getKey(),
            'ngay_bat_dau' => now()->addDays(2)->toDateString(),
            'chu_ky_giao_ngay' => 14,
            'thu_trong_tuan' => [3],
            'items' => [
                ['product_id' => $product->getKey(), 'so_luong_moi_lan' => '2.00'],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.chu_ky_giao_ngay', 14)
            ->assertJsonPath('data.trang_thai', 'dang_hoat_dong')
            ->assertJsonPath('data.items.0.product_id', $product->getKey())
            ->assertJsonPath('data.delivery_days.0.thu_trong_tuan', 3)
            ->json('data.id');

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscriptionId,
            'user_id' => $customer->getKey(),
            'address_id' => $address->getKey(),
            'chu_ky_giao_ngay' => 14,
            'tong_tien' => 90000,
        ]);
        $this->withToken($token)
            ->getJson('/api/subscriptions')
            ->assertOk()
            ->assertJsonPath('data.0.id', $subscriptionId)
            ->assertJsonPath('data.0.items.0.product.ten_san_pham', $product->ten_san_pham);

        $this->withToken($token)
            ->patchJson('/api/subscriptions/'.$subscriptionId.'/status', ['trang_thai' => 'tam_dung'])
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'tam_dung');
        $this->withToken($token)
            ->patchJson('/api/subscriptions/'.$subscriptionId.'/status', ['trang_thai' => 'dang_hoat_dong'])
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'dang_hoat_dong');
        $this->withToken($token)
            ->patchJson('/api/subscriptions/'.$subscriptionId.'/status', ['trang_thai' => 'da_huy'])
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'da_huy');
        $this->withToken($token)
            ->patchJson('/api/subscriptions/'.$subscriptionId.'/status', ['trang_thai' => 'dang_hoat_dong'])
            ->assertUnprocessable();
    }

    public function test_subscription_requires_a_customer_owned_address_and_valid_cycle_and_items(): void
    {
        $customer = $this->customer();
        $otherCustomer = $this->customer();
        $otherAddress = Address::query()->create([
            'user_id' => $otherCustomer->getKey(),
            'ten_nguoi_nhan' => 'Người khác',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => 'Địa chỉ người khác',
            'la_mac_dinh' => true,
        ]);
        $plan = SubscriptionPlan::query()->where('is_active', true)->firstOrFail();
        $product = Product::query()->where('slug', 'ca-chua-bi-huu-co')->firstOrFail();

        $this->withToken($this->tokenFor($customer))
            ->postJson('/api/subscriptions', [
                'plan_id' => $plan->getKey(),
                'address_id' => $otherAddress->getKey(),
                'ngay_bat_dau' => now()->addDay()->toDateString(),
                'chu_ky_giao_ngay' => 14,
                'items' => [
                    ['product_id' => $product->getKey(), 'so_luong_moi_lan' => 1],
                ],
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('subscriptions', 0);
    }

    private function customer(): User
    {
        $customerRole = Role::query()->where('ten_vai_tro', 'customer')->firstOrFail();

        return User::query()->create([
            'ho_ten' => 'Khách kiểm thử địa chỉ và gói',
            'email' => Str::uuid().'@example.test',
            'password' => 'Password@123',
            'role_id' => $customerRole->getKey(),
        ]);
    }

    private function tokenFor(User $customer): string
    {
        return app(JwtTokenService::class)->issue($customer);
    }
}
