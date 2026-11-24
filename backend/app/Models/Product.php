<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $table = 'products';

    protected $fillable = [
        'category_id',
        'ten_san_pham',
        'slug',
        'mo_ta',
        'hinh_anh_dai_dien',
        'gia_ban_co_ban',
        'don_vi_tinh',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'gia_ban_co_ban' => 'decimal:0',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function cartUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'cart_items')
            ->withPivot(['id', 'so_luong'])
            ->withTimestamps();
    }

    public function subscriptionItems(): HasMany
    {
        return $this->hasMany(SubscriptionItem::class);
    }

    public function subscriptions(): BelongsToMany
    {
        return $this->belongsToMany(Subscription::class, 'subscription_items')
            ->withPivot(['id', 'so_luong_moi_lan', 'don_gia']);
    }

    public function orderDetails(): HasMany
    {
        return $this->hasMany(OrderDetail::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
