<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreComplaintRequest;
use App\Http\Requests\UpdateComplaintRequest;
use App\Models\Complaint;
use App\Models\Order;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class ComplaintController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/complaints",
     *     tags={"Khiếu nại"},
     *     summary="Danh sách khiếu nại cho Sales và Admin",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách phân trang kèm đơn hàng, khách hàng và ảnh minh chứng."),
     *     @OA\Response(response=403, description="Không đủ quyền xem khiếu nại.")
     * )
     */
    public function index(ImageStorageService $images): JsonResponse
    {
        $complaints = Complaint::query()
            ->with([
                'order:id,ma_don,user_id,trang_thai,tong_thanh_toan,ngay_giao_thuc_te',
                'user:id,ho_ten,email',
                'handler:id,ho_ten',
                'media',
            ])
            ->latest('created_at')
            ->paginate(20);

        $complaints->getCollection()->each(function (Complaint $complaint) use ($images): void {
            $complaint->media->each(function ($media) use ($images): void {
                $media->setAttribute('public_url', $images->publicUrl($media->media_url));
            });
        });

        return response()->json($complaints);
    }

    /**
     * @OA\Put(
     *     path="/api/complaints/{id}",
     *     tags={"Khiếu nại"},
     *     summary="Sales chấp nhận hoặc từ chối khiếu nại",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"trang_thai","phan_hoi"},
     *
     *         @OA\Property(property="trang_thai", type="string", enum={"chap_nhan","tu_choi"}),
     *         @OA\Property(property="phan_hoi", type="string", maxLength=2000)
     *     )),
     *
     *     @OA\Response(response=200, description="Khiếu nại đã được xử lý."),
     *     @OA\Response(response=403, description="Chỉ Sales được xử lý khiếu nại."),
     *     @OA\Response(response=404, description="Không tìm thấy khiếu nại."),
     *     @OA\Response(response=422, description="Dữ liệu không hợp lệ hoặc khiếu nại đã được xử lý.")
     * )
     */
    public function update(
        UpdateComplaintRequest $request,
        int $id,
        ImageStorageService $images,
    ): JsonResponse {
        $validated = $request->validated();

        $complaint = DB::transaction(function () use ($request, $validated, $id): Complaint {
            $complaint = Complaint::query()->lockForUpdate()->findOrFail($id);
            if ($complaint->trang_thai !== 'cho_xu_ly') {
                throw ValidationException::withMessages([
                    'trang_thai' => ['Khiếu nại này đã được xử lý trước đó.'],
                ]);
            }

            $complaint->forceFill([
                'trang_thai' => $validated['trang_thai'],
                'phan_hoi' => $validated['phan_hoi'],
                'ly_do_tu_choi' => $validated['trang_thai'] === 'tu_choi'
                    ? $validated['phan_hoi']
                    : null,
                'nguoi_xu_ly_id' => $request->user()->getKey(),
                'xu_ly_luc' => now(),
            ])->save();

            return $complaint->load([
                'order:id,ma_don,user_id,trang_thai,tong_thanh_toan,ngay_giao_thuc_te',
                'user:id,ho_ten,email',
                'handler:id,ho_ten',
                'media',
            ]);
        });

        $complaint->media->each(function ($media) use ($images): void {
            $media->setAttribute('public_url', $images->publicUrl($media->media_url));
        });

        return response()->json(['data' => $complaint]);
    }

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
    public function store(
        StoreComplaintRequest $request,
        int $id,
        ImageStorageService $images,
    ): JsonResponse {
        $validated = $request->validated();
        $file = $request->file('anh_minh_chung');
        $path = null;

        try {
            $complaint = DB::transaction(function () use ($request, $validated, $file, $id, $images, &$path): Complaint {
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

                $storedLocation = $images->store($file, 'nong-lanh/complaints');
                $path = $images->storagePath($storedLocation) ?? $storedLocation;

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
                $images->delete($path);
            }

            throw $exception;
        }

        return response()->json(['data' => $complaint], 201);
    }
}
