<?php

namespace App\Console\Commands;

use App\Jobs\GenerateSubscriptionOrdersJob;
use App\Models\DeliverySchedule;
use Illuminate\Console\Command;

class ProcessSubscriptionSchedules extends Command
{
    protected $signature = 'subscriptions:dispatch-due';

    protected $description = 'Đưa các lịch giao gói định kỳ đến hạn vào hàng đợi.';

    public function handle(): int
    {
        $dispatched = 0;

        DeliverySchedule::query()
            ->where('trang_thai', 'cho_sinh_don')
            ->whereDate('ngay_giao', '<=', today()->toDateString())
            ->whereHas('subscription', function ($query): void {
                $query->where('trang_thai', 'dang_hoat_dong')
                    ->whereColumn('subscriptions.ngay_bat_dau', '<=', 'delivery_schedules.ngay_giao')
                    ->whereColumn('subscriptions.ngay_ket_thuc', '>=', 'delivery_schedules.ngay_giao');
            })
            ->orderBy('id')
            ->chunkById(100, function ($schedules) use (&$dispatched): void {
                foreach ($schedules as $schedule) {
                    GenerateSubscriptionOrdersJob::dispatch((int) $schedule->getKey());
                    $dispatched++;
                }
            });

        $this->info("Đã đưa {$dispatched} lịch giao đến hạn vào hàng đợi.");

        return self::SUCCESS;
    }
}
