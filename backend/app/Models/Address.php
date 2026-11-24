<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Address extends Model
{
    protected $table = 'addresses';

    protected $fillable = [
        'user_id',
        'ten_nguoi_nhan',
        'so_dien_thoai',
        'dia_chi',
        'vi_do',
        'kinh_do',
        'la_mac_dinh',
    ];

    protected function casts(): array
    {
        return [
            'vi_do' => 'decimal:7',
            'kinh_do' => 'decimal:7',
            'la_mac_dinh' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
