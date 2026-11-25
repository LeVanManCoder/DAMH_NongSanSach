<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Models\CartItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = CartItem::query()
            ->where('user_id', $request->user()->getKey())
            ->with('product:id,ten_san_pham,slug,hinh_anh_dai_dien,gia_ban_co_ban,don_vi_tinh,is_active')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $items]);
    }

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

            if ($item === null) {
                $item = new CartItem([
                    'user_id' => $userId,
                    'product_id' => $productId,
                    'so_luong' => $request->validated('so_luong'),
                ]);
            } else {
                $newQuantity = (int) round((float) $item->so_luong * 100)
                    + (int) round((float) $request->validated('so_luong') * 100);
                $item->so_luong = sprintf('%d.%02d', intdiv($newQuantity, 100), $newQuantity % 100);
            }

            $item->save();

            return $item->load('product');
        });

        return response()->json(['data' => $item], 201);
    }

    public function update(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        $item = CartItem::query()
            ->where('user_id', $request->user()->getKey())
            ->findOrFail($itemId);
        $item->so_luong = $request->validated('so_luong');
        $item->save();

        return response()->json(['data' => $item->load('product')]);
    }

    public function destroy(Request $request, int $itemId): JsonResponse
    {
        CartItem::query()
            ->where('user_id', $request->user()->getKey())
            ->findOrFail($itemId)
            ->delete();

        return response()->json(null, 204);
    }
}
