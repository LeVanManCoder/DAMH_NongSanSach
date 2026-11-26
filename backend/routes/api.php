<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\FarmingLogController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SeasonController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\TraceController;
use App\Models\Order;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/trace/{qrCode}', [TraceController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}/reviews', [ReviewController::class, 'index'])->whereNumber('id');
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/subscription-plans', [SubscriptionController::class, 'plans']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/payments/ipn', [PaymentController::class, 'ipn']);
Route::post('/payments/payos/webhook', [PaymentController::class, 'payOsWebhook']);
Route::match(['get', 'post'], '/payments/vnpay/ipn', [PaymentController::class, 'vnpayIpn']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth.jwt');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth.jwt');
Route::get('/user', [AuthController::class, 'me'])->middleware('auth.jwt');

Route::middleware('auth.jwt')->group(function (): void {
    Route::middleware('role:farm_staff')->group(function (): void {
        Route::get('/farm/products', [ProductController::class, 'farmIndex']);
        Route::get('/seasons', [SeasonController::class, 'index']);
        Route::post('/seasons', [SeasonController::class, 'store']);
        Route::get('/farm/seasons', [SeasonController::class, 'index']);
    });

    Route::middleware('role:sales,admin')->get('/sales/orders', fn () => Order::query()->latest('ngay_tao')->paginate(20));

    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
    });

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
        Route::get('/addresses', [AddressController::class, 'index']);
        Route::post('/addresses', [AddressController::class, 'store']);
        Route::put('/addresses/{id}', [AddressController::class, 'update']);
        Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);
        Route::patch('/addresses/{id}/default', [AddressController::class, 'setDefault']);
        Route::post('/shipping/calculate', [ShippingController::class, 'calculate']);
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'store']);
        Route::put('/cart/{itemId}', [CartController::class, 'update']);
        Route::patch('/cart/{itemId}', [CartController::class, 'update']);
        Route::delete('/cart/{itemId}', [CartController::class, 'destroy']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/subscriptions', [SubscriptionController::class, 'index']);
        Route::post('/subscriptions', [SubscriptionController::class, 'store']);
        Route::patch('/subscriptions/{id}/status', [SubscriptionController::class, 'updateStatus']);
        Route::post('/orders/{id}/complaints', [ComplaintController::class, 'store']);
        Route::post('/products/{id}/reviews', [ReviewController::class, 'store'])->whereNumber('id');
        Route::post('/payments/create', [PaymentController::class, 'create']);
    });

    Route::middleware('role:sales,admin')->group(function (): void {
        Route::get('/complaints', [ComplaintController::class, 'index']);
    });

    Route::middleware('role:sales')->put('/complaints/{id}', [ComplaintController::class, 'update']);

    Route::middleware('role:customer,sales,admin')->group(function (): void {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    });

    Route::middleware('role:sales')->patch('/orders/{id}/approve', [OrderController::class, 'approve']);
});
