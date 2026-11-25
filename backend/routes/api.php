<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\FarmingLogController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SeasonController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\TraceController;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/trace/{qrCode}', [TraceController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/payments/ipn', [PaymentController::class, 'ipn']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth.jwt');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth.jwt');
Route::get('/user', [AuthController::class, 'me'])->middleware('auth.jwt');

Route::middleware('auth.jwt')->group(function (): void {
    Route::middleware('role:customer')->get('/addresses', function (Request $request) {
        return Address::query()->where('user_id', $request->user()->getKey())->get();
    });

    Route::middleware('role:farm_staff')->group(function (): void {
        Route::get('/farm/products', [ProductController::class, 'farmIndex']);
        Route::get('/seasons', [SeasonController::class, 'index']);
        Route::post('/seasons', [SeasonController::class, 'store']);
        Route::get('/farm/seasons', [SeasonController::class, 'index']);
    });

    Route::middleware('role:sales,admin')->get('/sales/orders', fn () => Order::query()->latest('ngay_tao')->paginate(20));

    Route::middleware('role:admin')->get('/admin/audit-logs', fn () => AuditLog::query()->latest('created_at')->paginate(20));

    Route::middleware('role:farm_staff,sales,admin')->group(function (): void {
        Route::get('/batches', [BatchController::class, 'index']);
        Route::get('/batches/{id}', [BatchController::class, 'show']);
    });

    Route::prefix('batches')->middleware('role:farm_staff')->group(function (): void {
        Route::post('/', [BatchController::class, 'store']);
        Route::put('/{id}', [BatchController::class, 'update']);
        Route::delete('/{id}', [BatchController::class, 'destroy']);
        Route::post('/{id}/generate-qr', [BatchController::class, 'generateQr']);
        Route::post('/{id}/farming-logs', [FarmingLogController::class, 'store']);
        Route::post('/{id}/waste', [BatchController::class, 'waste']);
    });

    Route::middleware('role:customer')->group(function (): void {
        Route::post('/shipping/calculate', [ShippingController::class, 'calculate']);
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'store']);
        Route::put('/cart/{itemId}', [CartController::class, 'update']);
        Route::patch('/cart/{itemId}', [CartController::class, 'update']);
        Route::delete('/cart/{itemId}', [CartController::class, 'destroy']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/orders/{id}/complaints', [ComplaintController::class, 'store']);
        Route::post('/payments/create', [PaymentController::class, 'create']);
    });

    Route::middleware('role:customer,sales,admin')->group(function (): void {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    });

    Route::middleware('role:sales')->patch('/orders/{id}/approve', [OrderController::class, 'approve']);
});
