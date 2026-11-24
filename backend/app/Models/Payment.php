<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $table = 'payments';

    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'subscription_id',
        'phuong_thuc',
        'so_tien',
        'trang_thai',
        'ma_giao_dich',
        'thoi_gian_thanh_toan',
    ];

    protected function casts(): array
    {
        return [
            'so_tien' => 'decimal:0',
            'thoi_gian_thanh_toan' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
