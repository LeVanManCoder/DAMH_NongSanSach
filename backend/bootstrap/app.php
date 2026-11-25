<?php

use App\Exceptions\InsufficientStockException;
use App\Http\Middleware\AuthenticateJwt;
use App\Http\Middleware\CheckRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth.jwt' => AuthenticateJwt::class,
            'role' => CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $exception): bool => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            $status = 500;
            $message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
            $payload = [
                'status' => 'error',
                'message' => $message,
            ];

            if ($exception instanceof ValidationException) {
                $status = 422;
                $payload['message'] = 'Dữ liệu gửi lên không hợp lệ.';
                $payload['errors'] = $exception->errors();
            } elseif ($exception instanceof InsufficientStockException) {
                $status = 422;
                $payload['message'] = $exception->getMessage();
            } elseif ($exception instanceof AuthenticationException) {
                $status = 401;
                $payload['message'] = 'Vui lòng đăng nhập để tiếp tục.';
            } elseif ($exception instanceof AuthorizationException || $exception instanceof AccessDeniedHttpException) {
                $status = 403;
                $payload['message'] = 'Bạn không có quyền thực hiện thao tác này.';
            } elseif ($exception instanceof ModelNotFoundException || $exception instanceof NotFoundHttpException) {
                $status = 404;
                $payload['message'] = 'Không tìm thấy tài nguyên yêu cầu.';
            } elseif ($exception instanceof HttpExceptionInterface) {
                $status = $exception->getStatusCode();
                $payload['message'] = match ($status) {
                    400 => 'Yêu cầu không hợp lệ.',
                    401 => 'Vui lòng đăng nhập để tiếp tục.',
                    403 => 'Bạn không có quyền thực hiện thao tác này.',
                    404 => 'Không tìm thấy tài nguyên yêu cầu.',
                    405 => 'Phương thức yêu cầu không được hỗ trợ.',
                    409 => 'Yêu cầu bị xung đột với trạng thái hiện tại.',
                    422 => 'Dữ liệu gửi lên không hợp lệ.',
                    429 => 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                    default => $status >= 500
                        ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
                        : 'Không thể xử lý yêu cầu.',
                };
            }

            return response()->json($payload, $status);
        });
    })->create();
