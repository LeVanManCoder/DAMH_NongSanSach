<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CalculateShippingRequest;
use App\Services\ShippingService;
use Illuminate\Http\JsonResponse;
use OpenApi\Annotations as OA;

class ShippingController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/shipping/calculate",
     *     tags={"Giao hàng"},
     *     summary="Tính khoảng cách và phí giao hàng",
     *     description="Phí được tính theo 5.000 đồng/km. Có thể cung cấp địa chỉ giao hoặc khoảng cách đã biết.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="dia_chi_giao", type="string", example="12 Đường Xanh, Đà Lạt"),
     *             @OA\Property(property="khoang_cach_km", type="number", format="float", example=4.5),
     *             @OA\Property(property="vi_do", type="number", format="float", example=11.94),
     *             @OA\Property(property="kinh_do", type="number", format="float", example=108.45)
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Khoảng cách, phương pháp ước tính và phí giao hàng."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được tính phí giao hàng."),
     *     @OA\Response(response=422, description="Cần cung cấp địa chỉ hoặc khoảng cách hợp lệ.")
     * )
     */
    public function calculate(CalculateShippingRequest $request, ShippingService $shipping): JsonResponse
    {
        $validated = $request->validated();
        $quote = $shipping->calculate(
            $validated['dia_chi_giao'] ?? null,
            isset($validated['khoang_cach_km']) ? (float) $validated['khoang_cach_km'] : null,
            isset($validated['vi_do']) ? (float) $validated['vi_do'] : null,
            isset($validated['kinh_do']) ? (float) $validated['kinh_do'] : null,
        );

        return response()->json(['data' => $quote]);
    }
}
