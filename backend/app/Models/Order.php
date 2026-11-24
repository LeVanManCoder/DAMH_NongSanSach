<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $table = 'orders';

    public const CREATED_AT = 'ngay_tao';

    public const UPDATED_AT = 'ngay_cap_nhat';

    protected $fillable = [
        'ma_don',
        'user_id',
        'subscription_id',
        'loai_don',
        'ten_nguoi_nhan',
        'sdt_nguoi_nhan',
        'dia_chi_giao',
        'khoang_cach_km',
        'la_hoa_toc',
        'tong_tien_hang',
        'phi_van_chuyen',
        'tong_thanh_toan',
        'trang_thai',
        'ngay_giao_du_kien',
        'ngay_giao_thuc_te',
        'nguoi_duyet_id',
        'ngay_duyet',
        'ghi_chu',
    ];

    protected function casts(): array
    {
        return [
            'khoang_cach_km' => 'decimal:2',
            'la_hoa_toc' => 'boolean',
            'tong_tien_hang' => 'decimal:0',
            'phi_van_chuyen' => 'decimal:0',
            'tong_thanh_toan' => 'decimal:0',
            'ngay_giao_du_kien' => 'date',
            'ngay_giao_thuc_te' => 'datetime',
            'ngay_duyet' => 'datetime',
            'ngay_tao' => 'datetime',
            'ngay_cap_nhat' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nguoi_duyet_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(OrderDetail::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function deliverySchedule(): HasOne
    {
        return $this->hasOne(DeliverySchedule::class);
    }

    public function complaint(): HasOne
    {
        return $this->hasOne(Complaint::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
