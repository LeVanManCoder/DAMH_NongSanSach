<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreComplaintRequest;
use App\Models\Complaint;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class ComplaintController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/orders/{id}/complaints",
     *     tags={"Khiếu nại"},
     *     summary="Gửi khiếu nại kèm ảnh minh chứng",
     *     description="Customer chỉ khiếu nại đơn của mình đã giao trong vòng 24 giờ; mỗi đơn chỉ gửi một khiếu nại.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID đơn hàng.", @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(
     *                 required={"ly_do","anh_minh_chung"},
     *
     *                 @OA\Property(property="ly_do", type="string", enum={"dap_nat","hu_hong","thieu_hang","sai_san_pham","khac"}),
     *                 @OA\Property(property="mo_ta", type="string", nullable=true, maxLength=2000),
     *                 @OA\Property(property="anh_minh_chung", type="string", format="binary")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Khiếu nại và ảnh minh chứng đã được ghi nhận."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Customer được gửi khiếu nại."),
     *     @OA\Response(response=404, description="Không tìm thấy đơn hàng thuộc tài khoản."),
     *     @OA\Response(response=409, description="Đơn hàng đã có khiếu nại."),
     *     @OA\Response(response=422, description="Đơn chưa giao, quá 24 giờ hoặc tệp minh chứng không hợp lệ.")
     * )
     */
    public function store(StoreComplaintRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $file = $request->file('anh_minh_chung');
        $path = null;

        try {
            $complaint = DB::transaction(function () use ($request, $validated, $file, $id, &$path): Complaint {
                $order = Order::query()
                    ->where('user_id', $request->user()->getKey())
                    ->lockForUpdate()
                    ->findOrFail($id);

                $deliveredAt = $order->ngay_giao_thuc_te;
                if (
                    $order->trang_thai !== 'da_giao'
                    || $deliveredAt === null
                    || $deliveredAt->isFuture()
                    || $deliveredAt->lt(now()->subHours(24))
                ) {
                    throw ValidationException::withMessages([
                        'order' => ['Chỉ có thể khiếu nại đơn đã giao trong vòng 24 giờ.'],
                    ]);
                }

                if ($order->complaint()->exists()) {
                    throw new HttpException(409, 'Đơn hàng này đã có khiếu nại.');
                }

                $path = $file->store('complaints', 'public');
                if ($path === false) {
                    throw new RuntimeException('Không thể lưu ảnh minh chứng.');
                }

                $complaint = Complaint::query()->create([
                    'order_id' => $order->getKey(),
                    'user_id' => $request->user()->getKey(),
                    'ly_do' => $validated['ly_do'],
                    'mo_ta' => $validated['mo_ta'] ?? null,
                    'trang_thai' => 'cho_xu_ly',
                ]);

                $complaint->media()->create([
                    'media_url' => $path,
                    'loai' => 'anh',
                    'mime_type' => $file->getMimeType(),
                    'kich_thuoc_byte' => $file->getSize(),
                ]);

                return $complaint->load('media');
            });
        } catch (Throwable $exception) {
            if (is_string($path)) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        return response()->json(['data' => $complaint], 201);
    }
}
