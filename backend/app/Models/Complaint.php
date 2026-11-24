<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Complaint extends Model
{
    protected $table = 'complaints';

    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'user_id',
        'ly_do',
        'mo_ta',
        'trang_thai',
        'ly_do_tu_choi',
        'nguoi_xu_ly_id',
        'xu_ly_luc',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'xu_ly_luc' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nguoi_xu_ly_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ComplaintMedia::class);
    }
}
