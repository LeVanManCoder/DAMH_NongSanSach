<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Season extends Model
{
    protected $table = 'seasons';

    protected $fillable = [
        'ten_mua_vu',
        'khu_vuc_canh_tac',
        'ngay_bat_dau',
        'ngay_ket_thuc_du_kien',
        'trang_thai',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'ngay_bat_dau' => 'date',
            'ngay_ket_thuc_du_kien' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }
}
