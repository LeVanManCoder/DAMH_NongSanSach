<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Category;
use App\Models\FarmingLog;
use App\Models\Product;
use App\Models\Role;
use App\Models\Season;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roleDescriptions = [
            'customer' => 'Khách hàng',
            'farm_staff' => 'Nhân viên nông trại',
            'sales' => 'Nhân viên bán hàng',
            'admin' => 'Quản trị viên',
        ];

        foreach ($roleDescriptions as $name => $description) {
            Role::query()->updateOrCreate(
                ['ten_vai_tro' => $name],
                ['mo_ta' => $description],
            );
        }

        $roles = Role::query()->get()->keyBy('ten_vai_tro');
        $accounts = [
            'customer' => ['Khách hàng mẫu', 'khachhang@nonganhlanh.local'],
            'farm_staff' => ['Nhân viên nông trại mẫu', 'nhanvien@nonganhlanh.local'],
            'sales' => ['Nhân viên bán hàng mẫu', 'banhang@nonganhlanh.local'],
            'admin' => ['Quản trị viên mẫu', 'admin@nonganhlanh.local'],
        ];

        $users = [];
        foreach ($accounts as $roleName => [$name, $email]) {
            $user = User::withTrashed()->firstOrNew(['email' => $email]);
            $user->forceFill([
                'ho_ten' => $name,
                'email' => $email,
                'password' => Hash::make('Password@123'),
                'role_id' => $roles[$roleName]->getKey(),
                'is_active' => true,
                'so_lan_dang_nhap_sai' => 0,
                'khoa_den' => null,
            ]);
            $user->save();
            if ($user->trashed()) {
                $user->restore();
            }
            $users[$roleName] = $user;
        }

        $categoryNames = [
            'rau-cu-tuoi-sach' => 'Rau củ tươi sạch',
            'trai-cay-ngon-ngot' => 'Trái cây ngon ngọt',
            'gao-ngu-coc' => 'Gạo & ngũ cốc',
            'dac-san' => 'Đặc sản',
        ];
        $categories = [];
        foreach ($categoryNames as $slug => $name) {
            $categories[$slug] = Category::query()->updateOrCreate(
                ['slug' => $slug],
                ['ten_danh_muc' => $name, 'mo_ta' => $name, 'is_active' => true],
            );
        }

        $season = Season::query()->updateOrCreate(
            ['ten_mua_vu' => 'Vụ rau an toàn tháng hiện tại'],
            [
                'khu_vuc_canh_tac' => 'Đà Lạt, Lâm Đồng',
                'ngay_bat_dau' => now()->subDays(30)->toDateString(),
                'ngay_ket_thuc_du_kien' => now()->addDays(30)->toDateString(),
                'trang_thai' => 'da_thu_hoach',
                'created_by' => $users['farm_staff']->getKey(),
            ],
        );

        $products = [
            ['rau-cu-tuoi-sach', 'Cà chua bi hữu cơ', 'ca-chua-bi-huu-co', 45000, 'kg'],
            ['rau-cu-tuoi-sach', 'Cải bó xôi Đà Lạt', 'cai-bo-xoi-da-lat', 38000, 'bó'],
            ['trai-cay-ngon-ngot', 'Xoài cát Hòa Lộc', 'xoai-cat-hoa-loc', 68000, 'kg'],
            ['trai-cay-ngon-ngot', 'Cam sành mọng nước', 'cam-sanh-mong-nuoc', 42000, 'kg'],
            ['gao-ngu-coc', 'Gạo ST25 thơm ngon', 'gao-st25-thom-ngon', 38000, 'kg'],
            ['gao-ngu-coc', 'Gạo lứt đỏ nguyên cám', 'gao-lut-do-nguyen-cam', 32000, 'kg'],
            ['dac-san', 'Mật ong hoa cà phê', 'mat-ong-hoa-ca-phe', 185000, 'chai'],
            ['dac-san', 'Hạt điều rang mộc Bình Phước', 'hat-dieu-rang-moc-binh-phuoc', 165000, 'kg'],
        ];

        SubscriptionPlan::query()->updateOrCreate(
            ['ten_goi' => 'Giỏ nông sản xanh mỗi tuần'],
            [
                'mo_ta' => 'Giao nông sản theo lịch mỗi tuần, thanh toán theo chu kỳ.',
                'chu_ky_ngay' => 30,
                'is_active' => true,
            ],
        );

        foreach ($products as [$categorySlug, $name, $slug, $price, $unit]) {
            $product = Product::query()->withTrashed()->updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $categories[$categorySlug]->getKey(),
                    'ten_san_pham' => $name,
                    'mo_ta' => $name.' được tuyển chọn từ nông trại canh tác an toàn.',
                    'gia_ban_co_ban' => $price,
                    'don_vi_tinh' => $unit,
                    'is_active' => true,
                ],
            );
            if ($product->trashed()) {
                $product->restore();
            }

            foreach ([1, 14] as $index => $daysUntilExpiry) {
                $expiryDate = now()->addDays($daysUntilExpiry)->toDateString();
                $harvestDate = now()->subDays(10 - $index)->toDateString();
                $batchCode = strtoupper(substr($slug, 0, 8)).'-'.now()->format('ymd').'-'.($index + 1);
                $batch = Batch::query()->updateOrCreate(
                    ['ma_lo' => $batchCode],
                    [
                        'product_id' => $product->getKey(),
                        'season_id' => $season->getKey(),
                        'ngay_thu_hoach' => $harvestDate,
                        'ngay_het_han' => $expiryDate,
                        'so_luong_nhap' => 100,
                        'so_luong_ton' => $index === 0 ? 24 : 70,
                        'so_luong_hao_hut' => 0,
                        'qr_code' => 'NONG-LANH-'.$batchCode,
                        'trang_thai' => 'con_hang',
                        'created_by' => $users['farm_staff']->getKey(),
                    ],
                );

                FarmingLog::query()->updateOrCreate(
                    ['batch_id' => $batch->getKey(), 'hanh_dong' => 'cham_soc'],
                    [
                        'farm_staff_id' => $users['farm_staff']->getKey(),
                        'ghi_chu' => 'Theo dõi sinh trưởng, tưới nước sạch và chăm sóc theo quy trình an toàn.',
                        'thoi_gian' => now()->subDays(2 - $index),
                    ],
                );
                FarmingLog::query()->updateOrCreate(
                    ['batch_id' => $batch->getKey(), 'hanh_dong' => 'thu_hoach'],
                    [
                        'farm_staff_id' => $users['farm_staff']->getKey(),
                        'ghi_chu' => 'Thu hoạch đúng độ chín, phân loại và đóng gói tại nông trại.',
                        'thoi_gian' => $harvestDate.' 08:00:00',
                    ],
                );
            }
        }
    }
}
