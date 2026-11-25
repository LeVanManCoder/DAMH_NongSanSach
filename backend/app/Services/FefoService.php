<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Batch;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FefoService
{
    /**
     * @return list<array{batch_id: int, so_luong: string}>
     */
    public function deduct(int $productId, int|float|string $quantity): array
    {
        $requestedUnits = $this->toMinorUnits($quantity);

        if ($requestedUnits <= 0) {
            throw new InvalidArgumentException('Số lượng cần xuất phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($productId, $requestedUnits): array {
            $query = Batch::query()
                ->where('product_id', $productId)
                ->where('trang_thai', 'con_hang')
                ->where('so_luong_ton', '>', 0);

            $driver = DB::connection()->getDriverName();
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                $query->whereRaw('ngay_het_han >= CURDATE()');
            } else {
                $query->whereDate('ngay_het_han', '>=', now()->toDateString());
            }

            $batches = $query
                ->orderBy('ngay_het_han')
                ->orderBy('ngay_thu_hoach')
                ->lockForUpdate()
                ->get();

            $availableUnits = $batches->sum(
                fn (Batch $batch): int => $this->toMinorUnits((string) $batch->so_luong_ton),
            );

            if ($availableUnits < $requestedUnits) {
                throw new InsufficientStockException;
            }

            $remainingUnits = $requestedUnits;
            $allocations = [];

            foreach ($batches as $batch) {
                if ($remainingUnits === 0) {
                    break;
                }

                $batchUnits = $this->toMinorUnits((string) $batch->so_luong_ton);
                $allocatedUnits = min($batchUnits, $remainingUnits);
                $remainingUnits -= $allocatedUnits;
                $batch->so_luong_ton = $this->fromMinorUnits($batchUnits - $allocatedUnits);

                if ($batchUnits === $allocatedUnits) {
                    $batch->trang_thai = 'het_hang';
                }

                $batch->save();
                $allocations[] = [
                    'batch_id' => (int) $batch->getKey(),
                    'so_luong' => $this->fromMinorUnits($allocatedUnits),
                ];
            }

            return $allocations;
        });
    }

    private function toMinorUnits(int|float|string $quantity): int
    {
        if (! is_numeric($quantity)) {
            throw new InvalidArgumentException('Số lượng phải là một giá trị số hợp lệ.');
        }

        $normalized = is_float($quantity)
            ? rtrim(rtrim(sprintf('%.8F', $quantity), '0'), '.')
            : (string) $quantity;

        if (preg_match('/^\d+(?:\.\d{1,2})?$/D', $normalized) !== 1) {
            throw new InvalidArgumentException('Số lượng chỉ được có tối đa hai chữ số thập phân.');
        }

        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    private function fromMinorUnits(int $units): string
    {
        return sprintf('%d.%02d', intdiv($units, 100), $units % 100);
    }
}
