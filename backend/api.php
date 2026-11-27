<?php

declare(strict_types=1);

$config = require_once __DIR__.'/config.php';

final class ApiFailure extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly ?array $errors = null,
    ) {
        parent::__construct($message);
    }
}

function respondJson(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function failApi(int $status, string $message, ?array $errors = null): never
{
    throw new ApiFailure($status, $message, $errors);
}

function validationFailure(array $errors): never
{
    failApi(422, 'The given data was invalid.', $errors);
}

function requiredString(array $input, string $field, int $maxLength): string
{
    $value = isset($input[$field]) && is_string($input[$field]) ? trim($input[$field]) : '';
    if ($value === '' || mb_strlen($value) > $maxLength) {
        validationFailure([$field => ["Trường này là bắt buộc và không được vượt quá {$maxLength} ký tự."]]);
    }

    return $value;
}

function positiveInteger(mixed $value, string $field): int
{
    $validated = filter_var($value, FILTER_VALIDATE_INT);
    if ($validated === false || $validated < 1) {
        validationFailure([$field => ['Giá trị phải là số nguyên dương.']]);
    }

    return $validated;
}

function quantityUnits(mixed $value, string $field = 'so_luong'): int
{
    $text = is_scalar($value) ? (string) $value : '';
    if (preg_match('/^\d{1,6}(?:\.\d{1,2})?$/D', $text) !== 1) {
        validationFailure([$field => ['Số lượng phải lớn hơn 0 và tối đa 2 chữ số thập phân.']]);
    }

    [$whole, $fraction] = array_pad(explode('.', $text, 2), 2, '');
    $units = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    if ($units < 1) {
        validationFailure([$field => ['Số lượng phải lớn hơn 0.']]);
    }

    return $units;
}

function unitsDecimal(int $units): string
{
    return sprintf('%d.%02d', intdiv($units, 100), $units % 100);
}

function currentAvailabilitySql(string $alias = 'b'): string
{
    return "{$alias}.trang_thai = 'con_hang' AND {$alias}.so_luong_ton > 0 AND {$alias}.ngay_het_han >= CURDATE()";
}

function placeholders(int $count): string
{
    return implode(',', array_fill(0, $count, '?'));
}

function loadProducts(PDO $pdo, array $productIds): array
{
    $productIds = array_values(array_unique(array_filter(array_map('intval', $productIds), static fn (int $id): bool => $id > 0)));
    if ($productIds === []) {
        return [];
    }

    $marks = placeholders(count($productIds));
    $statement = $pdo->prepare(
        "SELECT p.id, p.category_id, p.ten_san_pham, p.slug, p.mo_ta, p.hinh_anh_dai_dien,
                p.gia_ban_co_ban, p.don_vi_tinh, c.ten_danh_muc, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id IN ({$marks})",
    );
    $statement->execute($productIds);
    $products = [];
    foreach ($statement->fetchAll() as $row) {
        $id = (int) $row['id'];
        $products[$id] = [
            'id' => $id,
            'ten_san_pham' => $row['ten_san_pham'],
            'slug' => $row['slug'],
            'mo_ta' => $row['mo_ta'],
            'hinh_anh_dai_dien' => $row['hinh_anh_dai_dien'],
            'gia_ban_co_ban' => $row['gia_ban_co_ban'],
            'don_vi_tinh' => $row['don_vi_tinh'],
            'category' => $row['category_id'] === null ? null : [
                'id' => (int) $row['category_id'],
                'ten_danh_muc' => $row['ten_danh_muc'],
                'slug' => $row['category_slug'],
            ],
            'batches' => [],
        ];
    }

    $statement = $pdo->prepare(
        "SELECT b.id, b.product_id, b.ma_lo, b.ngay_thu_hoach, b.ngay_het_han,
                b.so_luong_ton AS so_luong_kha_dung, b.qr_code
         FROM batches b
         WHERE b.product_id IN ({$marks}) AND ".currentAvailabilitySql('b').'
         ORDER BY b.ngay_het_han, b.ngay_thu_hoach',
    );
    $statement->execute($productIds);
    $batches = $statement->fetchAll();
    $batchIds = [];
    foreach ($batches as $batch) {
        $batchIds[] = (int) $batch['id'];
        $productId = (int) $batch['product_id'];
        $products[$productId]['batches'][] = [
            'id' => (int) $batch['id'],
            'ma_lo' => $batch['ma_lo'],
            'ngay_thu_hoach' => $batch['ngay_thu_hoach'],
            'ngay_het_han' => $batch['ngay_het_han'],
            'so_luong_kha_dung' => $batch['so_luong_kha_dung'],
            'don_vi_tinh' => $products[$productId]['don_vi_tinh'],
            'qr_code' => $batch['qr_code'],
            'farming_logs' => [],
        ];
    }

    if ($batchIds !== []) {
        $statement = $pdo->prepare(
            'SELECT id, batch_id, hanh_dong, ghi_chu, hinh_anh_minh_chung, thoi_gian
             FROM farming_logs WHERE batch_id IN ('.placeholders(count($batchIds)).') ORDER BY thoi_gian',
        );
        $statement->execute($batchIds);
        $logsByBatch = [];
        foreach ($statement->fetchAll() as $log) {
            $logsByBatch[(int) $log['batch_id']][] = [
                'hanh_dong' => $log['hanh_dong'],
                'ghi_chu' => $log['ghi_chu'],
                'hinh_anh_minh_chung' => $log['hinh_anh_minh_chung'],
                'thoi_gian' => $log['thoi_gian'],
            ];
        }
        foreach ($products as &$product) {
            foreach ($product['batches'] as &$batch) {
                $batch['farming_logs'] = $logsByBatch[$batch['id']] ?? [];
            }
            unset($batch);
        }
        unset($product);
    }

    return $products;
}

function publicUser(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'ho_ten' => $user['ho_ten'],
        'email' => $user['email'],
        'so_dien_thoai' => $user['so_dien_thoai'],
        'diem_tich_luy' => (int) $user['diem_tich_luy'],
        'role' => $user['role'],
    ];
}

function requestBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }

    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains($contentType, 'application/json')) {
        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            failApi(400, 'JSON request không hợp lệ.');
        }
        if (!is_array($data)) {
            failApi(400, 'JSON request phải là một object.');
        }

        return $data;
    }

    if (str_contains($contentType, 'application/x-www-form-urlencoded')) {
        parse_str($raw, $data);
        return is_array($data) ? $data : [];
    }

    return $_POST;
}

function authenticatedUser(PDO $pdo): array
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/^Bearer\s+([A-Za-z0-9._~-]+)$/i', trim((string) $authorization), $matches) !== 1) {
        failApi(401, 'Chưa xác thực hoặc token không hợp lệ.');
    }

    $token = $matches[1];
    if (strlen($token) > 8192) {
        failApi(401, 'Chưa xác thực hoặc token không hợp lệ.');
    }

    $statement = $pdo->prepare(
        "SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, r.ten_vai_tro AS role
         FROM personal_access_tokens pat
         JOIN users u ON u.id = pat.tokenable_id
         JOIN roles r ON r.id = u.role_id
         WHERE pat.token = ? AND pat.tokenable_type = 'App\\\\Models\\\\User'
           AND (pat.expires_at IS NULL OR pat.expires_at > NOW())
           AND u.is_active = 1 AND u.deleted_at IS NULL
         LIMIT 1",
    );
    $statement->execute([hash('sha256', $token)]);
    $user = $statement->fetch();
    if (!$user) {
        failApi(401, 'Chưa xác thực hoặc token không hợp lệ.');
    }

    $pdo->prepare('UPDATE personal_access_tokens SET last_used_at = NOW() WHERE token = ?')
        ->execute([hash('sha256', $token)]);

    return $user;
}

function requireCustomer(array $user): void
{
    if (($user['role'] ?? null) !== 'customer') {
        failApi(403, 'Bạn không có quyền thực hiện thao tác này.');
    }
}

function requireRoles(array $user, array $allowedRoles): void
{
    if (!in_array($user['role'] ?? null, $allowedRoles, true)) {
        failApi(403, 'Bạn không có quyền thực hiện thao tác này.');
    }
}

function issueAccessToken(PDO $pdo, int $userId, int $ttl): string
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTimeImmutable("+{$ttl} seconds"))->format('Y-m-d H:i:s');
    $statement = $pdo->prepare(
        "INSERT INTO personal_access_tokens
            (tokenable_type, tokenable_id, name, token, abilities, expires_at, created_at, updated_at)
         VALUES ('App\\\\Models\\\\User', ?, 'php-access', ?, '[\"*\"]', ?, NOW(), NOW())",
    );
    $statement->execute([$userId, hash('sha256', $token), $expiresAt]);

    return $token;
}

function availableUnits(PDO $pdo, int $productId, bool $lock = false): int
{
    $sql = 'SELECT b.so_luong_ton FROM batches b WHERE b.product_id = ? AND '.currentAvailabilitySql('b').($lock ? ' FOR UPDATE' : '');
    $statement = $pdo->prepare($sql);
    $statement->execute([$productId]);

    return array_sum(array_map(
        static fn (array $row): int => (int) round((float) $row['so_luong_ton'] * 100),
        $statement->fetchAll(),
    ));
}

function shippingQuote(array $input, array $config): array
{
    $distance = null;
    $method = 'uoc_tinh_mac_dinh';
    $note = 'Google Maps chưa được cấu hình; đang dùng khoảng cách ước tính mặc định.';

    if (array_key_exists('khoang_cach_km', $input)) {
        if (!is_numeric($input['khoang_cach_km']) || (float) $input['khoang_cach_km'] < 0 || (float) $input['khoang_cach_km'] > 10000) {
            validationFailure(['khoang_cach_km' => ['Khoảng cách không hợp lệ.']]);
        }
        $distance = (float) $input['khoang_cach_km'];
        $method = 'khoang_cach_cung_cap';
        $note = null;
    } elseif (array_key_exists('vi_do', $input) || array_key_exists('kinh_do', $input)) {
        if (!isset($input['vi_do'], $input['kinh_do']) || !is_numeric($input['vi_do']) || !is_numeric($input['kinh_do'])) {
            validationFailure(['vi_do' => ['Tọa độ giao hàng không hợp lệ.']]);
        }
        $latitude = (float) $input['vi_do'];
        $longitude = (float) $input['kinh_do'];
        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            validationFailure(['vi_do' => ['Tọa độ giao hàng không hợp lệ.']]);
        }

        if (is_numeric($config['shipping']['origin_latitude']) && is_numeric($config['shipping']['origin_longitude'])) {
            $radians = static fn (float $degrees): float => $degrees * M_PI / 180;
            $latDelta = $radians($latitude - (float) $config['shipping']['origin_latitude']);
            $lonDelta = $radians($longitude - (float) $config['shipping']['origin_longitude']);
            $a = sin($latDelta / 2) ** 2
                + cos($radians((float) $config['shipping']['origin_latitude']))
                * cos($radians($latitude))
                * sin($lonDelta / 2) ** 2;
            $distance = 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
            $method = 'haversine';
            $note = null;
        } else {
            $distance = $config['shipping']['fallback_distance_km'];
            $note = 'Chưa cấu hình tọa độ nông trại; đang dùng khoảng cách ước tính mặc định.';
        }
    } else {
        $distance = $config['shipping']['fallback_distance_km'];
    }

    $distance = round(max(0, (float) $distance), 2);

    return [
        'khoang_cach_km' => number_format($distance, 2, '.', ''),
        'phi_van_chuyen' => (int) ceil($distance * $config['shipping']['price_per_km']),
        'phuong_thuc_tinh' => $method,
        'ghi_chu' => $note,
    ];
}

function paymentOrderData(PDO $pdo, int $paymentId, int $userId): array
{
    $statement = $pdo->prepare(
        'SELECT p.id AS payment_id, p.order_id, p.phuong_thuc, p.so_tien, p.trang_thai AS payment_status,
                p.ma_giao_dich, p.thoi_gian_thanh_toan, o.user_id, o.ma_don, o.ten_nguoi_nhan,
                o.sdt_nguoi_nhan, o.dia_chi_giao, o.khoang_cach_km, o.phi_van_chuyen,
                o.tong_tien_hang, o.tong_thanh_toan, o.trang_thai AS order_status, o.ngay_tao
         FROM payments p JOIN orders o ON o.id = p.order_id
         WHERE p.id = ? AND o.user_id = ? LIMIT 1',
    );
    $statement->execute([$paymentId, $userId]);
    $row = $statement->fetch();
    if (!$row) {
        failApi(404, 'Không tìm thấy giao dịch.');
    }

    $statement = $pdo->prepare(
        'SELECT id, product_id, so_luong, don_gia, thanh_tien
         FROM order_details WHERE order_id = ? ORDER BY id',
    );
    $statement->execute([(int) $row['order_id']]);
    $details = $statement->fetchAll();
    $products = loadProducts($pdo, array_column($details, 'product_id'));

    return [
        'payment' => [
            'id' => (int) $row['payment_id'],
            'order_id' => (int) $row['order_id'],
            'phuong_thuc' => $row['phuong_thuc'],
            'so_tien' => $row['so_tien'],
            'trang_thai' => $row['payment_status'],
            'ma_giao_dich' => $row['ma_giao_dich'],
            'thoi_gian_thanh_toan' => $row['thoi_gian_thanh_toan'],
        ],
        'order' => [
            'id' => (int) $row['order_id'],
            'ma_don' => $row['ma_don'],
            'ten_nguoi_nhan' => $row['ten_nguoi_nhan'],
            'sdt_nguoi_nhan' => $row['sdt_nguoi_nhan'],
            'dia_chi_giao' => $row['dia_chi_giao'],
            'khoang_cach_km' => $row['khoang_cach_km'],
            'phi_van_chuyen' => $row['phi_van_chuyen'],
            'tong_tien_hang' => $row['tong_tien_hang'],
            'tong_thanh_toan' => $row['tong_thanh_toan'],
            'trang_thai' => $row['order_status'],
            'ngay_tao' => $row['ngay_tao'],
            'details' => array_map(static function (array $detail) use ($products): array {
                $product = $products[(int) $detail['product_id']] ?? null;

                return [
                    'id' => (int) $detail['id'],
                    'product_id' => (int) $detail['product_id'],
                    'so_luong' => $detail['so_luong'],
                    'don_gia' => $detail['don_gia'],
                    'thanh_tien' => $detail['thanh_tien'],
                    'product' => $product,
                ];
            }, $details),
        ],
    ];
}

function encodeRfc3986Query(array $params): string
{
    ksort($params, SORT_STRING);
    return http_build_query($params, '', '&', PHP_QUERY_RFC3986);
}

function vnpayPaymentUrl(array $payment, array $config, string $ipAddress): string
{
    $vnpay = $config['vnpay'];
    if (!$vnpay['tmn_code'] || !$vnpay['hash_secret']) {
        failApi(503, 'Chưa cấu hình VNPAY sandbox (VNPAY_TMN_CODE, VNPAY_HASH_SECRET).');
    }

    $params = [
        'vnp_Version' => '2.1.0',
        'vnp_Command' => 'pay',
        'vnp_TmnCode' => $vnpay['tmn_code'],
        'vnp_Amount' => (int) $payment['so_tien'] * 100,
        'vnp_CreateDate' => (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('YmdHis'),
        'vnp_CurrCode' => 'VND',
        'vnp_IpAddr' => filter_var($ipAddress, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ? $ipAddress : '127.0.0.1',
        'vnp_Locale' => 'vn',
        'vnp_OrderInfo' => 'Thanh toan don hang '.$payment['ma_giao_dich'],
        'vnp_OrderType' => 'other',
        'vnp_ReturnUrl' => $vnpay['return_url'],
        'vnp_TxnRef' => (string) $payment['id'],
    ];
    $query = encodeRfc3986Query($params);
    $signature = hash_hmac('sha512', $query, $vnpay['hash_secret']);

    return rtrim($vnpay['url'], '?').'?' . $query . '&vnp_SecureHash='.$signature;
}

function allocateOrder(PDO $pdo, int $orderId): void
{
    $statement = $pdo->prepare('SELECT id, product_id, so_luong, don_gia, batch_id FROM order_details WHERE order_id = ? ORDER BY id FOR UPDATE');
    $statement->execute([$orderId]);
    $details = $statement->fetchAll();
    if ($details === []) {
        throw new RuntimeException('Đơn hàng chưa có sản phẩm.');
    }

    foreach ($details as $detail) {
        if ($detail['batch_id'] !== null) {
            throw new RuntimeException('Đơn hàng đã được phân bổ lô hàng.');
        }

        $requestedUnits = quantityUnits($detail['so_luong'], 'so_luong');
        $statement = $pdo->prepare(
            'SELECT id, so_luong_ton FROM batches
             WHERE product_id = ? AND trang_thai = \'con_hang\' AND so_luong_ton > 0 AND ngay_het_han >= CURDATE()
             ORDER BY ngay_het_han, ngay_thu_hoach, id FOR UPDATE',
        );
        $statement->execute([(int) $detail['product_id']]);
        $batches = $statement->fetchAll();
        $available = array_sum(array_map(
            static fn (array $batch): int => (int) round((float) $batch['so_luong_ton'] * 100),
            $batches,
        ));
        if ($available < $requestedUnits) {
            throw new RuntimeException('Tồn kho không đủ để xác nhận thanh toán.');
        }

        $remaining = $requestedUnits;
        foreach ($batches as $index => $batch) {
            if ($remaining === 0) {
                break;
            }
            $batchUnits = (int) round((float) $batch['so_luong_ton'] * 100);
            $allocated = min($batchUnits, $remaining);
            $remaining -= $allocated;

            $update = $pdo->prepare(
                'UPDATE batches SET so_luong_ton = ?, trang_thai = ?, updated_at = NOW() WHERE id = ?',
            );
            $update->execute([
                unitsDecimal($batchUnits - $allocated),
                $batchUnits === $allocated ? 'het_hang' : 'con_hang',
                (int) $batch['id'],
            ]);

            if ($index === 0) {
                $updateDetail = $pdo->prepare('UPDATE order_details SET batch_id = ?, so_luong = ? WHERE id = ?');
                $updateDetail->execute([(int) $batch['id'], unitsDecimal($allocated), (int) $detail['id']]);
            } else {
                $insertDetail = $pdo->prepare(
                    'INSERT INTO order_details (order_id, product_id, batch_id, so_luong, don_gia)
                     VALUES (?, ?, ?, ?, ?)',
                );
                $insertDetail->execute([
                    $orderId,
                    (int) $detail['product_id'],
                    (int) $batch['id'],
                    unitsDecimal($allocated),
                    $detail['don_gia'],
                ]);
            }
        }
    }

    $pdo->prepare("UPDATE orders SET trang_thai = 'da_thanh_toan', ngay_duyet = NOW(), ngay_cap_nhat = NOW() WHERE id = ?")
        ->execute([$orderId]);
}

function serveStorage(string $path, array $config): never
{
    $root = $config['storage_root'] !== '' ? realpath($config['storage_root']) : false;
    $relative = rawurldecode(substr($path, strlen('/storage/')));
    $candidate = $root === false ? false : realpath($root.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative));
    $prefix = $root === false ? '' : rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;

    if ($candidate === false || !is_file($candidate) || strncasecmp($candidate, $prefix, strlen($prefix)) !== 0) {
        respondJson(['message' => 'Không tìm thấy tệp.'], 404);
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    header('Content-Type: '.$fileInfo->file($candidate));
    header('Content-Length: '.(string) filesize($candidate));
    header('Cache-Control: public, max-age=3600');
    readfile($candidate);
    exit;
}

function localPasswordRecoveryAllowed(array $config): bool
{
    $remoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';

    return ($config['app_env'] ?? 'production') === 'local'
        && in_array($remoteAddress, ['127.0.0.1', '::1'], true);
}

function handleRequest(PDO $pdo, array $config): never
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== $config['frontend_origin']) {
        failApi(403, 'Origin không được phép truy cập API.');
    }

    header('Access-Control-Allow-Origin: '.$config['frontend_origin']);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Vary: Origin');
    header('X-Content-Type-Options: nosniff');
    header_remove('X-Powered-By');

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if (str_starts_with($path, '/storage/')) {
        serveStorage($path, $config);
    }
    if ($path === '/api/health' || $path === '/api/ping') {
        respondJson(['status' => 'ok', 'service' => 'webbannongsan-php']);
    }

    $body = requestBody();
    $query = $_GET;

    if ($method === 'GET' && $path === '/api/categories') {
        $statement = $pdo->query(
            'SELECT id, parent_id, ten_danh_muc, slug, mo_ta
             FROM categories WHERE is_active = 1 ORDER BY ten_danh_muc',
        );
        respondJson(['data' => $statement->fetchAll()]);
    }

    if ($method === 'GET' && $path === '/api/products') {
        $perPage = isset($query['per_page']) ? filter_var($query['per_page'], FILTER_VALIDATE_INT) : 20;
        $page = isset($query['page']) ? filter_var($query['page'], FILTER_VALIDATE_INT) : 1;
        if ($perPage === false || $perPage < 1 || $perPage > 100) {
            validationFailure(['per_page' => ['Số sản phẩm mỗi trang phải từ 1 đến 100.']]);
        }
        if ($page === false || $page < 1) {
            validationFailure(['page' => ['Trang phải là số nguyên dương.']]);
        }

        $search = (string) ($query['search'] ?? '');
        $legacyQuery = (string) ($query['q'] ?? '');
        if (mb_strlen($search) > 120 || mb_strlen($legacyQuery) > 120) {
            validationFailure(['search' => ['Từ khóa không được vượt quá 120 ký tự.']]);
        }

        $conditions = [
            'p.is_active = 1',
            'p.deleted_at IS NULL',
            'EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND '.currentAvailabilitySql('b').')',
        ];
        $params = [];
        if (isset($query['category_id'])) {
            $conditions[] = 'p.category_id = ?';
            $params[] = positiveInteger($query['category_id'], 'category_id');
        }
        if ($search !== '') {
            $conditions[] = 'p.ten_san_pham LIKE ?';
            $params[] = '%'.$search.'%';
        } elseif ($legacyQuery !== '') {
            $conditions[] = '(p.ten_san_pham LIKE ? OR p.mo_ta LIKE ?)';
            $params[] = '%'.$legacyQuery.'%';
            $params[] = '%'.$legacyQuery.'%';
        }

        $sort = (string) ($query['sort'] ?? 'name');
        if (!in_array($sort, ['name', 'newest'], true)) {
            validationFailure(['sort' => ['Thứ tự sắp xếp không hợp lệ.']]);
        }
        $where = implode(' AND ', $conditions);
        $statement = $pdo->prepare("SELECT COUNT(*) FROM products p WHERE {$where}");
        $statement->execute($params);
        $total = (int) $statement->fetchColumn();
        $orderBy = $sort === 'newest' ? 'p.created_at DESC' : 'p.ten_san_pham';
        $statement = $pdo->prepare(
            "SELECT p.id FROM products p WHERE {$where} ORDER BY {$orderBy} LIMIT ? OFFSET ?",
        );
        $statement->execute([...$params, $perPage, ($page - 1) * $perPage]);
        $ids = array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
        $productMap = loadProducts($pdo, $ids);
        $products = array_values(array_filter(array_map(
            static fn (int $id): ?array => $productMap[$id] ?? null,
            $ids,
        )));
        $count = count($products);
        $lastPage = max(1, (int) ceil($total / $perPage));

        respondJson([
            'current_page' => $page,
            'data' => $products,
            'from' => $count > 0 ? (($page - 1) * $perPage) + 1 : null,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'to' => $count > 0 ? (($page - 1) * $perPage) + $count : null,
            'total' => $total,
        ]);
    }

    if ($method === 'GET' && preg_match('~^/api/products/([^/]+)$~', $path, $matches) === 1) {
        $statement = $pdo->prepare(
            'SELECT id FROM products
             WHERE slug = ? AND is_active = 1 AND deleted_at IS NULL
               AND EXISTS (SELECT 1 FROM batches b WHERE b.product_id = products.id AND '.currentAvailabilitySql('b').')
             LIMIT 1',
        );
        $statement->execute([rawurldecode($matches[1])]);
        $productId = $statement->fetchColumn();
        if ($productId === false) {
            failApi(404, 'Không tìm thấy sản phẩm đang mở bán.');
        }
        $product = loadProducts($pdo, [(int) $productId])[(int) $productId];
        respondJson(['data' => $product]);
    }

    if ($method === 'GET' && $path === '/api/staff/dashboard') {
        $user = authenticatedUser($pdo);
        requireRoles($user, ['admin', 'sales', 'farm_staff']);
        header('Cache-Control: no-store');

        $role = $user['role'];
        $data = ['role' => $role];

        if (in_array($role, ['admin', 'farm_staff'], true)) {
            $data['inventory'] = $pdo->query(
                'SELECT b.id, b.ma_lo AS lot, p.ten_san_pham AS product_name, p.don_vi_tinh AS unit,
                        COALESCE(s.khu_vuc_canh_tac, \'Chưa phân công\') AS farm,
                        b.so_luong_ton AS quantity, b.ngay_thu_hoach AS harvested_at,
                        b.ngay_het_han AS expires_at, b.trang_thai AS batch_status,
                        DATEDIFF(b.ngay_het_han, CURDATE()) AS days_to_expiry
                 FROM batches b
                 JOIN products p ON p.id = b.product_id
                 LEFT JOIN seasons s ON s.id = b.season_id
                 WHERE p.deleted_at IS NULL
                 ORDER BY b.ngay_het_han IS NULL, b.ngay_het_han, b.id',
            )->fetchAll();

            $data['seasons'] = $pdo->query(
                'SELECT id, ten_mua_vu AS name, khu_vuc_canh_tac AS location,
                        ngay_bat_dau AS starts_at, ngay_ket_thuc_du_kien AS expected_end,
                        trang_thai AS status
                 FROM seasons ORDER BY ngay_bat_dau DESC, id DESC',
            )->fetchAll();

            $data['farming_logs'] = $pdo->query(
                'SELECT fl.id, fl.hanh_dong AS activity, fl.ghi_chu AS note,
                        fl.thoi_gian AS occurred_at, b.ma_lo AS lot,
                        p.ten_san_pham AS product_name, u.ho_ten AS staff_name
                 FROM farming_logs fl
                 JOIN batches b ON b.id = fl.batch_id
                 JOIN products p ON p.id = b.product_id
                 JOIN users u ON u.id = fl.farm_staff_id
                 ORDER BY fl.thoi_gian DESC, fl.id DESC LIMIT 100',
            )->fetchAll();

            $data['waste_logs'] = $pdo->query(
                'SELECT wl.id, wl.so_luong AS quantity, wl.ly_do AS reason,
                        wl.thoi_gian AS occurred_at, b.ma_lo AS lot,
                        p.ten_san_pham AS product_name, p.don_vi_tinh AS unit
                 FROM waste_logs wl
                 JOIN batches b ON b.id = wl.batch_id
                 JOIN products p ON p.id = b.product_id
                 ORDER BY wl.thoi_gian DESC, wl.id DESC LIMIT 100',
            )->fetchAll();
        }

        if (in_array($role, ['admin', 'sales'], true)) {
            $data['orders'] = $pdo->query(
                'SELECT o.id, o.ma_don AS code, o.ten_nguoi_nhan AS customer,
                        o.sdt_nguoi_nhan AS phone, o.dia_chi_giao AS address,
                        o.tong_thanh_toan AS total, o.trang_thai AS status,
                        o.ngay_tao AS created_at, COALESCE(items.item_summary, \'\') AS items
                 FROM orders o
                 LEFT JOIN (
                     SELECT od.order_id,
                            GROUP_CONCAT(CONCAT(p.ten_san_pham, \' · \', od.so_luong, \' \', p.don_vi_tinh)
                                         ORDER BY p.ten_san_pham SEPARATOR \', \') AS item_summary
                     FROM order_details od
                     JOIN products p ON p.id = od.product_id
                     GROUP BY od.order_id
                 ) items ON items.order_id = o.id
                 ORDER BY o.ngay_tao DESC, o.id DESC LIMIT 100',
            )->fetchAll();

            $data['complaints'] = $pdo->query(
                'SELECT c.id, o.ma_don AS order_code, o.ten_nguoi_nhan AS customer,
                        c.ly_do AS reason, c.mo_ta AS details, c.trang_thai AS status,
                        c.created_at
                 FROM complaints c
                 JOIN orders o ON o.id = c.order_id
                 ORDER BY c.created_at DESC, c.id DESC LIMIT 100',
            )->fetchAll();
        }

        if ($role === 'admin') {
            $data['staff'] = $pdo->query(
                'SELECT u.id, u.ho_ten AS name, u.so_dien_thoai AS phone,
                        r.ten_vai_tro AS role, u.is_active
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE r.ten_vai_tro <> \'customer\' AND u.deleted_at IS NULL
                 ORDER BY u.ho_ten',
            )->fetchAll();
            $data['system_settings'] = $pdo->query(
                'SELECT khoa AS setting_key, gia_tri AS setting_value, mo_ta AS description
                 FROM system_settings
                 WHERE khoa IN (\'canh_bao_can_han_ngay\', \'thoi_han_khieu_nai_gio\')
                 ORDER BY khoa',
            )->fetchAll();

            $data['summary'] = $pdo->query(
                'SELECT
                    (SELECT COUNT(*) FROM orders) AS order_count,
                    (SELECT COUNT(*) FROM orders WHERE trang_thai = \'cho_duyet\') AS pending_order_count,
                    (SELECT COUNT(*) FROM products WHERE is_active = 1 AND deleted_at IS NULL) AS active_product_count,
                    (SELECT COUNT(*) FROM products p WHERE p.is_active = 1 AND p.deleted_at IS NULL
                       AND EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id
                                   AND b.trang_thai = \'con_hang\' AND b.so_luong_ton > 0
                                   AND b.ngay_het_han >= CURDATE())) AS available_product_count,
                    (SELECT COUNT(*) FROM products p WHERE p.is_active = 1 AND p.deleted_at IS NULL
                       AND (SELECT COALESCE(SUM(b.so_luong_ton), 0) FROM batches b
                            WHERE b.product_id = p.id AND b.trang_thai = \'con_hang\'
                              AND b.ngay_het_han >= CURDATE()) < 50) AS low_stock_product_count,
                    (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
                       WHERE r.ten_vai_tro <> \'customer\' AND u.is_active = 1 AND u.deleted_at IS NULL) AS active_staff_count,
                    (SELECT COALESCE(SUM(so_tien), 0) FROM payments
                       WHERE trang_thai = \'thanh_cong\'
                         AND thoi_gian_thanh_toan >= DATE_FORMAT(CURDATE(), \'%Y-%m-01\')
                         AND thoi_gian_thanh_toan < DATE_ADD(DATE_FORMAT(CURDATE(), \'%Y-%m-01\'), INTERVAL 1 MONTH)) AS monthly_revenue,
                    (SELECT COUNT(*) FROM batches WHERE so_luong_ton > 0 AND ngay_het_han BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) AS expiring_batch_count',
            )->fetch();

            $data['monthly_revenue'] = $pdo->query(
                'SELECT DATE_FORMAT(thoi_gian_thanh_toan, \'%Y-%m\') AS month,
                        SUM(so_tien) AS total
                 FROM payments
                 WHERE trang_thai = \'thanh_cong\'
                   AND thoi_gian_thanh_toan >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), \'%Y-%m-01\')
                   AND thoi_gian_thanh_toan < DATE_ADD(DATE_FORMAT(CURDATE(), \'%Y-%m-01\'), INTERVAL 1 MONTH)
                 GROUP BY DATE_FORMAT(thoi_gian_thanh_toan, \'%Y-%m\')
                 ORDER BY month',
            )->fetchAll();
        }

        respondJson(['data' => $data]);
    }

    if ($method === 'POST' && $path === '/api/auth/register') {
        $name = requiredString($body, 'ho_ten', 100);
        $email = strtolower(requiredString($body, 'email', 150));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            validationFailure(['email' => ['Email không hợp lệ.']]);
        }
        if (strlen($password) < 8 || !preg_match('/[a-z]/', $password) || !preg_match('/[A-Z]/', $password) || !preg_match('/\d/', $password)) {
            validationFailure(['password' => ['Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.']]);
        }
        $phone = isset($body['so_dien_thoai']) && trim((string) $body['so_dien_thoai']) !== ''
            ? trim((string) $body['so_dien_thoai'])
            : null;
        if ($phone !== null && mb_strlen($phone) > 15) {
            validationFailure(['so_dien_thoai' => ['Số điện thoại quá dài.']]);
        }
        $roleId = $pdo->query("SELECT id FROM roles WHERE ten_vai_tro = 'customer' LIMIT 1")->fetchColumn();
        if ($roleId === false) {
            throw new RuntimeException('Không tìm thấy vai trò customer trong bảng roles.');
        }
        try {
            $statement = $pdo->prepare(
                'INSERT INTO users (role_id, ho_ten, email, so_dien_thoai, password, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            );
            $statement->execute([(int) $roleId, $name, $email, $phone, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                validationFailure(['email' => ['Email hoặc số điện thoại đã được sử dụng.']]);
            }
            throw $error;
        }

        $statement = $pdo->prepare(
            'SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, r.ten_vai_tro AS role
             FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
        );
        $statement->execute([(int) $pdo->lastInsertId()]);
        respondJson(['message' => 'Tạo tài khoản thành công.', 'data' => publicUser($statement->fetch())], 201);
    }

    if ($method === 'POST' && $path === '/api/auth/forgot-password') {
        if (!localPasswordRecoveryAllowed($config)) {
            failApi(503, 'Khôi phục mật khẩu qua email chưa được cấu hình. Token chỉ được cấp trên máy local.');
        }

        $email = strtolower(requiredString($body, 'email', 150));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            validationFailure(['email' => ['Email không hợp lệ.']]);
        }

        $statement = $pdo->prepare(
            'SELECT id FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1',
        );
        $statement->execute([$email]);
        $resetToken = null;
        if ($statement->fetchColumn() !== false) {
            $resetToken = bin2hex(random_bytes(32));
            $statement = $pdo->prepare(
                'INSERT INTO password_reset_tokens (email, token, created_at)
                 VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE token = VALUES(token), created_at = VALUES(created_at)',
            );
            $statement->execute([$email, hash('sha256', $resetToken)]);
        }

        $response = ['message' => 'Nếu email tồn tại, mã khôi phục sẽ được cung cấp trong môi trường local.'];
        if ($resetToken !== null) {
            $response['development_reset_token'] = $resetToken;
        }
        respondJson($response);
    }

    if ($method === 'POST' && $path === '/api/auth/reset-password') {
        if (!localPasswordRecoveryAllowed($config)) {
            failApi(503, 'Khôi phục mật khẩu qua email chưa được cấu hình. Token chỉ được chấp nhận trên máy local.');
        }

        $email = strtolower(requiredString($body, 'email', 150));
        $resetToken = requiredString($body, 'token', 128);
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            validationFailure(['email' => ['Email không hợp lệ.']]);
        }
        if (strlen($password) < 8 || !preg_match('/[a-z]/', $password) || !preg_match('/[A-Z]/', $password) || !preg_match('/\d/', $password)) {
            validationFailure(['password' => ['Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.']]);
        }

        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare(
                'SELECT token FROM password_reset_tokens
                 WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
                 LIMIT 1 FOR UPDATE',
            );
            $statement->execute([$email]);
            $storedTokenHash = $statement->fetchColumn();
            if (!is_string($storedTokenHash) || !hash_equals($storedTokenHash, hash('sha256', $resetToken))) {
                $pdo->rollBack();
                failApi(422, 'Mã khôi phục không hợp lệ hoặc đã hết hạn.');
            }

            $statement = $pdo->prepare(
                'SELECT id FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1 FOR UPDATE',
            );
            $statement->execute([$email]);
            $userId = $statement->fetchColumn();
            if ($userId === false) {
                $pdo->rollBack();
                failApi(422, 'Mã khôi phục không hợp lệ hoặc đã hết hạn.');
            }

            $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            if (!is_string($passwordHash)) {
                throw new RuntimeException('Không thể mã hóa mật khẩu mới.');
            }
            $statement = $pdo->prepare(
                'UPDATE users SET password = ?, so_lan_dang_nhap_sai = 0, khoa_den = NULL, updated_at = NOW() WHERE id = ?',
            );
            $statement->execute([$passwordHash, (int) $userId]);

            $statement = $pdo->prepare(
                'DELETE FROM personal_access_tokens WHERE tokenable_type = ? AND tokenable_id = ?',
            );
            $statement->execute(['App\\Models\\User', (int) $userId]);

            $pdo->prepare('DELETE FROM password_reset_tokens WHERE email = ?')->execute([$email]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        respondJson(['message' => 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.']);
    }

    if ($method === 'POST' && $path === '/api/auth/login') {
        $email = strtolower(requiredString($body, 'email', 150));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if ($password === '') {
            validationFailure(['password' => ['Mật khẩu là bắt buộc.']]);
        }

        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare(
                'SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, u.password,
                        u.is_active, u.deleted_at, u.so_lan_dang_nhap_sai, u.khoa_den, r.ten_vai_tro AS role
                 FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE u.email = ? LIMIT 1 FOR UPDATE',
            );
            $statement->execute([$email]);
            $user = $statement->fetch();
            if (!$user || !(bool) $user['is_active'] || $user['deleted_at'] !== null) {
                $pdo->rollBack();
                failApi(401, 'Thông tin đăng nhập không chính xác.');
            }
            if ($user['khoa_den'] !== null && strtotime($user['khoa_den']) > time()) {
                $pdo->rollBack();
                failApi(429, 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần.');
            }
            if (!password_verify($password, $user['password'])) {
                $failedAttempts = min(5, (int) $user['so_lan_dang_nhap_sai'] + 1);
                $statement = $pdo->prepare(
                    'UPDATE users SET so_lan_dang_nhap_sai = ?, khoa_den = ? WHERE id = ?',
                );
                $lockUntil = $failedAttempts >= 5 ? date('Y-m-d H:i:s', time() + 900) : null;
                $statement->execute([$failedAttempts, $lockUntil, (int) $user['id']]);
                $pdo->commit();
                failApi($failedAttempts >= 5 ? 429 : 401, 'Thông tin đăng nhập không chính xác.');
            }

            $pdo->prepare('UPDATE users SET so_lan_dang_nhap_sai = 0, khoa_den = NULL WHERE id = ?')
                ->execute([(int) $user['id']]);
            $token = issueAccessToken($pdo, (int) $user['id'], $config['token_ttl']);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        respondJson([
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => $config['token_ttl'],
            'user' => publicUser($user),
        ]);
    }

    if ($method === 'GET' && $path === '/api/auth/me') {
        respondJson(['data' => publicUser(authenticatedUser($pdo))]);
    }

    if ($method === 'POST' && $path === '/api/auth/logout') {
        authenticatedUser($pdo);
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $headers['Authorization'] ?? $headers['authorization'] ?? '';
        preg_match('/^Bearer\s+(\S+)$/i', trim((string) $authorization), $matches);
        $pdo->prepare('DELETE FROM personal_access_tokens WHERE token = ?')->execute([hash('sha256', $matches[1])]);
        respondJson(['message' => 'Đăng xuất thành công.']);
    }

    if ($path === '/api/cart' && $method === 'GET') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $statement = $pdo->prepare('SELECT id, product_id, so_luong FROM cart_items WHERE user_id = ? ORDER BY id');
        $statement->execute([(int) $user['id']]);
        $items = $statement->fetchAll();
        $products = loadProducts($pdo, array_column($items, 'product_id'));
        respondJson(['data' => array_map(static fn (array $item): array => [
            'id' => (int) $item['id'],
            'product_id' => (int) $item['product_id'],
            'so_luong' => $item['so_luong'],
            'product' => $products[(int) $item['product_id']] ?? null,
        ], $items)]);
    }

    if ($path === '/api/cart' && $method === 'POST') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $productId = positiveInteger($body['product_id'] ?? null, 'product_id');
        $addUnits = quantityUnits($body['so_luong'] ?? null);
        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare('SELECT id, is_active FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE');
            $statement->execute([$productId]);
            $product = $statement->fetch();
            if (!$product || !(bool) $product['is_active']) {
                validationFailure(['product_id' => ['Sản phẩm không còn được mở bán.']]);
            }
            $stock = availableUnits($pdo, $productId, true);
            $statement = $pdo->prepare('SELECT id, so_luong FROM cart_items WHERE user_id = ? AND product_id = ? FOR UPDATE');
            $statement->execute([(int) $user['id'], $productId]);
            $existing = $statement->fetch();
            $newUnits = ($existing ? quantityUnits($existing['so_luong']) : 0) + $addUnits;
            if ($newUnits > $stock) {
                validationFailure(['so_luong' => ['Số lượng yêu cầu vượt quá tồn kho khả dụng.']]);
            }
            if ($existing) {
                $statement = $pdo->prepare('UPDATE cart_items SET so_luong = ?, updated_at = NOW() WHERE id = ?');
                $statement->execute([unitsDecimal($newUnits), (int) $existing['id']]);
                $itemId = (int) $existing['id'];
            } else {
                $statement = $pdo->prepare(
                    'INSERT INTO cart_items (user_id, product_id, so_luong, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                );
                $statement->execute([(int) $user['id'], $productId, unitsDecimal($newUnits)]);
                $itemId = (int) $pdo->lastInsertId();
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
        $productData = loadProducts($pdo, [$productId])[$productId] ?? null;
        respondJson(['data' => [
            'id' => $itemId,
            'product_id' => $productId,
            'so_luong' => unitsDecimal($newUnits),
            'product' => $productData,
        ]], 201);
    }

    if (preg_match('~^/api/cart/(\d+)$~', $path, $matches) === 1 && in_array($method, ['PUT', 'PATCH'], true)) {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $itemId = positiveInteger($matches[1], 'itemId');
        $units = quantityUnits($body['so_luong'] ?? null);
        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare('SELECT product_id FROM cart_items WHERE id = ? AND user_id = ? FOR UPDATE');
            $statement->execute([$itemId, (int) $user['id']]);
            $item = $statement->fetch();
            if (!$item) {
                failApi(404, 'Không tìm thấy sản phẩm trong giỏ hàng.');
            }
            if ($units > availableUnits($pdo, (int) $item['product_id'], true)) {
                validationFailure(['so_luong' => ['Số lượng yêu cầu vượt quá tồn kho khả dụng.']]);
            }
            $pdo->prepare('UPDATE cart_items SET so_luong = ?, updated_at = NOW() WHERE id = ?')
                ->execute([unitsDecimal($units), $itemId]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
        $productId = (int) $item['product_id'];
        respondJson(['data' => [
            'id' => $itemId,
            'product_id' => $productId,
            'so_luong' => unitsDecimal($units),
            'product' => loadProducts($pdo, [$productId])[$productId] ?? null,
        ]]);
    }

    if (preg_match('~^/api/cart/(\d+)$~', $path, $matches) === 1 && $method === 'DELETE') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $statement = $pdo->prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?');
        $statement->execute([(int) $matches[1], (int) $user['id']]);
        if ($statement->rowCount() === 0) {
            failApi(404, 'Không tìm thấy sản phẩm trong giỏ hàng.');
        }
        http_response_code(204);
        exit;
    }

    if ($method === 'POST' && $path === '/api/shipping/calculate') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $address = $body['dia_chi_giao'] ?? null;
        if ($address !== null && (!is_string($address) || mb_strlen(trim($address)) > 255)) {
            validationFailure(['dia_chi_giao' => ['Địa chỉ giao hàng không hợp lệ.']]);
        }
        if (!isset($body['khoang_cach_km']) && !isset($body['vi_do']) && trim((string) $address) === '') {
            validationFailure(['dia_chi_giao' => ['Cần cung cấp địa chỉ giao hàng hoặc khoảng cách hợp lệ.']]);
        }
        respondJson(['data' => shippingQuote($body, $config)]);
    }

    if ($method === 'POST' && $path === '/api/orders') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $recipient = requiredString($body, 'ten_nguoi_nhan', 100);
        $phone = requiredString($body, 'sdt_nguoi_nhan', 15);
        $address = requiredString($body, 'dia_chi_giao', 255);
        $note = isset($body['ghi_chu']) && trim((string) $body['ghi_chu']) !== '' ? trim((string) $body['ghi_chu']) : null;
        if ($note !== null && mb_strlen($note) > 255) {
            validationFailure(['ghi_chu' => ['Ghi chú không được vượt quá 255 ký tự.']]);
        }
        $shipping = shippingQuote(array_merge($body, ['dia_chi_giao' => $address]), $config);

        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare(
                'SELECT ci.product_id, ci.so_luong, p.ten_san_pham, p.gia_ban_co_ban, p.is_active
                 FROM cart_items ci JOIN products p ON p.id = ci.product_id
                 WHERE ci.user_id = ? FOR UPDATE',
            );
            $statement->execute([(int) $user['id']]);
            $cartItems = $statement->fetchAll();
            if ($cartItems === []) {
                validationFailure(['cart' => ['Giỏ hàng đang trống.']]);
            }

            $subtotal = 0;
            foreach ($cartItems as $item) {
                if (!(bool) $item['is_active']) {
                    validationFailure(['cart' => ['Giỏ hàng có sản phẩm không còn được mở bán.']]);
                }
                if (quantityUnits($item['so_luong']) > availableUnits($pdo, (int) $item['product_id'], true)) {
                    validationFailure(['cart' => ['Số lượng yêu cầu vượt quá tồn kho khả dụng.']]);
                }
                $subtotal += (int) round((float) $item['so_luong'] * (float) $item['gia_ban_co_ban']);
            }
            $total = $subtotal + $shipping['phi_van_chuyen'];
            $orderCode = strtoupper(bin2hex(random_bytes(10)));
            $statement = $pdo->prepare(
                "INSERT INTO orders
                    (ma_don, user_id, loai_don, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao,
                     khoang_cach_km, phi_van_chuyen, tong_tien_hang, tong_thanh_toan, trang_thai, ghi_chu, ngay_tao)
                 VALUES (?, ?, 'le', ?, ?, ?, ?, ?, ?, ?, 'cho_duyet', ?, NOW())",
            );
            $statement->execute([
                $orderCode,
                (int) $user['id'],
                $recipient,
                $phone,
                $address,
                $shipping['khoang_cach_km'],
                $shipping['phi_van_chuyen'],
                $subtotal,
                $total,
                $note,
            ]);
            $orderId = (int) $pdo->lastInsertId();
            $insertDetail = $pdo->prepare(
                'INSERT INTO order_details (order_id, product_id, batch_id, so_luong, don_gia)
                 VALUES (?, ?, NULL, ?, ?)',
            );
            $details = [];
            foreach ($cartItems as $item) {
                $insertDetail->execute([
                    $orderId,
                    (int) $item['product_id'],
                    $item['so_luong'],
                    $item['gia_ban_co_ban'],
                ]);
                $details[] = [
                    'product_id' => (int) $item['product_id'],
                    'so_luong' => $item['so_luong'],
                    'don_gia' => $item['gia_ban_co_ban'],
                    'thanh_tien' => (int) round((float) $item['so_luong'] * (float) $item['gia_ban_co_ban']),
                ];
            }
            $pdo->prepare('DELETE FROM cart_items WHERE user_id = ?')->execute([(int) $user['id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        respondJson(['data' => [
            'id' => $orderId,
            'ma_don' => $orderCode,
            'user_id' => (int) $user['id'],
            'ten_nguoi_nhan' => $recipient,
            'sdt_nguoi_nhan' => $phone,
            'dia_chi_giao' => $address,
            'khoang_cach_km' => $shipping['khoang_cach_km'],
            'phi_van_chuyen' => $shipping['phi_van_chuyen'],
            'tong_tien_hang' => $subtotal,
            'tong_thanh_toan' => $total,
            'trang_thai' => 'cho_duyet',
            'ghi_chu' => $note,
            'details' => $details,
        ]], 201);
    }

    if ($method === 'GET' && $path === '/api/orders') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $statement = $pdo->prepare(
            'SELECT id, ma_don, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao, tong_tien_hang,
                    phi_van_chuyen, tong_thanh_toan, trang_thai, ngay_tao
             FROM orders WHERE user_id = ? ORDER BY ngay_tao DESC LIMIT 100',
        );
        $statement->execute([(int) $user['id']]);
        respondJson(['data' => $statement->fetchAll()]);
    }

    if ($method === 'GET' && preg_match('~^/api/payments/(\d+)$~', $path, $matches) === 1) {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        respondJson(['data' => paymentOrderData($pdo, (int) $matches[1], (int) $user['id'])]);
    }

    if ($method === 'POST' && $path === '/api/payments/create') {
        $user = authenticatedUser($pdo);
        requireCustomer($user);
        $orderId = positiveInteger($body['order_id'] ?? null, 'order_id');
        $paymentMethod = $body['phuong_thuc'] ?? null;
        if (!in_array($paymentMethod, ['vietqr', 'vnpay'], true)) {
            validationFailure(['phuong_thuc' => ['Phương thức thanh toán không hợp lệ.']]);
        }
        if ($paymentMethod === 'vnpay' && (!$config['vnpay']['tmn_code'] || !$config['vnpay']['hash_secret'])) {
            failApi(503, 'Chưa cấu hình VNPAY sandbox (VNPAY_TMN_CODE, VNPAY_HASH_SECRET).');
        }
        if ($paymentMethod === 'vietqr' && (!$config['vietqr']['bank_id'] || !$config['vietqr']['account_no'])) {
            failApi(503, 'Chưa cấu hình tài khoản nhận VietQR.');
        }

        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare('SELECT id, tong_thanh_toan, trang_thai FROM orders WHERE id = ? AND user_id = ? FOR UPDATE');
            $statement->execute([$orderId, (int) $user['id']]);
            $order = $statement->fetch();
            if (!$order) {
                failApi(404, 'Không tìm thấy đơn hàng.');
            }
            if ($order['trang_thai'] !== 'cho_duyet') {
                failApi(409, 'Đơn hàng không còn ở trạng thái chờ thanh toán.');
            }
            $amount = (int) $order['tong_thanh_toan'];
            if ($amount <= 0) {
                validationFailure(['order_id' => ['Tổng thanh toán phải lớn hơn 0.']]);
            }

            $statement = $pdo->prepare(
                "SELECT id, order_id, phuong_thuc, so_tien, trang_thai, ma_giao_dich
                 FROM payments WHERE order_id = ? AND trang_thai = 'cho_xu_ly'
                 ORDER BY id DESC LIMIT 1 FOR UPDATE",
            );
            $statement->execute([$orderId]);
            $payment = $statement->fetch();
            if ($payment && $payment['phuong_thuc'] !== $paymentMethod) {
                failApi(409, 'Đơn hàng đã có giao dịch đang chờ xử lý.');
            }
            if (!$payment) {
                $statement = $pdo->prepare("SELECT id FROM payments WHERE order_id = ? AND trang_thai = 'thanh_cong' LIMIT 1");
                $statement->execute([$orderId]);
                if ($statement->fetchColumn()) {
                    failApi(409, 'Đơn hàng đã được thanh toán.');
                }
                $transactionCode = 'NL-'.strtoupper(bin2hex(random_bytes(16)));
                $statement = $pdo->prepare(
                    "INSERT INTO payments (order_id, subscription_id, phuong_thuc, so_tien, trang_thai, ma_giao_dich, created_at)
                     VALUES (?, NULL, ?, ?, 'cho_xu_ly', ?, NOW())",
                );
                $statement->execute([$orderId, $paymentMethod, $amount, $transactionCode]);
                $payment = [
                    'id' => (int) $pdo->lastInsertId(),
                    'order_id' => $orderId,
                    'phuong_thuc' => $paymentMethod,
                    'so_tien' => $amount,
                    'trang_thai' => 'cho_xu_ly',
                    'ma_giao_dich' => $transactionCode,
                ];
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        if ($paymentMethod === 'vnpay') {
            respondJson(['data' => [
                'payment' => $payment,
                'payment_url' => vnpayPaymentUrl($payment, $config, $_SERVER['REMOTE_ADDR'] ?? ''),
                'qr_payload' => null,
                'qr_image_url' => null,
                'can_simulate' => false,
            ]], 201);
        }

        $transferContent = 'NL'.(int) $payment['id'];
        $queryParams = [
            'amount' => (string) $payment['so_tien'],
            'addInfo' => $transferContent,
        ];
        if ($config['vietqr']['account_name']) {
            $queryParams['accountName'] = $config['vietqr']['account_name'];
        }
        $qrUrl = 'https://img.vietqr.io/image/'
            .rawurlencode($config['vietqr']['bank_id']).'-'
            .rawurlencode($config['vietqr']['account_no']).'-'
            .rawurlencode($config['vietqr']['template']).'?'
            .http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);
        respondJson(['data' => [
            'payment' => $payment,
            'qr_payload' => null,
            'payment_url' => $qrUrl,
            'qr_image_url' => $qrUrl,
            'transfer' => [
                'bank_id' => $config['vietqr']['bank_id'],
                'account_no' => $config['vietqr']['account_no'],
                'account_name' => $config['vietqr']['account_name'],
                'amount' => (int) $payment['so_tien'],
                'transfer_content' => $transferContent,
            ],
            'can_simulate' => false,
        ]], 201);
    }

    if (in_array($method, ['GET', 'POST'], true) && $path === '/api/payments/vnpay/ipn') {
        $params = array_merge($_GET, $body);
        $hashSecret = $config['vnpay']['hash_secret'];
        $secureHash = (string) ($params['vnp_SecureHash'] ?? '');
        unset($params['vnp_SecureHash'], $params['vnp_SecureHashType']);
        if (!$hashSecret || $secureHash === '' || !hash_equals(hash_hmac('sha512', encodeRfc3986Query($params), $hashSecret), strtolower($secureHash))) {
            respondJson(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }
        if ((string) ($params['vnp_TmnCode'] ?? '') !== (string) $config['vnpay']['tmn_code']) {
            respondJson(['RspCode' => '97', 'Message' => 'Invalid merchant']);
        }

        $paymentId = filter_var($params['vnp_TxnRef'] ?? null, FILTER_VALIDATE_INT);
        $amountMinor = filter_var($params['vnp_Amount'] ?? null, FILTER_VALIDATE_INT);
        if ($paymentId === false || $paymentId < 1 || $amountMinor === false || $amountMinor < 1 || $amountMinor % 100 !== 0) {
            respondJson(['RspCode' => '04', 'Message' => 'Invalid amount']);
        }

        try {
            $pdo->beginTransaction();
            $statement = $pdo->prepare(
                'SELECT p.id, p.order_id, p.phuong_thuc, p.so_tien, p.trang_thai AS payment_status,
                        o.trang_thai AS order_status
                 FROM payments p JOIN orders o ON o.id = p.order_id
                 WHERE p.id = ? FOR UPDATE',
            );
            $statement->execute([$paymentId]);
            $payment = $statement->fetch();
            if (!$payment || $payment['phuong_thuc'] !== 'vnpay') {
                $pdo->rollBack();
                respondJson(['RspCode' => '01', 'Message' => 'Order not found']);
            }
            if ((int) $payment['so_tien'] !== intdiv($amountMinor, 100)) {
                $pdo->rollBack();
                respondJson(['RspCode' => '04', 'Message' => 'Invalid amount']);
            }
            if ($payment['payment_status'] === 'thanh_cong') {
                $pdo->commit();
                respondJson(['RspCode' => '00', 'Message' => 'Confirm Success']);
            }

            $successful = (string) ($params['vnp_ResponseCode'] ?? '') === '00'
                && (!isset($params['vnp_TransactionStatus']) || (string) $params['vnp_TransactionStatus'] === '00');
            if (!$successful) {
                $pdo->prepare("UPDATE payments SET trang_thai = 'that_bai' WHERE id = ?")
                    ->execute([$paymentId]);
            } else {
                if ($payment['order_status'] !== 'cho_duyet') {
                    throw new RuntimeException('Đơn hàng không còn chờ thanh toán.');
                }
                allocateOrder($pdo, (int) $payment['order_id']);
                $pdo->prepare("UPDATE payments SET trang_thai = 'thanh_cong', thoi_gian_thanh_toan = NOW() WHERE id = ?")
                    ->execute([$paymentId]);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('VNPAY settlement failed: '.$error->getMessage());
            respondJson(['RspCode' => '99', 'Message' => 'Payment processing failed']);
        }

        respondJson(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    failApi(404, 'Không tìm thấy API endpoint.');
}

try {
    $database = $config['database'];
    $pdo = new PDO(
        "mysql:host={$database['host']};port={$database['port']};dbname={$database['name']};charset=utf8mb4",
        $database['username'],
        $database['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    );
    handleRequest($pdo, $config);
} catch (ApiFailure $error) {
    respondJson([
        'message' => $error->getMessage(),
        ...($error->errors !== null ? ['errors' => $error->errors] : []),
    ], $error->status);
} catch (Throwable $error) {
    error_log('PHP API error: '.$error->getMessage());
    respondJson(['message' => 'Lỗi máy chủ. Vui lòng thử lại sau.'], 500);
}
