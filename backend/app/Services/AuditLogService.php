<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    /**
     * @param  array<string, mixed>|null  $oldData
     * @param  array<string, mixed>|null  $newData
     */
    public function record(
        User|int|null $actor,
        string $action,
        string $table,
        ?int $recordId,
        ?array $oldData,
        ?array $newData,
        ?string $ipAddress,
    ): AuditLog {
        return AuditLog::query()->create([
            'user_id' => $actor instanceof User ? $actor->getKey() : $actor,
            'hanh_dong' => $action,
            'doi_tuong' => $table,
            'doi_tuong_id' => $recordId,
            'du_lieu_cu' => $oldData,
            'du_lieu_moi' => $newData,
            'dia_chi_ip' => $ipAddress,
        ]);
    }
}
