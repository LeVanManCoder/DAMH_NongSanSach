<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    protected $table = 'batches';

    protected $fillable = [
        'ma_lo',
        'product_id',
        'season_id',
        'ngay_thu_hoach',
        'ngay_het_han',
        'so_luong_nhap',
        'so_luong_ton',
        'so_luong_hao_hut',
        'qr_code',
        'trang_thai',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'ngay_thu_hoach' => 'date',
            'ngay_het_han' => 'date',
            'so_luong_nhap' => 'decimal:2',
            'so_luong_ton' => 'decimal:2',
            'so_luong_hao_hut' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function farmingLogs(): HasMany
    {
        return $this->hasMany(FarmingLog::class);
    }

    public function wasteLogs(): HasMany
    {
        return $this->hasMany(WasteLog::class);
    }

    public function orderDetails(): HasMany
    {
        return $this->hasMany(OrderDetail::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
