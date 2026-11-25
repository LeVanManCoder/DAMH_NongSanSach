<?php

namespace App\Services;

use App\Models\Batch;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrCodeService
{
    public function generateForBatch(int $batchId): string
    {
        $batch = Batch::query()->findOrFail($batchId);

        if ($batch->ngay_thu_hoach === null) {
            throw new InvalidArgumentException('Không thể tạo mã QR: lô hàng chưa có ngày thu hoạch.');
        }

        if (! $batch->farmingLogs()->exists()) {
            throw new InvalidArgumentException('Không thể tạo mã QR: lô hàng chưa có nhật ký canh tác.');
        }

        $qrCode = $batch->qr_code ?: (string) Str::uuid();
        $traceUrl = rtrim((string) config('app.url'), '/').'/api/trace/'.rawurlencode($qrCode);
        $path = 'qrcodes/batch-'.$batch->getKey().'.svg';
        $image = (string) QrCode::format('svg')
            ->size(300)
            ->margin(1)
            ->generate($traceUrl);

        if (! Storage::disk('public')->put($path, $image)) {
            throw new RuntimeException('Không thể lưu ảnh mã QR vào bộ nhớ công khai.');
        }

        $batch->qr_code = $qrCode;
        $batch->save();

        return $qrCode;
    }
}
