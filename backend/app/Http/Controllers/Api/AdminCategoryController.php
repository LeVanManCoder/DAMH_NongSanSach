<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminCategoryController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/admin/categories",
     *     tags={"Quản trị"},
     *     summary="Danh sách danh mục cho Admin",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách danh mục có số sản phẩm.")
     * )
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('products')
            ->orderBy('ten_danh_muc')
            ->paginate(100)
            ->through(fn (Category $category): array => $this->present($category));

        return response()->json($categories);
    }

    /**
     * @OA\Post(
     *     path="/api/admin/categories",
     *     tags={"Quản trị"},
     *     summary="Tạo danh mục",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=201, description="Danh mục đã được tạo.")
     * )
     */
    public function store(StoreCategoryRequest $request, AuditLogService $auditLogs): JsonResponse
    {
        $data = $request->validated();
        $category = DB::transaction(function () use ($request, $data, $auditLogs): Category {
            $category = Category::query()->create([
                'ten_danh_muc' => $data['ten_danh_muc'],
                'slug' => $this->uniqueSlug($data['ten_danh_muc']),
                'mo_ta' => $data['mo_ta'] ?? null,
                'is_active' => ($data['trang_thai'] ?? 'dang_ban') === 'dang_ban',
            ]);

            $auditLogs->record(
                $request->user(),
                'tao_danh_muc',
                'categories',
                (int) $category->getKey(),
                null,
                $this->snapshot($category),
                $request->ip(),
            );

            return $category;
        });

        return response()->json(['data' => $this->present($category)], 201);
    }

    /**
     * @OA\Put(
     *     path="/api/admin/categories/{id}",
     *     tags={"Quản trị"},
     *     summary="Cập nhật danh mục",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Danh mục đã được cập nhật.")
     * )
     */
    public function update(
        UpdateCategoryRequest $request,
        int $id,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $data = $request->validated();
        $category = DB::transaction(function () use ($request, $id, $data, $auditLogs): Category {
            $category = Category::query()->lockForUpdate()->findOrFail($id);
            $oldData = $this->snapshot($category);

            if (array_key_exists('ten_danh_muc', $data)) {
                $category->ten_danh_muc = $data['ten_danh_muc'];
                $category->slug = $this->uniqueSlug($data['ten_danh_muc'], $id);
            }
            if (array_key_exists('mo_ta', $data)) {
                $category->mo_ta = $data['mo_ta'];
            }
            if (array_key_exists('trang_thai', $data)) {
                $category->is_active = $data['trang_thai'] === 'dang_ban';
            }

            $category->save();
            $auditLogs->record(
                $request->user(),
                'cap_nhat_danh_muc',
                'categories',
                (int) $category->getKey(),
                $oldData,
                $this->snapshot($category),
                $request->ip(),
            );

            return $category;
        });

        return response()->json(['data' => $this->present($category)]);
    }

    /**
     * @OA\Delete(
     *     path="/api/admin/categories/{id}",
     *     tags={"Quản trị"},
     *     summary="Xóa danh mục không có dữ liệu liên kết",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=204, description="Danh mục đã được xóa."),
     *     @OA\Response(response=409, description="Danh mục còn sản phẩm hoặc danh mục con.")
     * )
     */
    public function destroy(
        Request $request,
        int $id,
        AuditLogService $auditLogs,
    ): JsonResponse {
        DB::transaction(function () use ($request, $id, $auditLogs): void {
            $category = Category::query()->lockForUpdate()->findOrFail($id);
            if ($category->products()->withTrashed()->exists() || $category->children()->exists()) {
                throw new HttpException(409, 'Không thể xóa danh mục đang có sản phẩm hoặc danh mục con.');
            }

            $oldData = $this->snapshot($category);
            $category->delete();
            $auditLogs->record(
                $request->user(),
                'xoa_danh_muc',
                'categories',
                (int) $category->getKey(),
                $oldData,
                ['deleted' => true],
                $request->ip(),
            );
        });

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(Category $category): array
    {
        return [
            'ten_danh_muc' => $category->ten_danh_muc,
            'slug' => $category->slug,
            'mo_ta' => $category->mo_ta,
            'is_active' => (bool) $category->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Category $category): array
    {
        return [
            'id' => $category->getKey(),
            'ten_danh_muc' => $category->ten_danh_muc,
            'slug' => $category->slug,
            'mo_ta' => $category->mo_ta,
            'is_active' => (bool) $category->is_active,
            'trang_thai' => $category->is_active ? 'dang_ban' : 'ngung_ban',
            'products_count' => $category->products_count ?? $category->products()->count(),
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
        ];
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;
        while (Category::query()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }
}
