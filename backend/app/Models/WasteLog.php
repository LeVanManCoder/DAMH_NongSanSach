<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteLog extends Model
{
    protected $table = 'waste_logs';

    public $timestamps = false;

    protected $fillable = [
        'batch_id',
        'farm_staff_id',
        'so_luong',
        'ly_do',
        'thoi_gian',
    ];

    protected function casts(): array
    {
        return [
            'so_luong' => 'decimal:2',
            'thoi_gian' => 'datetime',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function farmStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'farm_staff_id');
    }
}
