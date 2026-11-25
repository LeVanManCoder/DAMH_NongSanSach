<?php

use App\Http\Controllers\Api\AuthController;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Order;
use App\Models\Season;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/trace/{qrCode}', function (string $qrCode) {
    $batch = Batch::query()
        ->where('qr_code', $qrCode)
        ->with([
            'product:id,ten_san_pham,slug,don_vi_tinh',
            'season:id,ten_mua_vu,khu_vuc_canh_tac',
            'farmingLogs' => fn ($query) => $query->orderBy('thoi_gian'),
        ])
        ->firstOrFail();

    return response()->json([
        'data' => [
            'ma_lo' => $batch->ma_lo,
            'ngay_thu_hoach' => $batch->ngay_thu_hoach?->toDateString(),
            'ngay_het_han' => $batch->ngay_het_han?->toDateString(),
            'product' => $batch->product,
            'season' => $batch->season,
            'farming_logs' => $batch->farmingLogs->map(fn ($log) => [
                'hanh_dong' => $log->hanh_dong,
                'ghi_chu' => $log->ghi_chu,
                'hinh_anh_minh_chung' => $log->hinh_anh_minh_chung,
                'thoi_gian' => $log->thoi_gian,
            ])->values(),
        ],
    ]);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth.jwt');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth.jwt');
Route::get('/user', [AuthController::class, 'me'])->middleware('auth.jwt');

Route::middleware('auth.jwt')->group(function (): void {
    Route::middleware('role:customer')->get('/addresses', function (Request $request) {
        return Address::query()->where('user_id', $request->user()->getKey())->get();
    });

    Route::middleware('role:farm_staff')->get('/farm/seasons', fn () => Season::query()->get());

    Route::middleware('role:sales,admin')->get('/sales/orders', fn () => Order::query()->latest('ngay_tao')->paginate(20));

    Route::middleware('role:admin')->get('/admin/audit-logs', fn () => AuditLog::query()->latest('created_at')->paginate(20));
});
