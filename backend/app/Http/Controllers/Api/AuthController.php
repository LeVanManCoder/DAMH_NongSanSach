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
use OpenApi\Annotations as OA;

class AuthController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/auth/register",
     *     tags={"Xác thực"},
     *     summary="Đăng ký tài khoản khách hàng",
     *     description="Tạo tài khoản mới với vai trò customer.",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"ho_ten","email","password"},
     *
     *             @OA\Property(property="ho_ten", type="string", maxLength=100, example="Nguyễn Thị An"),
     *             @OA\Property(property="email", type="string", format="email", example="an@example.com"),
     *             @OA\Property(property="so_dien_thoai", type="string", nullable=true, example="0901234567"),
     *             @OA\Property(property="password", type="string", format="password", minLength=8, example="Password@123")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Tạo tài khoản thành công.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Tạo tài khoản thành công."),
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *
     *     @OA\Response(response=422, description="Dữ liệu đăng ký không hợp lệ.")
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/api/auth/login",
     *     tags={"Xác thực"},
     *     summary="Đăng nhập và nhận JWT",
     *     description="Đăng nhập bằng email và mật khẩu. Tài khoản bị tạm khóa 15 phút sau 5 lần nhập sai liên tiếp.",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"email","password"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="khach@nonglanh.vn"),
     *             @OA\Property(property="password", type="string", format="password", example="12345678")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Đăng nhập thành công.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="access_token", type="string"),
     *             @OA\Property(property="expires_in", type="integer", example=3600),
     *             @OA\Property(property="user", type="object")
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Thông tin đăng nhập không chính xác."),
     *     @OA\Response(response=422, description="Thiếu hoặc sai định dạng thông tin đăng nhập.")
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/api/auth/logout",
     *     tags={"Xác thực"},
     *     summary="Đăng xuất",
     *     description="Thu hồi JWT hiện tại.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Đăng xuất thành công.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Đăng xuất thành công.")
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ.")
     * )
     */
    public function logout(Request $request, JwtTokenService $tokens): JsonResponse
    {
        $tokens->revoke((string) $request->bearerToken());

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

    /**
     * @OA\Get(
     *     path="/api/auth/me",
     *     tags={"Xác thực"},
     *     summary="Lấy thông tin tài khoản hiện tại",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Thông tin tài khoản và vai trò hiện tại.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", type="object")
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ.")
     * )
     */
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
