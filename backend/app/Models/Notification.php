<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notifications';

    public $timestamps = false;

    protected $fillable = [
        'recipient_id',
        'loai',
        'batch_id',
        'noi_dung',
        'so_luong_ton_luc_canh_bao',
        'so_lan_gui',
        'da_doc',
    ];

    protected function casts(): array
    {
        return [
            'so_luong_ton_luc_canh_bao' => 'decimal:2',
            'so_lan_gui' => 'integer',
            'da_doc' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
