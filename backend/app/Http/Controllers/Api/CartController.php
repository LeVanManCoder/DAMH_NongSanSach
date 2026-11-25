<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Models\Batch;
use App\Models\CartItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class CartController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/cart",
     *     tags={"Giỏ hàng"},
     *     summary="Xem giỏ hàng của khách hàng hiện tại",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách sản phẩm trong giỏ hàng."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được sử dụng giỏ hàng.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $items = CartItem::query()
            ->where('user_id', $request->user()->getKey())
            ->with('product:id,ten_san_pham,slug,hinh_anh_dai_dien,gia_ban_co_ban,don_vi_tinh,is_active')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $items]);
    }

    /**
     * @OA\Post(
     *     path="/api/cart",
     *     tags={"Giỏ hàng"},
     *     summary="Thêm sản phẩm vào giỏ hàng",
     *     description="Nếu sản phẩm đã có trong giỏ, số lượng mới được cộng vào số lượng hiện có.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"product_id","so_luong"},
     *
     *             @OA\Property(property="product_id", type="integer", example=1),
     *             @OA\Property(property="so_luong", type="number", format="float", example=2)
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Sản phẩm đã được thêm vào giỏ."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được sử dụng giỏ hàng."),
     *     @OA\Response(response=422, description="Sản phẩm hoặc số lượng không hợp lệ.")
     * )
     */
    public function store(StoreCartItemRequest $request): JsonResponse
    {
        $item = DB::transaction(function () use ($request): CartItem {
            $userId = $request->user()->getKey();
            $productId = $request->validated('product_id');
            $item = CartItem::query()
                ->where('user_id', $userId)
                ->where('product_id', $productId)
                ->lockForUpdate()
                ->first();
            $requestedUnits = $this->toMinorUnits((string) $request->validated('so_luong'));

            if ($item === null) {
                $item = new CartItem([
                    'user_id' => $userId,
                    'product_id' => $productId,
                    'so_luong' => $request->validated('so_luong'),
                ]);
            } else {
                $newQuantity = $this->toMinorUnits((string) $item->so_luong) + $requestedUnits;
                $item->so_luong = $this->fromMinorUnits($newQuantity);
            }

            $this->assertAvailableStock(
                (int) $productId,
                $this->toMinorUnits((string) $item->so_luong),
            );

            $item->save();

            return $item->load('product');
        });

        return response()->json(['data' => $item], 201);
    }

    /**
     * @OA\Put(
     *     path="/api/cart/{itemId}",
     *     tags={"Giỏ hàng"},
     *     summary="Cập nhật số lượng sản phẩm trong giỏ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="itemId", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"so_luong"},
     *
     *             @OA\Property(property="so_luong", type="number", format="float", example=3)
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Số lượng giỏ hàng đã được cập nhật."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được sử dụng giỏ hàng."),
     *     @OA\Response(response=404, description="Không tìm thấy sản phẩm trong giỏ."),
     *     @OA\Response(response=422, description="Số lượng không hợp lệ.")
     * )
     *
     * @OA\Patch(
     *     path="/api/cart/{itemId}",
     *     tags={"Giỏ hàng"},
     *     summary="Cập nhật số lượng sản phẩm trong giỏ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="itemId", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"so_luong"},
     *
     *             @OA\Property(property="so_luong", type="number", format="float", example=3)
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Số lượng giỏ hàng đã được cập nhật."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được sử dụng giỏ hàng."),
     *     @OA\Response(response=404, description="Không tìm thấy sản phẩm trong giỏ."),
     *     @OA\Response(response=422, description="Số lượng không hợp lệ.")
     * )
     */
    public function update(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        $item = DB::transaction(function () use ($request, $itemId): CartItem {
            $item = CartItem::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->findOrFail($itemId);
            $quantity = (string) $request->validated('so_luong');

            $this->assertAvailableStock(
                (int) $item->product_id,
                $this->toMinorUnits($quantity),
            );

            $item->so_luong = $quantity;
            $item->save();

            return $item->load('product');
        });

        return response()->json(['data' => $item]);
    }

    /**
     * @OA\Delete(
     *     path="/api/cart/{itemId}",
     *     tags={"Giỏ hàng"},
     *     summary="Xóa sản phẩm khỏi giỏ hàng",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="itemId", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=204, description="Đã xóa sản phẩm khỏi giỏ hàng."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được sử dụng giỏ hàng."),
     *     @OA\Response(response=404, description="Không tìm thấy sản phẩm trong giỏ.")
     * )
     */
    public function destroy(Request $request, int $itemId): JsonResponse
    {
        CartItem::query()
            ->where('user_id', $request->user()->getKey())
            ->findOrFail($itemId)
            ->delete();

        return response()->json(null, 204);
    }

    private function assertAvailableStock(int $productId, int $requestedUnits): void
    {
        $availableUnits = Batch::query()
            ->where('product_id', $productId)
            ->where('trang_thai', 'con_hang')
            ->where('so_luong_ton', '>', 0)
            ->whereDate('ngay_het_han', '>=', now()->toDateString())
            ->lockForUpdate()
            ->get(['id', 'so_luong_ton'])
            ->sum(fn (Batch $batch): int => $this->toMinorUnits((string) $batch->so_luong_ton));

        if ($requestedUnits > $availableUnits) {
            throw ValidationException::withMessages([
                'so_luong' => ['Số lượng yêu cầu vượt quá tồn kho khả dụng.'],
            ]);
        }
    }

    private function toMinorUnits(string $quantity): int
    {
        [$whole, $fraction] = array_pad(explode('.', $quantity, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');
    }

    private function fromMinorUnits(int $quantity): string
    {
        return sprintf('%d.%02d', intdiv($quantity, 100), $quantity % 100);
    }
}
