<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliverySchedule extends Model
{
    protected $table = 'delivery_schedules';

    protected $fillable = [
        'subscription_id',
        'ngay_giao',
        'order_id',
        'trang_thai',
        'ghi_chu',
    ];

    protected function casts(): array
    {
        return ['ngay_giao' => 'date'];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
