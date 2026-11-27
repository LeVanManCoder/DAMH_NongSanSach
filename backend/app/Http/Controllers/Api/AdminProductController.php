<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Services\AuditLogService;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class AdminProductController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/admin/products",
     *     tags={"Quản trị"},
     *     summary="Danh sách sản phẩm cho Admin",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách sản phẩm có danh mục.")
     * )
     */
    public function index(): JsonResponse
    {
        $products = Product::query()
            ->with('category:id,ten_danh_muc')
            ->latest('id')
            ->paginate(100)
            ->through(fn (Product $product): array => $this->present($product));

        return response()->json($products);
    }

    /**
     * @OA\Post(
     *     path="/api/admin/products",
     *     tags={"Quản trị"},
     *     summary="Tạo sản phẩm kèm ảnh tùy chọn",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=201, description="Sản phẩm đã được tạo.")
     * )
     */
    public function store(
        StoreProductRequest $request,
        AuditLogService $auditLogs,
        ImageStorageService $images,
    ): JsonResponse {
        $data = $request->validated();
        $file = $request->file('hinh_anh_dai_dien');
        $imageUrl = null;

        try {
            if ($file instanceof UploadedFile) {
                $imageUrl = $images->store($file, 'nong-lanh/products');
            }

            $product = DB::transaction(function () use ($request, $data, $imageUrl, $auditLogs): Product {
                $product = Product::query()->create([
                    'category_id' => $data['category_id'],
                    'ten_san_pham' => $data['ten_san_pham'],
                    'slug' => $this->uniqueSlug($data['ten_san_pham']),
                    'mo_ta' => $data['mo_ta'] ?? null,
                    'hinh_anh_dai_dien' => $imageUrl,
                    'gia_ban_co_ban' => $data['gia_ban'],
                    'don_vi_tinh' => $data['don_vi_tinh'],
                    'is_active' => ($data['trang_thai'] ?? 'dang_ban') === 'dang_ban',
                ]);
                $auditLogs->record(
                    $request->user(),
                    'tao_san_pham',
                    'products',
                    (int) $product->getKey(),
                    null,
                    $this->snapshot($product),
                    $request->ip(),
                );

                return $product;
            });
        } catch (Throwable $exception) {
            if (is_string($imageUrl)) {
                $images->delete($imageUrl);
            }

            throw $exception;
        }

        return response()->json(['data' => $this->present($product->load('category'))], 201);
    }

    /**
     * @OA\Put(
     *     path="/api/admin/products/{id}",
     *     tags={"Quản trị"},
     *     summary="Cập nhật sản phẩm kèm ảnh tùy chọn",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Sản phẩm đã được cập nhật.")
     * )
     */
    public function update(
        UpdateProductRequest $request,
        int $id,
        AuditLogService $auditLogs,
        ImageStorageService $images,
    ): JsonResponse {
        $data = $request->validated();
        $file = $request->file('hinh_anh_dai_dien');
        $newImageUrl = null;
        $oldImageUrl = null;

        try {
            if ($file instanceof UploadedFile) {
                $newImageUrl = $images->store($file, 'nong-lanh/products');
            }

            $product = DB::transaction(function () use (
                $request,
                $id,
                $data,
                $newImageUrl,
                $auditLogs,
                &$oldImageUrl,
            ): Product {
                $product = Product::query()->lockForUpdate()->findOrFail($id);
                $oldData = $this->snapshot($product);
                $oldImageUrl = $product->hinh_anh_dai_dien;

                if (array_key_exists('ten_san_pham', $data)) {
                    $product->ten_san_pham = $data['ten_san_pham'];
                    $product->slug = $this->uniqueSlug($data['ten_san_pham'], $id);
                }
                if (array_key_exists('category_id', $data)) {
                    $product->category_id = $data['category_id'];
                }
                if (array_key_exists('gia_ban', $data)) {
                    $product->gia_ban_co_ban = $data['gia_ban'];
                }
                if (array_key_exists('don_vi_tinh', $data)) {
                    $product->don_vi_tinh = $data['don_vi_tinh'];
                }
                if (array_key_exists('mo_ta', $data)) {
                    $product->mo_ta = $data['mo_ta'];
                }
                if (array_key_exists('trang_thai', $data)) {
                    $product->is_active = $data['trang_thai'] === 'dang_ban';
                }
                if ($newImageUrl !== null) {
                    $product->hinh_anh_dai_dien = $newImageUrl;
                }

                $product->save();
                $auditLogs->record(
                    $request->user(),
                    'cap_nhat_san_pham',
                    'products',
                    (int) $product->getKey(),
                    $oldData,
                    $this->snapshot($product),
                    $request->ip(),
                );

                return $product;
            });
        } catch (Throwable $exception) {
            if (is_string($newImageUrl)) {
                $images->delete($newImageUrl);
            }

            throw $exception;
        }

        if ($newImageUrl !== null && is_string($oldImageUrl) && $oldImageUrl !== $newImageUrl) {
            $images->delete($oldImageUrl);
        }

        return response()->json(['data' => $this->present($product->load('category'))]);
    }

    /**
     * @OA\Delete(
     *     path="/api/admin/products/{id}",
     *     tags={"Quản trị"},
     *     summary="Ngừng và xóa mềm sản phẩm chưa phát sinh lô hoặc đơn",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=204, description="Sản phẩm đã được xóa mềm."),
     *     @OA\Response(response=409, description="Sản phẩm đã có lô hàng hoặc đơn hàng.")
     * )
     */
    public function destroy(
        Request $request,
        int $id,
        AuditLogService $auditLogs,
    ): JsonResponse {
        DB::transaction(function () use ($request, $id, $auditLogs): void {
            $product = Product::query()->lockForUpdate()->findOrFail($id);
            if ($product->batches()->exists() || $product->orderDetails()->exists()) {
                throw new HttpException(409, 'Không thể xóa sản phẩm đã có lô hàng hoặc đơn hàng liên kết.');
            }

            $oldData = $this->snapshot($product);
            $product->is_active = false;
            $product->save();
            $product->delete();
            $auditLogs->record(
                $request->user(),
                'xoa_san_pham',
                'products',
                (int) $product->getKey(),
                $oldData,
                ['is_active' => false, 'deleted' => true],
                $request->ip(),
            );
        });

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(Product $product): array
    {
        return [
            'category_id' => (int) $product->category_id,
            'ten_san_pham' => $product->ten_san_pham,
            'slug' => $product->slug,
            'mo_ta' => $product->mo_ta,
            'hinh_anh_dai_dien' => $product->hinh_anh_dai_dien,
            'gia_ban_co_ban' => (int) $product->gia_ban_co_ban,
            'don_vi_tinh' => $product->don_vi_tinh,
            'is_active' => (bool) $product->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Product $product): array
    {
        return [
            'id' => $product->getKey(),
            'category_id' => $product->category_id,
            'ten_san_pham' => $product->ten_san_pham,
            'slug' => $product->slug,
            'mo_ta' => $product->mo_ta,
            'hinh_anh_dai_dien' => $product->hinh_anh_dai_dien,
            'gia_ban' => (int) $product->gia_ban_co_ban,
            'gia_ban_co_ban' => $product->gia_ban_co_ban,
            'don_vi_tinh' => $product->don_vi_tinh,
            'trang_thai' => $product->is_active ? 'dang_ban' : 'ngung_ban',
            'is_active' => (bool) $product->is_active,
            'category' => $product->category ? [
                'id' => $product->category->getKey(),
                'ten_danh_muc' => $product->category->ten_danh_muc,
            ] : null,
        ];
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;
        while (Product::withTrashed()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }
}
