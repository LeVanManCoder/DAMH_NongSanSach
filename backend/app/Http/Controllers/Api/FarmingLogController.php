<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFarmingLogRequest;
use App\Models\Batch;
use App\Models\FarmingLog;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use OpenApi\Annotations as OA;
use RuntimeException;
use Throwable;

class FarmingLogController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/batches/{id}/farming-logs",
     *     tags={"Nhật ký canh tác"},
     *     summary="Ghi nhật ký canh tác cho một lô hàng",
     *     description="Farm Staff tạo nhật ký; khi lô đã có ngày thu hoạch, QR được sinh tự động sau nhật ký đầu tiên.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\MediaType(mediaType="multipart/form-data", @OA\Schema(
     *         required={"hanh_dong","ghi_chu","thoi_gian"},
     *
     *         @OA\Property(property="hanh_dong", type="string", enum={"gieo_hat","bon_phan","tuoi_nuoc","phun_thuoc","cham_soc","thu_hoach","khac"}),
     *         @OA\Property(property="ghi_chu", type="string"),
     *         @OA\Property(property="thoi_gian", type="string", format="date-time"),
     *         @OA\Property(property="hinh_anh_minh_chung", type="string", format="binary")
     *     ))),
     *
     *     @OA\Response(response=201, description="Nhật ký đã được ghi nhận; có thể kèm QR mới."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được ghi nhật ký."),
     *     @OA\Response(response=404, description="Không tìm thấy lô."),
     *     @OA\Response(response=422, description="Dữ liệu nhật ký không hợp lệ.")
     * )
     */
    public function store(
        StoreFarmingLogRequest $request,
        int $id,
        QrCodeService $qrCodes,
    ): JsonResponse {
        $validated = $request->validated();
        $file = $request->file('hinh_anh_minh_chung');
        $storedPath = null;

        try {
            $log = DB::transaction(function () use ($request, $validated, $file, $id, &$storedPath): FarmingLog {
                $batch = Batch::query()->lockForUpdate()->findOrFail($id);
                $imageUrl = null;

                if ($file !== null) {
                    $storedPath = $file->store('farming-logs', 'public');
                    if ($storedPath === false) {
                        throw new RuntimeException('Không thể lưu ảnh minh chứng nhật ký.');
                    }
                    $imageUrl = Storage::disk('public')->url($storedPath);
                }

                return FarmingLog::query()->create([
                    'batch_id' => $batch->getKey(),
                    'farm_staff_id' => $request->user()->getKey(),
                    'hanh_dong' => $validated['hanh_dong'],
                    'ghi_chu' => $validated['ghi_chu'],
                    'thoi_gian' => $validated['thoi_gian'],
                    'hinh_anh_minh_chung' => $imageUrl,
                ]);
            });
        } catch (Throwable $exception) {
            if (is_string($storedPath)) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }

        $batch = $log->batch()->firstOrFail();
        $qrCode = null;
        if ($batch->ngay_thu_hoach !== null && $batch->qr_code === null) {
            $qrCode = $qrCodes->generateForBatch((int) $batch->getKey());
        }

        return response()->json([
            'data' => $log,
            'qr_code' => $qrCode,
        ], 201);
    }
}
