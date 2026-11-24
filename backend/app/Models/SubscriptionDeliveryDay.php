<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionDeliveryDay extends Model
{
    protected $table = 'subscription_delivery_days';

    public $timestamps = false;

    protected $fillable = [
        'subscription_id',
        'thu_trong_tuan',
    ];

    protected function casts(): array
    {
        return ['thu_trong_tuan' => 'integer'];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
