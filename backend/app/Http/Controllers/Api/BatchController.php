<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RecordBatchWasteRequest;
use App\Http\Requests\StoreBatchRequest;
use App\Http\Requests\UpdateBatchRequest;
use App\Models\Batch;
use App\Models\WasteLog;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BatchController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/batches",
     *     tags={"Quản lý lô hàng"},
     *     summary="Danh sách lô hàng",
     *     description="Trả danh sách phân trang; có thể lọc theo sản phẩm và trạng thái. Farm Staff, Sales và Admin được xem.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="product_id", in="query", required=false, description="Lọc theo mã sản phẩm.", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="trang_thai", in="query", required=false, description="Lọc theo trạng thái lô.", @OA\Schema(type="string", enum={"dang_canh_tac","da_thu_hoach","con_hang","het_hang","het_han"})),
     *     @OA\Parameter(name="per_page", in="query", required=false, description="Số bản ghi mỗi trang (1-100).", @OA\Schema(type="integer", minimum=1, maximum=100, default=20)),
     *
     *     @OA\Response(response=200, description="Danh sách lô hàng."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Vai trò không được phép xem danh sách lô.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'product_id' => ['sometimes', 'integer', 'exists:products,id'],
            'trang_thai' => ['sometimes', Rule::in(['dang_canh_tac', 'da_thu_hoach', 'con_hang', 'het_hang', 'het_han'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $batches = Batch::query()
            ->with([
                'product:id,ten_san_pham,slug,don_vi_tinh',
                'farmingLogs' => fn ($query) => $query->orderBy('thoi_gian'),
            ])
            ->when(isset($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(isset($filters['trang_thai']), fn ($query) => $query->where('trang_thai', $filters['trang_thai']))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($batches);
    }

    /**
     * @OA\Get(
     *     path="/api/batches/{id}",
     *     tags={"Quản lý lô hàng"},
     *     summary="Chi tiết lô hàng và nhật ký canh tác",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID lô hàng.", @OA\Schema(type="integer")),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Thông tin lô, sản phẩm, mùa vụ và nhật ký canh tác.",
     *
     *         @OA\JsonContent(@OA\Property(property="data", type="object"))
     *     ),
     *
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Vai trò không được phép xem chi tiết lô."),
     *     @OA\Response(response=404, description="Không tìm thấy lô hàng.")
     * )
     */
    public function show(int $id): JsonResponse
    {
        $batch = Batch::query()
            ->with([
                'product',
                'season',
                'farmingLogs' => fn ($query) => $query->orderBy('thoi_gian'),
            ])
            ->findOrFail($id);

        return response()->json(['data' => $batch]);
    }

    /**
     * @OA\Post(
     *     path="/api/batches",
     *     tags={"Quản lý lô hàng"},
     *     summary="Tạo lô hàng",
     *     description="Chỉ Farm Staff được tạo lô hàng.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"product_id","so_luong_nhap"},
     *
     *             @OA\Property(property="ma_lo", type="string", example="LO-2026-001"),
     *             @OA\Property(property="product_id", type="integer", example=1),
     *             @OA\Property(property="season_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="ngay_thu_hoach", type="string", format="date", nullable=true, example="2026-11-24"),
     *             @OA\Property(property="ngay_het_han", type="string", format="date", nullable=true, example="2026-11-30"),
     *             @OA\Property(property="so_luong_nhap", type="number", format="float", example=20),
     *             @OA\Property(property="so_luong_ton", type="number", format="float", example=20),
     *             @OA\Property(property="trang_thai", type="string", enum={"dang_canh_tac","da_thu_hoach","con_hang","het_hang","het_han"}, example="con_hang")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Lô hàng đã được tạo."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được tạo lô."),
     *     @OA\Response(response=422, description="Dữ liệu lô hàng không hợp lệ.")
     * )
     */
    public function store(StoreBatchRequest $request): JsonResponse
    {
        $data = $request->validated();
        $status = $data['trang_thai'] ?? 'dang_canh_tac';
        $received = $data['so_luong_nhap'];

        $batch = Batch::query()->create([
            ...$data,
            'ma_lo' => $data['ma_lo'] ?? 'LO-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4)),
            'so_luong_ton' => $data['so_luong_ton'] ?? ($status === 'dang_canh_tac' ? 0 : $received),
            'so_luong_hao_hut' => $data['so_luong_hao_hut'] ?? 0,
            'trang_thai' => $status,
            'created_by' => $request->user()->getKey(),
        ]);

        return response()->json(['data' => $batch->load('product', 'season')], 201);
    }

    /**
     * @OA\Put(
     *     path="/api/batches/{id}",
     *     tags={"Quản lý lô hàng"},
     *     summary="Cập nhật thông tin lô hàng",
     *     description="Chỉ Farm Staff được cập nhật thông tin lô; số lượng tồn và số lượng nhập không thể sửa qua endpoint này.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="ma_lo", type="string", example="LO-2026-001"),
     *             @OA\Property(property="ngay_thu_hoach", type="string", format="date", nullable=true),
     *             @OA\Property(property="ngay_het_han", type="string", format="date", nullable=true),
     *             @OA\Property(property="trang_thai", type="string", enum={"dang_canh_tac","da_thu_hoach","con_hang","het_hang","het_han"})
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Thông tin lô đã được cập nhật."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được cập nhật lô."),
     *     @OA\Response(response=404, description="Không tìm thấy lô hàng."),
     *     @OA\Response(response=422, description="Dữ liệu cập nhật không hợp lệ.")
     * )
     */
    public function update(UpdateBatchRequest $request, int $id): JsonResponse
    {
        $batch = Batch::query()->findOrFail($id);
        $batch->fill($request->validated());
        $batch->save();

        return response()->json(['data' => $batch->load('product', 'season')]);
    }

    /**
     * @OA\Delete(
     *     path="/api/batches/{id}",
     *     tags={"Quản lý lô hàng"},
     *     summary="Xóa lô chưa phát sinh giao dịch",
     *     description="Chỉ xóa được lô chưa có giao dịch, nhật ký canh tác hoặc nhật ký xuất hủy.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=204, description="Đã xóa lô hàng."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được xóa lô."),
     *     @OA\Response(response=404, description="Không tìm thấy lô hàng."),
     *     @OA\Response(response=409, description="Lô hàng đã có dữ liệu phụ thuộc nên không thể xóa.")
     * )
     */
    public function destroy(int $id): JsonResponse
    {
        $batch = Batch::query()->findOrFail($id);

        if ($batch->orderDetails()->exists()) {
            throw new HttpException(409, 'Không thể xóa lô hàng đã phát sinh giao dịch.');
        }

        if ($batch->farmingLogs()->exists() || $batch->wasteLogs()->exists()) {
            throw new HttpException(409, 'Không thể xóa lô hàng đã có nhật ký canh tác hoặc xuất hủy.');
        }

        $batch->delete();

        return response()->json(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/api/batches/{id}/generate-qr",
     *     tags={"Quản lý lô hàng"},
     *     summary="Tạo mã QR truy xuất nguồn gốc",
     *     description="Sinh mã QR sau thu hoạch khi lô đã có nhật ký canh tác. Chỉ Farm Staff được sử dụng.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Mã QR và URL ảnh QR.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="qr_code", type="string"),
     *                 @OA\Property(property="image_url", type="string", format="uri")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được tạo mã QR."),
     *     @OA\Response(response=404, description="Không tìm thấy lô hàng."),
     *     @OA\Response(response=422, description="Lô chưa thu hoạch hoặc chưa có nhật ký canh tác.")
     * )
     */
    public function generateQr(int $id, QrCodeService $qrCodes): JsonResponse
    {
        try {
            $qrCode = $qrCodes->generateForBatch($id);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['batch' => [$exception->getMessage()]]);
        }

        return response()->json([
            'data' => [
                'qr_code' => $qrCode,
                'image_url' => Storage::disk('public')->url('qrcodes/batch-'.$id.'.svg'),
            ],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/batches/{id}/waste",
     *     tags={"Quản lý lô hàng"},
     *     summary="Ghi nhận xuất hủy hoặc hao hụt",
     *     description="Ghi nhận lượng hủy, cập nhật tồn kho và nhật ký hao hụt trong một giao dịch. Chỉ Farm Staff được sử dụng.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"so_luong","ly_do"},
     *
     *             @OA\Property(property="so_luong", type="number", format="float", example=1.5),
     *             @OA\Property(property="ly_do", type="string", maxLength=255, example="Dập nát trong quá trình phân loại")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Đã ghi nhận xuất hủy."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được ghi nhận xuất hủy."),
     *     @OA\Response(response=404, description="Không tìm thấy lô hàng."),
     *     @OA\Response(response=422, description="Số lượng xuất hủy không hợp lệ hoặc vượt tồn kho.")
     * )
     */
    public function waste(RecordBatchWasteRequest $request, int $id): JsonResponse
    {
        $wasteLog = DB::transaction(function () use ($request, $id): WasteLog {
            $batch = Batch::query()->lockForUpdate()->findOrFail($id);
            $requestedUnits = (int) round((float) $request->validated('so_luong') * 100);
            $stockUnits = (int) round((float) $batch->so_luong_ton * 100);

            if ($batch->trang_thai !== 'con_hang' || $stockUnits <= 0) {
                throw ValidationException::withMessages([
                    'batch' => ['Chỉ lô còn hàng mới được ghi nhận xuất hủy.'],
                ]);
            }

            if ($requestedUnits > $stockUnits) {
                throw ValidationException::withMessages([
                    'so_luong' => ['Số lượng xuất hủy vượt quá tồn kho hiện tại.'],
                ]);
            }

            $remainingUnits = $stockUnits - $requestedUnits;
            $wasteUnits = (int) round((float) $batch->so_luong_hao_hut * 100) + $requestedUnits;
            $batch->so_luong_ton = sprintf('%d.%02d', intdiv($remainingUnits, 100), $remainingUnits % 100);
            $batch->so_luong_hao_hut = sprintf('%d.%02d', intdiv($wasteUnits, 100), $wasteUnits % 100);

            if ($remainingUnits === 0) {
                $batch->trang_thai = 'het_hang';
            }

            $batch->save();

            return WasteLog::query()->create([
                'batch_id' => $batch->getKey(),
                'farm_staff_id' => $request->user()->getKey(),
                'so_luong' => $request->validated('so_luong'),
                'ly_do' => $request->validated('ly_do'),
            ]);
        });

        return response()->json(['data' => $wasteLog], 201);
    }
}
