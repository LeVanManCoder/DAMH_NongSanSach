<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintMedia extends Model
{
    protected $table = 'complaint_media';

    public $timestamps = false;

    protected $fillable = [
        'complaint_id',
        'media_url',
        'loai',
        'mime_type',
        'kich_thuoc_byte',
    ];

    protected function casts(): array
    {
        return [
            'kich_thuoc_byte' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }
}
