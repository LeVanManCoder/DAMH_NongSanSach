<?php

declare(strict_types=1);

function readPhpBackendEnv(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }
        $values[$key] = $value;
    }

    return $values;
}

$phpBackendEnvPath = getenv('PHP_BACKEND_ENV_PATH') ?: __DIR__.'/.env';
$phpBackendEnv = readPhpBackendEnv($phpBackendEnvPath);
$phpBackendValue = static function (string $key, ?string $default = null) use ($phpBackendEnv): ?string {
    $value = getenv($key);
    if ($value !== false) {
        return $value;
    }

    return $phpBackendEnv[$key] ?? $default;
};

$storageRoot = $phpBackendValue('STORAGE_ROOT', '');
if ($storageRoot !== '' && !preg_match('/^(?:[A-Za-z]:[\\\\\/]|\/)/', $storageRoot)) {
    $storageRoot = dirname($phpBackendEnvPath).DIRECTORY_SEPARATOR.$storageRoot;
}

$phpBackendConfig = [
    'app_env' => $phpBackendValue('APP_ENV', 'production'),
    'frontend_origin' => $phpBackendValue('FRONTEND_ORIGIN', 'http://127.0.0.1:5174'),
    'database' => [
        'host' => $phpBackendValue('DB_HOST', '127.0.0.1'),
        'port' => (int) $phpBackendValue('DB_PORT', '3306'),
        'name' => $phpBackendValue('DB_DATABASE', 'nongsan_sach'),
        'username' => $phpBackendValue('DB_USERNAME', 'root'),
        'password' => $phpBackendValue('DB_PASSWORD', ''),
    ],
    'token_ttl' => max(60, (int) $phpBackendValue('TOKEN_TTL', '3600')),
    'shipping' => [
        'price_per_km' => max(0, (int) $phpBackendValue('SHIPPING_PRICE_PER_KM', '5000')),
        'fallback_distance_km' => max(0, (float) $phpBackendValue('SHIPPING_FALLBACK_DISTANCE_KM', '5')),
        'origin_latitude' => $phpBackendValue('SHIPPING_ORIGIN_LATITUDE'),
        'origin_longitude' => $phpBackendValue('SHIPPING_ORIGIN_LONGITUDE'),
    ],
    'vietqr' => [
        'bank_id' => $phpBackendValue('VIETQR_BANK_ID'),
        'account_no' => $phpBackendValue('VIETQR_ACCOUNT_NO'),
        'account_name' => $phpBackendValue('VIETQR_ACCOUNT_NAME'),
        'template' => $phpBackendValue('VIETQR_TEMPLATE', 'compact2'),
    ],
    'vnpay' => [
        'tmn_code' => $phpBackendValue('VNPAY_TMN_CODE'),
        'hash_secret' => $phpBackendValue('VNPAY_HASH_SECRET'),
        'url' => $phpBackendValue('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
        'return_url' => $phpBackendValue('VNPAY_RETURN_URL', 'http://127.0.0.1:5174/'),
    ],
    'storage_root' => $storageRoot,
];

date_default_timezone_set('Asia/Ho_Chi_Minh');

return $phpBackendConfig;
