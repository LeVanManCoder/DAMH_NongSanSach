<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Annotations as OA;

class ProductController extends Controller
{
    public function farmIndex(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('ten_san_pham')
            ->get(['id', 'ten_san_pham', 'don_vi_tinh']);

        return response()->json(['data' => $products]);
    }

    /**
     * @OA\Get(
     *     path="/api/products",
     *     tags={"Sản phẩm"},
     *     summary="Danh sách sản phẩm đang mở bán",
     *     description="Chỉ trả sản phẩm đang hoạt động có ít nhất một lô còn hạn và còn tồn kho; kèm thông tin lô và nhật ký canh tác.",
     *
     *     @OA\Parameter(name="search", in="query", required=false, description="Tìm theo tên sản phẩm.", @OA\Schema(type="string")),
     *     @OA\Parameter(name="q", in="query", required=false, description="Từ khóa tương thích ngược, tìm theo tên hoặc mô tả.", @OA\Schema(type="string")),
     *     @OA\Parameter(name="category_id", in="query", required=false, description="Lọc theo danh mục.", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="per_page", in="query", required=false, description="Số sản phẩm mỗi trang (1-100).", @OA\Schema(type="integer", minimum=1, maximum=100, default=20)),
     *     @OA\Parameter(name="sort", in="query", required=false, description="Thứ tự: name hoặc newest.", @OA\Schema(type="string", enum={"name","newest"})),
     *
     *     @OA\Response(response=200, description="Danh sách sản phẩm đang mở bán, có phân trang."),
     *     @OA\Response(response=422, description="Tham số tìm kiếm không hợp lệ.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'q' => ['sometimes', 'string', 'max:120'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'in:name,newest'],
        ]);
        $search = $filters['search'] ?? null;
        $legacyQuery = $filters['q'] ?? null;

        $products = Product::query()
            ->select([
                'id',
                'category_id',
                'ten_san_pham',
                'slug',
                'mo_ta',
                'hinh_anh_dai_dien',
                'gia_ban_co_ban',
                'don_vi_tinh',
            ])
            ->where('is_active', true)
            ->when(isset($filters['category_id']), fn (Builder $query) => $query->where('category_id', $filters['category_id']))
            ->when($search !== null && $search !== '', function (Builder $query) use ($search): void {
                $query->where('ten_san_pham', 'like', '%'.$search.'%');
            })
            ->when(($search === null || $search === '') && $legacyQuery !== null && $legacyQuery !== '', function (Builder $query) use ($legacyQuery): void {
                $searchTerm = '%'.$legacyQuery.'%';
                $query->where(function (Builder $query) use ($searchTerm): void {
                    $query->where('ten_san_pham', 'like', $searchTerm)
                        ->orWhere('mo_ta', 'like', $searchTerm);
                });
            })
            ->whereHas('batches', fn (Builder $query) => $this->applyAvailableBatchFilters($query))
            ->with([
                'category:id,ten_danh_muc,slug',
                'batches' => function (Relation $query): void {
                    $this->applyAvailableBatchFilters($query);
                    $query->select([
                        'id',
                        'product_id',
                        'ma_lo',
                        'ngay_thu_hoach',
                        'ngay_het_han',
                        'so_luong_ton',
                        'qr_code',
                    ])->with([
                        'farmingLogs' => fn (Relation $logs) => $logs
                            ->select(['id', 'batch_id', 'hanh_dong', 'ghi_chu', 'hinh_anh_minh_chung', 'thoi_gian'])
                            ->orderBy('thoi_gian'),
                    ]);
                },
            ])
            ->when(
                ($filters['sort'] ?? 'name') === 'newest',
                fn (Builder $query) => $query->orderByDesc('created_at'),
                fn (Builder $query) => $query->orderBy('ten_san_pham'),
            )
            ->paginate($filters['per_page'] ?? 20)
            ->through(fn (Product $product): array => $this->presentProduct($product));

        return response()->json($products);
    }

    /**
     * @OA\Get(
     *     path="/api/products/{slug}",
     *     tags={"Sản phẩm"},
     *     summary="Chi tiết sản phẩm theo slug",
     *     description="Trả thông tin sản phẩm, các lô đang mở bán, mã QR và timeline nhật ký canh tác.",
     *
     *     @OA\Parameter(name="slug", in="path", required=true, description="Slug sản phẩm.", @OA\Schema(type="string", example="ca-chua-bi-huu-co")),
     *
     *     @OA\Response(response=200, description="Chi tiết sản phẩm đang mở bán."),
     *     @OA\Response(response=404, description="Không tìm thấy sản phẩm đang mở bán.")
     * )
     */
    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->select([
                'id',
                'category_id',
                'ten_san_pham',
                'slug',
                'mo_ta',
                'hinh_anh_dai_dien',
                'gia_ban_co_ban',
                'don_vi_tinh',
            ])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->whereHas('batches', fn (Builder $query) => $this->applyAvailableBatchFilters($query))
            ->with([
                'category:id,ten_danh_muc,slug',
                'batches' => function (Relation $query): void {
                    $this->applyAvailableBatchFilters($query);
                    $query->select([
                        'id',
                        'product_id',
                        'ma_lo',
                        'ngay_thu_hoach',
                        'ngay_het_han',
                        'so_luong_ton',
                        'qr_code',
                    ])->with([
                        'farmingLogs' => fn (Relation $logs) => $logs
                            ->select(['id', 'batch_id', 'hanh_dong', 'ghi_chu', 'hinh_anh_minh_chung', 'thoi_gian'])
                            ->orderBy('thoi_gian'),
                    ]);
                },
            ])
            ->firstOrFail();

        return response()->json(['data' => $this->presentProduct($product)]);
    }

    private function applyAvailableBatchFilters(Builder|Relation $query): void
    {
        $query->where('trang_thai', 'con_hang')
            ->where('so_luong_ton', '>', 0)
            ->whereDate('ngay_het_han', '>=', now()->toDateString())
            ->orderBy('ngay_het_han')
            ->orderBy('ngay_thu_hoach');
    }

    private function presentProduct(Product $product): array
    {
        return [
            'id' => $product->getKey(),
            'ten_san_pham' => $product->ten_san_pham,
            'slug' => $product->slug,
            'mo_ta' => $product->mo_ta,
            'hinh_anh_dai_dien' => $product->hinh_anh_dai_dien,
            'gia_ban_co_ban' => $product->gia_ban_co_ban,
            'don_vi_tinh' => $product->don_vi_tinh,
            'category' => $product->category ? [
                'id' => $product->category->getKey(),
                'ten_danh_muc' => $product->category->ten_danh_muc,
                'slug' => $product->category->slug,
            ] : null,
            'batches' => $product->batches->map(fn (Batch $batch): array => [
                'id' => $batch->getKey(),
                'ma_lo' => $batch->ma_lo,
                'ngay_thu_hoach' => $batch->ngay_thu_hoach?->toDateString(),
                'ngay_het_han' => $batch->ngay_het_han?->toDateString(),
                'so_luong_kha_dung' => $batch->so_luong_ton,
                'don_vi_tinh' => $product->don_vi_tinh,
                'qr_code' => $batch->qr_code,
                'farming_logs' => $batch->farmingLogs->map(fn ($log): array => [
                    'hanh_dong' => $log->hanh_dong,
                    'ghi_chu' => $log->ghi_chu,
                    'hinh_anh_minh_chung' => $log->hinh_anh_minh_chung,
                    'thoi_gian' => $log->thoi_gian?->toIso8601String(),
                ])->values(),
            ])->values(),
        ];
    }
}
