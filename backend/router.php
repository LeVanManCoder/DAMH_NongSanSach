<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api/') || $path === '/api' || str_starts_with($path, '/storage/')) {
    require __DIR__.'/api.php';
    return true;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['message' => 'Không tìm thấy tài nguyên.'], JSON_UNESCAPED_UNICODE);
