<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateStaffUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use App\Models\WasteLog;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class AdminController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/admin/dashboard",
     *     tags={"Quản trị"},
     *     summary="Thống kê tổng quan hệ thống",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Doanh thu, đơn hàng, khách hàng, hàng cận hạn và hao hụt."),
     *     @OA\Response(response=403, description="Chỉ Admin được truy cập.")
     * )
     */
    public function dashboard(): JsonResponse
    {
        $today = now()->toDateString();
        $expiryThresholdDays = max(0, (int) config('inventory.expiry_warning_days', 2));
        $expiryThrough = now()->addDays($expiryThresholdDays)->toDateString();

        $ordersByStatus = Order::query()
            ->select('trang_thai', DB::raw('COUNT(*) as total'))
            ->groupBy('trang_thai')
            ->pluck('total', 'trang_thai');
        $nearExpiryBatches = Batch::query()
            ->where('trang_thai', 'con_hang')
            ->where('so_luong_ton', '>', 0)
            ->whereDate('ngay_het_han', '>=', $today)
            ->whereDate('ngay_het_han', '<=', $expiryThrough);
        $nearExpiryQuantity = (float) (clone $nearExpiryBatches)->sum('so_luong_ton');
        $availableQuantity = (float) Batch::query()
            ->where('trang_thai', 'con_hang')
            ->where('so_luong_ton', '>', 0)
            ->whereDate('ngay_het_han', '>=', $today)
            ->sum('so_luong_ton');
        $wasteQuantity = (float) WasteLog::query()->sum('so_luong');
        $receivedQuantity = (float) Batch::query()->sum('so_luong_nhap');

        return response()->json([
            'data' => [
                'doanh_thu' => (int) Order::query()
                    ->whereIn('trang_thai', ['da_thanh_toan', 'da_giao'])
                    ->sum('tong_thanh_toan'),
                'don_hang' => [
                    'tong_so' => (int) $ordersByStatus->sum(),
                    'theo_trang_thai' => $ordersByStatus,
                ],
                'khach_hang' => (int) User::query()
                    ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', 'customer'))
                    ->count(),
                'hang_can_han' => [
                    'so_lo' => (int) (clone $nearExpiryBatches)->count(),
                    'so_luong' => round($nearExpiryQuantity, 2),
                    'ty_le_ton_kha_dung' => $availableQuantity > 0
                        ? round($nearExpiryQuantity / $availableQuantity * 100, 2)
                        : 0,
                    'nguong_ngay' => $expiryThresholdDays,
                ],
                'hao_hut' => [
                    'so_lan_xuat_huy' => (int) WasteLog::query()->count(),
                    'so_luong' => round($wasteQuantity, 2),
                    'ty_le_tren_luong_nhap' => $receivedQuantity > 0
                        ? round($wasteQuantity / $receivedQuantity * 100, 2)
                        : 0,
                ],
            ],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/admin/users",
     *     tags={"Quản trị"},
     *     summary="Danh sách tài khoản và vai trò",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="role", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", required=false, @OA\Schema(type="boolean")),
     *
     *     @OA\Response(response=200, description="Danh sách tài khoản phân trang.")
     * )
     */
    public function users(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:150'],
            'role' => ['sometimes', 'nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'nullable', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $users = User::query()
            ->select(['id', 'ho_ten', 'email', 'so_dien_thoai', 'role_id', 'is_active', 'created_at'])
            ->with('role:id,ten_vai_tro')
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $query->where(function ($query) use ($filters): void {
                    $query->where('ho_ten', 'like', '%'.$filters['search'].'%')
                        ->orWhere('email', 'like', '%'.$filters['search'].'%');
                }),
            )
            ->when(
                filled($filters['role'] ?? null),
                fn ($query) => $query->whereHas(
                    'role',
                    fn ($roleQuery) => $roleQuery->where('ten_vai_tro', $filters['role']),
                ),
            )
            ->when(
                array_key_exists('is_active', $filters) && $filters['is_active'] !== null,
                fn ($query) => $query->where('is_active', $filters['is_active']),
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 20));

        return response()->json($users);
    }

    /**
     * @OA\Post(
     *     path="/api/admin/users",
     *     tags={"Quản trị"},
     *     summary="Tạo tài khoản nhân viên",
     *     description="Admin chỉ tạo role Farm Staff hoặc Sales; không tạo tài khoản Admin qua giao diện này.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=201, description="Tài khoản nhân viên đã được tạo."),
     *     @OA\Response(response=403, description="Chỉ Admin được tạo tài khoản nhân viên."),
     *     @OA\Response(response=422, description="Thông tin hoặc role không hợp lệ.")
     * )
     */
    public function createStaffUser(
        CreateStaffUserRequest $request,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($request, $validated, $auditLogs): User {
            $role = Role::query()->where('ten_vai_tro', $validated['role'])->firstOrFail();
            $user = new User([
                'ho_ten' => $validated['ho_ten'],
                'email' => $validated['email'],
                'so_dien_thoai' => $validated['so_dien_thoai'] ?? null,
                'password' => $validated['password'],
            ]);
            $user->role()->associate($role);
            $user->save();

            $auditLogs->record(
                $request->user(),
                'tao_tai_khoan_nhan_vien',
                'users',
                (int) $user->getKey(),
                null,
                ['email' => $user->email, 'role' => $role->ten_vai_tro],
                $request->ip(),
            );

            return $user->load('role:id,ten_vai_tro');
        });

        return response()->json(['data' => $user], 201);
    }

    /**
     * @OA\Patch(
     *     path="/api/admin/users/{id}/status",
     *     tags={"Quản trị"},
     *     summary="Khóa hoặc mở khóa tài khoản",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"is_active"},
     *
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *
     *     @OA\Response(response=200, description="Trạng thái tài khoản đã cập nhật."),
     *     @OA\Response(response=403, description="Chỉ Admin được thực hiện."),
     *     @OA\Response(response=404, description="Không tìm thấy tài khoản."),
     *     @OA\Response(response=422, description="Không được tự khóa tài khoản.")
     * )
     */
    public function updateUserStatus(
        UpdateUserStatusRequest $request,
        int $id,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $active = (bool) $request->validated('is_active');

        $user = DB::transaction(function () use ($request, $id, $active, $auditLogs): User {
            $user = User::query()->lockForUpdate()->findOrFail($id);
            if ($user->is_active && ! $active && $user->is($request->user())) {
                throw ValidationException::withMessages([
                    'is_active' => ['Bạn không thể tự khóa tài khoản của mình.'],
                ]);
            }

            $previousStatus = (bool) $user->is_active;
            if ($previousStatus !== $active) {
                $user->is_active = $active;
                $user->save();
                $auditLogs->record(
                    $request->user(),
                    $active ? 'mo_khoa_tai_khoan' : 'khoa_tai_khoan',
                    'users',
                    (int) $user->getKey(),
                    ['is_active' => $previousStatus],
                    ['is_active' => $active],
                    $request->ip(),
                );
            }

            return $user->load('role:id,ten_vai_tro');
        });

        return response()->json(['data' => $user]);
    }

    /**
     * @OA\Get(
     *     path="/api/admin/audit-logs",
     *     tags={"Quản trị"},
     *     summary="Tra cứu nhật ký hoạt động",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="hanh_dong", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="doi_tuong", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="nguoi_thuc_hien", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="tu_ngay", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="den_ngay", in="query", required=false, @OA\Schema(type="string", format="date")),
     *
     *     @OA\Response(response=200, description="Nhật ký mới nhất, phân trang và có thông tin người thao tác.")
     * )
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'hanh_dong' => ['sometimes', 'nullable', 'string', 'max:50'],
            'doi_tuong' => ['sometimes', 'nullable', 'string', 'max:50'],
            'nguoi_thuc_hien' => ['sometimes', 'nullable', 'string', 'max:150'],
            'tu_ngay' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'den_ngay' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        if (
            filled($filters['tu_ngay'] ?? null)
            && filled($filters['den_ngay'] ?? null)
            && $filters['den_ngay'] < $filters['tu_ngay']
        ) {
            throw ValidationException::withMessages([
                'den_ngay' => ['Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'],
            ]);
        }

        $logs = AuditLog::query()
            ->with('user:id,ho_ten,email')
            ->when(
                filled($filters['hanh_dong'] ?? null),
                fn ($query) => $query->where('hanh_dong', $filters['hanh_dong']),
            )
            ->when(
                filled($filters['doi_tuong'] ?? null),
                fn ($query) => $query->where('doi_tuong', $filters['doi_tuong']),
            )
            ->when(
                filled($filters['nguoi_thuc_hien'] ?? null),
                fn ($query) => $query->whereHas('user', fn ($userQuery) => $userQuery
                    ->where('ho_ten', 'like', '%'.$filters['nguoi_thuc_hien'].'%')
                    ->orWhere('email', 'like', '%'.$filters['nguoi_thuc_hien'].'%')),
            )
            ->when(
                filled($filters['tu_ngay'] ?? null),
                fn ($query) => $query->whereDate('created_at', '>=', $filters['tu_ngay']),
            )
            ->when(
                filled($filters['den_ngay'] ?? null),
                fn ($query) => $query->whereDate('created_at', '<=', $filters['den_ngay']),
            )
            ->latest('created_at')
            ->paginate((int) ($filters['per_page'] ?? 20));

        return response()->json($logs);
    }
}
