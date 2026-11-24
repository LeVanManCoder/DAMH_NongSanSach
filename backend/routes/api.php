<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Season;

Route::get('/ping', function () {
    return response()->json(['status' => 'ok']);
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
