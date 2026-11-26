<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReviewController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/products/{id}/reviews",
     *     tags={"Đánh giá"},
     *     summary="Danh sách đánh giá và điểm trung bình sản phẩm",
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Danh sách đánh giá công khai kèm điểm trung bình.")
     * )
     */
    public function index(int $id): JsonResponse
    {
        Product::query()->findOrFail($id);

        $reviews = Review::query()
            ->with('user:id,ho_ten')
            ->where('product_id', $id)
            ->latest('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $reviews->items(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'average_rating' => round((float) Review::query()
                    ->where('product_id', $id)
                    ->avg('so_sao'), 2),
            ],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/products/{id}/reviews",
     *     tags={"Đánh giá"},
     *     summary="Customer đánh giá sản phẩm đã mua trong đơn đã giao",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"order_id","so_sao"},
     *
     *         @OA\Property(property="order_id", type="integer"),
     *         @OA\Property(property="so_sao", type="integer", minimum=1, maximum=5),
     *         @OA\Property(property="noi_dung", type="string", nullable=true, maxLength=500)
     *     )),
     *
     *     @OA\Response(response=201, description="Đánh giá đã được ghi nhận."),
     *     @OA\Response(response=403, description="Chỉ Customer được đánh giá."),
     *     @OA\Response(response=404, description="Không tìm thấy sản phẩm hoặc đơn hàng thuộc tài khoản."),
     *     @OA\Response(response=409, description="Sản phẩm trong đơn này đã được đánh giá."),
     *     @OA\Response(response=422, description="Đơn chưa giao hoặc không chứa sản phẩm.")
     * )
     */
    public function store(StoreReviewRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $review = DB::transaction(function () use ($request, $validated, $id): Review {
            $product = Product::query()->findOrFail($id);
            $order = Order::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->findOrFail($validated['order_id']);

            if ($order->trang_thai !== 'da_giao') {
                throw ValidationException::withMessages([
                    'order_id' => ['Chỉ có thể đánh giá sản phẩm trong đơn đã giao.'],
                ]);
            }

            if (! $order->details()->where('product_id', $product->getKey())->exists()) {
                throw ValidationException::withMessages([
                    'order_id' => ['Đơn hàng đã chọn không có sản phẩm này.'],
                ]);
            }

            $alreadyReviewed = Review::query()
                ->where('user_id', $request->user()->getKey())
                ->where('product_id', $product->getKey())
                ->where('order_id', $order->getKey())
                ->exists();
            if ($alreadyReviewed) {
                throw new HttpException(409, 'Bạn đã đánh giá sản phẩm này trong đơn hàng.');
            }

            return Review::query()->create([
                'user_id' => $request->user()->getKey(),
                'product_id' => $product->getKey(),
                'order_id' => $order->getKey(),
                'so_sao' => $validated['so_sao'],
                'noi_dung' => $validated['noi_dung'] ?? null,
            ])->load('user:id,ho_ten');
        });

        return response()->json(['data' => $review], 201);
    }
}
