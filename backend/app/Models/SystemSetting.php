<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    public $timestamps = false;

    protected $primaryKey = 'khoa';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'khoa',
        'gia_tri',
        'mo_ta',
        'updated_by',
    ];

    protected function casts(): array
    {
        return ['updated_at' => 'datetime'];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
