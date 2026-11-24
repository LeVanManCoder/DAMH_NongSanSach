<?php

namespace App\Http\Middleware;

use App\Services\JwtTokenService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateJwt
{
    public function __construct(private readonly JwtTokenService $tokens) {}

    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $token = $request->bearerToken();
        $user = $token ? $this->tokens->authenticate($token) : null;

        if ($user === null) {
            return response()->json(['message' => 'Chưa xác thực hoặc token không hợp lệ.'], 401);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
