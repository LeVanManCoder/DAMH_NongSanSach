<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'hanh_dong',
        'doi_tuong',
        'doi_tuong_id',
        'du_lieu_cu',
        'du_lieu_moi',
        'dia_chi_ip',
    ];

    protected function casts(): array
    {
        return [
            'du_lieu_cu' => 'array',
            'du_lieu_moi' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
