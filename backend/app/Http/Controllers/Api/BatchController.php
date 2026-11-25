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
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'product_id' => ['sometimes', 'integer', 'exists:products,id'],
            'trang_thai' => ['sometimes', Rule::in(['dang_canh_tac', 'da_thu_hoach', 'con_hang', 'het_hang', 'het_han'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $batches = Batch::query()
            ->with('product:id,ten_san_pham,slug,don_vi_tinh')
            ->when(isset($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(isset($filters['trang_thai']), fn ($query) => $query->where('trang_thai', $filters['trang_thai']))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($batches);
    }

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

    public function store(StoreBatchRequest $request): JsonResponse
    {
        $data = $request->validated();
        $status = $data['trang_thai'] ?? 'dang_canh_tac';
        $received = $data['so_luong_nhap'];

        $batch = Batch::query()->create([
            ...$data,
            'so_luong_ton' => $data['so_luong_ton'] ?? ($status === 'dang_canh_tac' ? 0 : $received),
            'so_luong_hao_hut' => $data['so_luong_hao_hut'] ?? 0,
            'trang_thai' => $status,
            'created_by' => $request->user()->getKey(),
        ]);

        return response()->json(['data' => $batch->load('product', 'season')], 201);
    }

    public function update(UpdateBatchRequest $request, int $id): JsonResponse
    {
        $batch = Batch::query()->findOrFail($id);
        $batch->fill($request->validated());
        $batch->save();

        return response()->json(['data' => $batch->load('product', 'season')]);
    }

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
