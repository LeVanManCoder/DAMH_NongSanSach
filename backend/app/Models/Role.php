<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'roles';

    public $timestamps = false;

    protected $fillable = [
        'ten_vai_tro',
        'mo_ta',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
