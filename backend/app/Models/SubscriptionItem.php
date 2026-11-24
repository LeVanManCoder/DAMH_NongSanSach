<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionItem extends Model
{
    protected $table = 'subscription_items';

    public $timestamps = false;

    protected $fillable = [
        'subscription_id',
        'product_id',
        'so_luong_moi_lan',
        'don_gia',
    ];

    protected function casts(): array
    {
        return [
            'so_luong_moi_lan' => 'decimal:2',
            'don_gia' => 'decimal:0',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
