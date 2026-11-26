<?php

namespace App\Jobs;

use App\Models\Address;
use App\Models\DeliverySchedule;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Services\ShippingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class GenerateSubscriptionOrdersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $deliveryScheduleId) {}

    public function handle(ShippingService $shipping): void
    {
        $candidate = DeliverySchedule::query()
            ->with('subscription.address')
            ->find($this->deliveryScheduleId);

        if (! $this->isEligible($candidate)) {
            return;
        }

        $candidateAddress = $candidate->subscription->address;
        if ($candidateAddress === null) {
            throw new RuntimeException('Gói định kỳ không còn địa chỉ giao hàng.');
        }

        $addressSnapshot = [
            'id' => (int) $candidateAddress->getKey(),
            'ten_nguoi_nhan' => $candidateAddress->ten_nguoi_nhan,
            'so_dien_thoai' => $candidateAddress->so_dien_thoai,
            'dia_chi' => $candidateAddress->dia_chi,
            'vi_do' => $candidateAddress->vi_do,
            'kinh_do' => $candidateAddress->kinh_do,
        ];
        $shippingQuote = $shipping->calculate(
            $addressSnapshot['dia_chi'],
            null,
            is_numeric($addressSnapshot['vi_do']) ? (float) $addressSnapshot['vi_do'] : null,
            is_numeric($addressSnapshot['kinh_do']) ? (float) $addressSnapshot['kinh_do'] : null,
        );

        DB::transaction(function () use ($addressSnapshot, $shippingQuote): void {
            $schedule = DeliverySchedule::query()
                ->lockForUpdate()
                ->find($this->deliveryScheduleId);

            if ($schedule === null || $schedule->trang_thai !== 'cho_sinh_don') {
                return;
            }

            if ($schedule->order_id !== null) {
                $schedule->trang_thai = 'da_sinh_don';
                $schedule->save();

                return;
            }

            $subscription = Subscription::query()
                ->lockForUpdate()
                ->findOrFail($schedule->subscription_id);

            if (! $this->isSubscriptionEligible($subscription, $schedule)) {
                return;
            }

            $address = Address::query()
                ->lockForUpdate()
                ->findOrFail($subscription->address_id);

            if (
                (int) $address->getKey() !== $addressSnapshot['id']
                || $address->ten_nguoi_nhan !== $addressSnapshot['ten_nguoi_nhan']
                || $address->so_dien_thoai !== $addressSnapshot['so_dien_thoai']
                || $address->dia_chi !== $addressSnapshot['dia_chi']
                || $address->vi_do !== $addressSnapshot['vi_do']
                || $address->kinh_do !== $addressSnapshot['kinh_do']
            ) {
                throw new RuntimeException('Địa chỉ giao hàng thay đổi trong lúc tạo đơn; cần thử lại.');
            }

            $items = SubscriptionItem::query()
                ->where('subscription_id', $subscription->getKey())
                ->lockForUpdate()
                ->get();

            if ($items->isEmpty()) {
                throw new RuntimeException('Gói định kỳ không có sản phẩm để tạo đơn.');
            }

            $orderLines = $items->map(function (SubscriptionItem $item): array {
                return [
                    'product_id' => (int) $item->product_id,
                    'so_luong' => $item->so_luong_moi_lan,
                    'don_gia' => $item->don_gia,
                    'thanh_tien' => (int) round(
                        (float) $item->so_luong_moi_lan * (float) $item->don_gia,
                    ),
                ];
            });
            $subtotal = (int) $orderLines->sum('thanh_tien');
            $order = Order::query()->create([
                'ma_don' => Str::upper(Str::random(20)),
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->getKey(),
                'loai_don' => 'dinh_ky',
                'ten_nguoi_nhan' => $addressSnapshot['ten_nguoi_nhan'],
                'sdt_nguoi_nhan' => $addressSnapshot['so_dien_thoai'],
                'dia_chi_giao' => $addressSnapshot['dia_chi'],
                'khoang_cach_km' => $shippingQuote['khoang_cach_km'],
                'phi_van_chuyen' => $shippingQuote['phi_van_chuyen'],
                'tong_tien_hang' => $subtotal,
                'tong_thanh_toan' => $subtotal + $shippingQuote['phi_van_chuyen'],
                'trang_thai' => 'cho_duyet',
                'ngay_giao_du_kien' => $schedule->ngay_giao->toDateString(),
                'ghi_chu' => 'Đơn hàng được tạo tự động từ gói định kỳ.',
            ]);

            foreach ($orderLines as $line) {
                $order->details()->create([
                    'product_id' => $line['product_id'],
                    'so_luong' => $line['so_luong'],
                    'don_gia' => $line['don_gia'],
                ]);
            }

            $schedule->order_id = $order->getKey();
            $schedule->trang_thai = 'da_sinh_don';
            $schedule->save();
        });
    }

    private function isEligible(?DeliverySchedule $schedule): bool
    {
        if (
            $schedule === null
            || $schedule->trang_thai !== 'cho_sinh_don'
            || $schedule->ngay_giao->isFuture()
        ) {
            return false;
        }

        return $this->isSubscriptionEligible($schedule->subscription, $schedule);
    }

    private function isSubscriptionEligible(Subscription $subscription, DeliverySchedule $schedule): bool
    {
        return $subscription->trang_thai === 'dang_hoat_dong'
            && ! $schedule->ngay_giao->lt($subscription->ngay_bat_dau)
            && ! $schedule->ngay_giao->gt($subscription->ngay_ket_thuc);
    }
}
