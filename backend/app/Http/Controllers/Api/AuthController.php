<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\JwtTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ho_ten' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'so_dien_thoai' => ['nullable', 'string', 'max:15', 'unique:users,so_dien_thoai'],
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
        ]);

        $role = Role::query()->where('ten_vai_tro', 'customer')->firstOrFail();
        $user = new User($validated);
        $user->role()->associate($role);
        $user->save();

        return response()->json([
            'message' => 'Tạo tài khoản thành công.',
            'data' => $this->userData($user->load('role')),
        ], 201);
    }

    public function login(Request $request, JwtTokenService $tokens): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if ($user === null || ! $user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Thông tin đăng nhập không chính xác.',
            ], 401);
        }

        if ($user->khoa_den !== null && $user->khoa_den->isFuture()) {
            return $this->lockedResponse($user->khoa_den);
        }

        if (! Hash::check($validated['password'], $user->password)) {
            $lockUntil = DB::transaction(function () use ($validated): ?\Illuminate\Support\Carbon {
                $lockedUser = User::query()
                    ->where('email', $validated['email'])
                    ->lockForUpdate()
                    ->first();

                if ($lockedUser === null) {
                    return null;
                }

                if ($lockedUser->khoa_den !== null && $lockedUser->khoa_den->isFuture()) {
                    return $lockedUser->khoa_den;
                }

                $lockedUser->so_lan_dang_nhap_sai = min(5, $lockedUser->so_lan_dang_nhap_sai + 1);
                $lockedUser->khoa_den = $lockedUser->so_lan_dang_nhap_sai >= 5 ? now()->addMinutes(15) : null;
                $lockedUser->save();

                return $lockedUser->khoa_den;
            });

            if ($lockUntil !== null) {
                return $this->lockedResponse($lockUntil);
            }

            return response()->json(['message' => 'Thông tin đăng nhập không chính xác.'], 401);
        }

        $token = DB::transaction(function () use ($user, $tokens): string {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (! $lockedUser->is_active || ($lockedUser->khoa_den !== null && $lockedUser->khoa_den->isFuture())) {
                return '';
            }

            $lockedUser->so_lan_dang_nhap_sai = 0;
            $lockedUser->khoa_den = null;
            $lockedUser->save();

            return $tokens->issue($lockedUser);
        });

        if ($token === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản đang bị khóa hoặc đã bị vô hiệu hóa.',
            ], 429);
        }

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => (int) config('jwt.ttl', 3600),
            'user' => $this->userData($user->load('role')),
        ]);
    }

    public function logout(Request $request, JwtTokenService $tokens): JsonResponse
    {
        $tokens->revoke((string) $request->bearerToken());

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->userData($request->user()->load('role'))]);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'ho_ten' => $user->ho_ten,
            'email' => $user->email,
            'so_dien_thoai' => $user->so_dien_thoai,
            'diem_tich_luy' => $user->diem_tich_luy,
            'role' => $user->role?->ten_vai_tro,
        ];
    }

    private function lockedResponse(Carbon $lockUntil): JsonResponse
    {
        $retryAfter = max(1, now()->diffInSeconds($lockUntil, false));

        return response()->json([
            'status' => 'error',
            'message' => 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần.',
            'retry_after' => $retryAfter,
        ], 429)->header('Retry-After', (string) $retryAfter);
    }
}
