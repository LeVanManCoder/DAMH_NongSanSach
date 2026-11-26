<?php

namespace Tests\Feature;

use App\Jobs\GenerateSubscriptionOrdersJob;
use App\Models\Address;
use App\Models\DeliverySchedule;
use App\Models\Order;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\ShippingService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SubscriptionQueueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        config([
            'shipping.price_per_km' => 5000,
            'shipping.fallback_distance_km' => 5,
            'shipping.origin_address' => null,
            'shipping.origin_latitude' => null,
            'shipping.origin_longitude' => null,
            'shipping.google_maps_api_key' => null,
        ]);
    }

    public function test_due_subscription_schedule_creates_one_child_order_and_is_idempotent(): void
    {
        $customer = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', 'customer'))
            ->firstOrFail();
        $address = Address::query()->create([
            'user_id' => $customer->getKey(),
            'ten_nguoi_nhan' => 'Nguyễn An',
            'so_dien_thoai' => '0901234567',
            'dia_chi' => '12 Đường Xanh, Đà Lạt',
            'la_mac_dinh' => true,
        ]);
        $plan = SubscriptionPlan::query()->where('is_active', true)->firstOrFail();
        $product = Product::query()->where('slug', 'ca-chua-bi-huu-co')->firstOrFail();
        $subscription = Subscription::query()->create([
            'user_id' => $customer->getKey(),
            'plan_id' => $plan->getKey(),
            'address_id' => $address->getKey(),
            'ngay_bat_dau' => today()->subDays(7)->toDateString(),
            'ngay_ket_thuc' => today()->addDays(30)->toDateString(),
            'chu_ky_giao_ngay' => 7,
            'tong_tien' => 90000,
            'trang_thai' => 'dang_hoat_dong',
        ]);
        SubscriptionItem::query()->create([
            'subscription_id' => $subscription->getKey(),
            'product_id' => $product->getKey(),
            'so_luong_moi_lan' => '2.00',
            'don_gia' => $product->gia_ban_co_ban,
        ]);
        $schedule = DeliverySchedule::query()->create([
            'subscription_id' => $subscription->getKey(),
            'ngay_giao' => today()->toDateString(),
            'trang_thai' => 'cho_sinh_don',
        ]);

        Queue::fake();

        $this->artisan('subscriptions:dispatch-due')
            ->expectsOutputToContain('Đã đưa 1 lịch giao')
            ->assertExitCode(0);
        Queue::assertPushed(
            GenerateSubscriptionOrdersJob::class,
            fn (GenerateSubscriptionOrdersJob $job): bool => $job->deliveryScheduleId === $schedule->getKey(),
        );

        $job = new GenerateSubscriptionOrdersJob((int) $schedule->getKey());
        $job->handle(app(ShippingService::class));
        $job->handle(app(ShippingService::class));

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', [
            'subscription_id' => $subscription->getKey(),
            'user_id' => $customer->getKey(),
            'loai_don' => 'dinh_ky',
            'trang_thai' => 'cho_duyet',
            'ten_nguoi_nhan' => 'Nguyễn An',
            'tong_tien_hang' => 90000,
            'phi_van_chuyen' => 25000,
            'tong_thanh_toan' => 115000,
        ]);

        $order = Order::query()->where('subscription_id', $subscription->getKey())->firstOrFail();
        $this->assertSame(today()->toDateString(), $order->ngay_giao_du_kien->toDateString());
        $this->assertDatabaseHas('order_details', [
            'order_id' => $order->getKey(),
            'product_id' => $product->getKey(),
            'so_luong' => '2.00',
            'don_gia' => 45000,
        ]);
        $this->assertDatabaseHas('delivery_schedules', [
            'id' => $schedule->getKey(),
            'order_id' => $order->getKey(),
            'trang_thai' => 'da_sinh_don',
        ]);

        $this->artisan('subscriptions:dispatch-due')
            ->expectsOutputToContain('Đã đưa 0 lịch giao')
            ->assertExitCode(0);
        Queue::assertPushed(GenerateSubscriptionOrdersJob::class, 1);
        $this->assertDatabaseCount('orders', 1);
    }
}
