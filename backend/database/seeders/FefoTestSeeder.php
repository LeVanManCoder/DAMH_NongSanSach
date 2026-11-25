<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Category;
use App\Models\FarmingLog;
use App\Models\Product;
use App\Models\Role;
use App\Models\Season;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FefoTestSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $category = Category::query()->firstOrCreate(
                ['slug' => 'rau-cu-tuoi-sach'],
                [
                    'ten_danh_muc' => 'Rau củ tươi sạch',
                    'mo_ta' => 'Rau củ canh tác an toàn.',
                    'is_active' => true,
                ],
            );

            $farmStaffRole = Role::query()->where('ten_vai_tro', 'farm_staff')->firstOrFail();
            $farmStaff = User::query()->where('role_id', $farmStaffRole->getKey())->firstOrFail();
            $season = Season::query()->first();

            $product = Product::query()->withTrashed()->updateOrCreate(
                ['slug' => 'ca-chua-huu-co-fefo-test'],
                [
                    'category_id' => $category->getKey(),
                    'ten_san_pham' => 'Cà chua hữu cơ FEFO Test',
                    'mo_ta' => 'Sản phẩm dùng kiểm thử xuất kho FEFO.',
                    'gia_ban_co_ban' => 45000,
                    'don_vi_tinh' => 'kg',
                    'is_active' => true,
                ],
            );

            if ($product->trashed()) {
                $product->restore();
            }

            $batches = [
                [
                    'ma_lo' => 'LO-FEFO-01',
                    'ngay_thu_hoach' => now()->subDays(2)->toDateString(),
                    'ngay_het_han' => now()->addDays(2)->toDateString(),
                    'so_luong_nhap' => 3,
                    'so_luong_ton' => 3,
                    'trang_thai' => 'con_hang',
                ],
                [
                    'ma_lo' => 'LO-FEFO-02',
                    'ngay_thu_hoach' => now()->subDay()->toDateString(),
                    'ngay_het_han' => now()->addDays(5)->toDateString(),
                    'so_luong_nhap' => 10,
                    'so_luong_ton' => 10,
                    'trang_thai' => 'con_hang',
                ],
                [
                    'ma_lo' => 'LO-FEFO-03',
                    'ngay_thu_hoach' => now()->subDays(3)->toDateString(),
                    'ngay_het_han' => now()->subDay()->toDateString(),
                    'so_luong_nhap' => 5,
                    'so_luong_ton' => 5,
                    'trang_thai' => 'het_han',
                ],
                [
                    'ma_lo' => 'LO-FEFO-04',
                    'ngay_thu_hoach' => now()->subDay()->toDateString(),
                    'ngay_het_han' => now()->addDays(4)->toDateString(),
                    'so_luong_nhap' => 10,
                    'so_luong_ton' => 0,
                    'trang_thai' => 'het_hang',
                ],
            ];

            foreach ($batches as $attributes) {
                $batch = Batch::query()->updateOrCreate(
                    ['ma_lo' => $attributes['ma_lo']],
                    [
                        ...$attributes,
                        'product_id' => $product->getKey(),
                        'season_id' => $season?->getKey(),
                        'so_luong_hao_hut' => 0,
                        'qr_code' => null,
                        'created_by' => $farmStaff->getKey(),
                    ],
                );

                if ($batch->ma_lo === 'LO-FEFO-01') {
                    FarmingLog::query()->updateOrCreate(
                        ['batch_id' => $batch->getKey(), 'hanh_dong' => 'cham_soc'],
                        [
                            'farm_staff_id' => $farmStaff->getKey(),
                            'ghi_chu' => 'Tưới nước sạch và kiểm tra sinh trưởng của cà chua.',
                            'thoi_gian' => now()->subDays(3),
                        ],
                    );
                    FarmingLog::query()->updateOrCreate(
                        ['batch_id' => $batch->getKey(), 'hanh_dong' => 'thu_hoach'],
                        [
                            'farm_staff_id' => $farmStaff->getKey(),
                            'ghi_chu' => 'Thu hoạch cà chua đạt độ chín và chuyển vào kho mát.',
                            'thoi_gian' => now()->subDays(2),
                        ],
                    );
                }
            }
        });
    }
}
