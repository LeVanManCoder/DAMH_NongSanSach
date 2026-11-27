<?php

namespace Tests\Feature;

use App\Exceptions\InsufficientStockException;
use App\Models\Batch;
use App\Models\Product;
use App\Services\FefoService;
use App\Services\QrCodeService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FefoAndQrServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
    }

    public function test_it_deducts_stock_by_expiry_and_ignores_expired_or_empty_batches(): void
    {
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $firstBatch = Batch::query()->where('ma_lo', 'LO-FEFO-01')->firstOrFail();
        $secondBatch = Batch::query()->where('ma_lo', 'LO-FEFO-02')->firstOrFail();
        $expiredBatch = Batch::query()->where('ma_lo', 'LO-FEFO-03')->firstOrFail();
        $emptyBatch = Batch::query()->where('ma_lo', 'LO-FEFO-04')->firstOrFail();

        $allocations = app(FefoService::class)->deduct((int) $product->getKey(), '10.00');

        $this->assertSame([
            ['batch_id' => $firstBatch->getKey(), 'so_luong' => '3.00'],
            ['batch_id' => $secondBatch->getKey(), 'so_luong' => '7.00'],
        ], $allocations);

        $this->assertSame('0.00', $firstBatch->refresh()->so_luong_ton);
        $this->assertSame('het_hang', $firstBatch->trang_thai);
        $this->assertSame('3.00', $secondBatch->refresh()->so_luong_ton);
        $this->assertSame('5.00', $expiredBatch->refresh()->so_luong_ton);
        $this->assertSame('het_han', $expiredBatch->trang_thai);
        $this->assertSame('0.00', $emptyBatch->refresh()->so_luong_ton);
        $this->assertSame('het_hang', $emptyBatch->trang_thai);
    }

    public function test_insufficient_stock_throws_and_rolls_back_all_batch_quantities(): void
    {
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $availableBatches = Batch::query()
            ->whereIn('ma_lo', ['LO-FEFO-01', 'LO-FEFO-02'])
            ->orderBy('ma_lo')
            ->get();

        try {
            app(FefoService::class)->deduct((int) $product->getKey(), '15.00');
            $this->fail('Expected an insufficient stock exception.');
        } catch (InsufficientStockException $exception) {
            $this->assertSame('Số lượng tồn kho không đủ', $exception->getMessage());
        }

        $this->assertSame('3.00', $availableBatches[0]->refresh()->so_luong_ton);
        $this->assertSame('10.00', $availableBatches[1]->refresh()->so_luong_ton);
        $this->assertSame('con_hang', $availableBatches[0]->trang_thai);
        $this->assertSame('con_hang', $availableBatches[1]->trang_thai);
    }

    public function test_it_generates_qr_image_and_public_trace_link_for_a_valid_batch(): void
    {
        Storage::fake('public');

        $batch = Batch::query()->where('ma_lo', 'LO-FEFO-01')->firstOrFail();
        $qrCode = app(QrCodeService::class)->generateForBatch((int) $batch->getKey());
        $imagePath = 'qrcodes/batch-'.$batch->getKey().'.svg';

        $this->assertDatabaseHas('batches', [
            'id' => $batch->getKey(),
            'qr_code' => $qrCode,
        ]);
        Storage::disk('public')->assertExists($imagePath);
        $this->assertStringContainsString('<svg', Storage::disk('public')->get($imagePath));

        $this->getJson('/api/trace/'.$qrCode)
            ->assertOk()
            ->assertJsonPath('data.ma_lo', 'LO-FEFO-01')
            ->assertJsonPath('data.product.ten_san_pham', 'Cà chua hữu cơ FEFO Test')
            ->assertJsonCount(2, 'data.farming_logs');
    }

    public function test_it_rejects_qr_generation_for_unharvested_batches_or_batches_without_logs(): void
    {
        $unharvestedBatch = Batch::query()->where('ma_lo', 'LO-FEFO-04')->firstOrFail();
        $unharvestedBatch->update([
            'trang_thai' => 'dang_canh_tac',
            'ngay_thu_hoach' => null,
            'ngay_het_han' => null,
        ]);

        try {
            app(QrCodeService::class)->generateForBatch((int) $unharvestedBatch->getKey());
            $this->fail('Expected an exception for an unharvested batch.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame(
                'Không thể tạo mã QR: lô hàng chưa có ngày thu hoạch.',
                $exception->getMessage(),
            );
        }

        $batchWithoutLogs = Batch::query()->where('ma_lo', 'LO-FEFO-02')->firstOrFail();

        try {
            app(QrCodeService::class)->generateForBatch((int) $batchWithoutLogs->getKey());
            $this->fail('Expected an exception for a batch without farming logs.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame(
                'Không thể tạo mã QR: lô hàng chưa có nhật ký canh tác.',
                $exception->getMessage(),
            );
        }
    }
}
