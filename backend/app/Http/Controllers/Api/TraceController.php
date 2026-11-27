<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Http\JsonResponse;
use OpenApi\Annotations as OA;

class TraceController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/trace/{qrCode}",
     *     tags={"Truy xuất nguồn gốc"},
     *     summary="Tra cứu nhật ký canh tác bằng mã QR",
     *     description="Endpoint công khai, trả thông tin sản phẩm, mùa vụ, ngày thu hoạch và nhật ký canh tác của lô.",
     *
     *     @OA\Parameter(
     *         name="qrCode",
     *         in="path",
     *         required=true,
     *         description="Mã QR công khai của lô hàng.",
     *
     *         @OA\Schema(type="string", example="batch-12")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Thông tin truy xuất nguồn gốc.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="ma_lo", type="string"),
     *                 @OA\Property(property="trang_thai", type="string"),
     *                 @OA\Property(property="ngay_thu_hoach", type="string", format="date", nullable=true),
     *                 @OA\Property(property="ngay_het_han", type="string", format="date", nullable=true),
     *                 @OA\Property(property="product", type="object"),
     *                 @OA\Property(property="season", type="object", nullable=true),
     *                 @OA\Property(property="farming_logs", type="array", @OA\Items(type="object"))
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Không tìm thấy mã QR.")
     * )
     */
    public function show(string $qrCode): JsonResponse
    {
        $batch = Batch::query()
            ->where('qr_code', $qrCode)
            ->with([
                'product:id,ten_san_pham,slug,don_vi_tinh',
                'season:id,ten_mua_vu,khu_vuc_canh_tac',
                'farmingLogs' => fn ($query) => $query->orderBy('thoi_gian'),
            ])
            ->firstOrFail();

        return response()->json([
            'data' => [
                'ma_lo' => $batch->ma_lo,
                'trang_thai' => $batch->trang_thai,
                'ngay_thu_hoach' => $batch->ngay_thu_hoach?->toDateString(),
                'ngay_het_han' => $batch->ngay_het_han?->toDateString(),
                'product' => $batch->product,
                'season' => $batch->season,
                'farming_logs' => $batch->farmingLogs->map(fn ($log) => [
                    'hanh_dong' => $log->hanh_dong,
                    'ghi_chu' => $log->ghi_chu,
                    'hinh_anh_minh_chung' => $log->hinh_anh_minh_chung,
                    'thoi_gian' => $log->thoi_gian,
                ])->values(),
            ],
        ]);
    }
}
