<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Category;
use App\Models\Complaint;
use App\Models\ComplaintMedia;
use App\Models\FarmingLog;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\Role;
use App\Models\Season;
use App\Models\Subscription;
use App\Models\SubscriptionDeliveryDay;
use App\Models\SubscriptionItem;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WasteLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    private const DEMO_PASSWORD = '12345678';

    public function run(): void
    {
        DB::transaction(function (): void {
            $roles = $this->seedRoles();
            $users = $this->seedUsers($roles);
            $categories = $this->seedCategories();
            $seasons = $this->seedSeasons($users['farm_staff']);
            $products = $this->seedProducts($categories);
            $addresses = $this->seedAddresses($users);
            $batches = $this->seedBatches($products, $seasons, $users['farm_staff']);

            $this->seedWasteLogs($batches, $users['farm_staff']);
            $plans = $this->seedSubscriptionPlans();
            $this->seedSubscriptions($users['customer'], $addresses, $plans, $products);
            $orders = $this->seedOrders($users, $addresses, $products, $batches);
            $this->seedComplaints($orders);
            $this->seedReviews($orders);
            $this->seedAuditLogs($users, $orders, $batches);
        });
    }

    private function seedRoles(): array
    {
        $descriptions = [
            'customer' => 'Khách hàng',
            'farm_staff' => 'Nhân viên nông trại',
            'sales' => 'Nhân viên bán hàng',
            'admin' => 'Quản trị viên',
        ];

        foreach ($descriptions as $name => $description) {
            Role::query()->updateOrCreate(
                ['ten_vai_tro' => $name],
                ['mo_ta' => $description],
            );
        }

        return Role::query()->get()->keyBy('ten_vai_tro')->all();
    }

    private function seedUsers(array $roles): array
    {
        $accounts = [
            'customer' => ['Nguyễn Thị Mai', 'khach@nonglanh.vn', '0901234567', 'customer'],
            'farm_staff' => ['Trần Văn Nông', 'nongtrai@nonglanh.vn', '0901234568', 'farm_staff'],
            'sales' => ['Lê Thị Hạnh', 'banhang@nonglanh.vn', '0901234569', 'sales'],
            'admin' => ['Phạm Minh An', 'admin@nonglanh.vn', '0901234570', 'admin'],
            'customer_2' => ['Nguyễn Văn Bình', 'khach2@nonglanh.vn', '0901234571', 'customer'],
            'customer_3' => ['Trần Thị Lan', 'khach3@nonglanh.vn', '0901234572', 'customer'],
        ];

        $users = [];
        foreach ($accounts as $key => [$name, $email, $phone, $roleName]) {
            $user = User::withTrashed()->firstOrNew(['email' => $email]);
            $user->forceFill([
                'ho_ten' => $name,
                'email' => $email,
                'so_dien_thoai' => $phone,
                'password' => Hash::make(self::DEMO_PASSWORD),
                'role_id' => $roles[$roleName]->getKey(),
                'is_active' => true,
                'so_lan_dang_nhap_sai' => 0,
                'khoa_den' => null,
            ]);
            $user->save();
            if ($user->trashed()) {
                $user->restore();
            }
            $users[$key] = $user;
        }

        $users['customers'] = [
            $users['customer'],
            $users['customer_2'],
            $users['customer_3'],
        ];

        return $users;
    }

    private function seedCategories(): array
    {
        $definitions = [
            'rau-cu-tuoi-sach' => 'Rau củ tươi sạch',
            'trai-cay-ngon-ngot' => 'Trái cây ngon ngọt',
            'gao-ngu-coc' => 'Gạo & ngũ cốc',
            'dac-san' => 'Đặc sản nông sản',
            'rau-gia-vi' => 'Rau gia vị & thảo mộc',
        ];

        $categories = [];
        foreach ($definitions as $slug => $name) {
            $categories[$slug] = Category::query()->updateOrCreate(
                ['slug' => $slug],
                ['ten_danh_muc' => $name, 'mo_ta' => $name.' được tuyển chọn từ vùng trồng an toàn.', 'is_active' => true],
            );
        }

        return $categories;
    }

    private function seedSeasons(User $farmStaff): array
    {
        $definitions = [
            ['Vụ Xuân Hè 2026', 'Đà Lạt, Lâm Đồng', -35, 55, 'dang_canh_tac'],
            ['Vụ Hè Thu 2026', 'Củ Chi, TP. Hồ Chí Minh', -110, -20, 'da_thu_hoach'],
            ['Vụ Đông Xuân 2026', 'Tiền Giang', -210, -120, 'ket_thuc'],
            ['Vụ rau an toàn tháng hiện tại', 'Đơn Dương, Lâm Đồng', -14, 45, 'dang_canh_tac'],
        ];

        $seasons = [];
        foreach ($definitions as [$name, $region, $startOffset, $endOffset, $status]) {
            $seasons[] = Season::query()->updateOrCreate(
                ['ten_mua_vu' => $name],
                [
                    'khu_vuc_canh_tac' => $region,
                    'ngay_bat_dau' => now()->addDays($startOffset)->toDateString(),
                    'ngay_ket_thuc_du_kien' => now()->addDays($endOffset)->toDateString(),
                    'trang_thai' => $status,
                    'created_by' => $farmStaff->getKey(),
                ],
            );
        }

        return $seasons;
    }

    private function seedProducts(array $categories): array
    {
        $definitions = [
            ['rau-cu-tuoi-sach', 'Cà chua bi hữu cơ', 'ca-chua-bi-huu-co', 45000, 'kg', 'photo-1566385101042-1a0aa0c1268c'],
            ['rau-cu-tuoi-sach', 'Cải bó xôi Đà Lạt', 'cai-bo-xoi-da-lat', 38000, 'bó', 'photo-1576045057995-568f588f82fb'],
            ['rau-cu-tuoi-sach', 'Cà rốt Đà Lạt', 'ca-rot-da-lat', 32000, 'kg', 'photo-1598170845058-32b9d6a5da37'],
            ['trai-cay-ngon-ngot', 'Xoài cát Hòa Lộc', 'xoai-cat-hoa-loc', 68000, 'kg', 'photo-1553279768-865429fa0078'],
            ['trai-cay-ngon-ngot', 'Cam sành mọng nước', 'cam-sanh-mong-nuoc', 42000, 'kg', 'photo-1547514701-42782101795e'],
            ['trai-cay-ngon-ngot', 'Táo Fuji giòn ngọt', 'tao-fuji-gion-ngot', 59000, 'kg', 'photo-1560806887-1e4cd0b6cbd6'],
            ['gao-ngu-coc', 'Gạo ST25 thơm ngon', 'gao-st25-thom-ngon', 38000, 'kg', 'photo-1586201375761-83865001e31c'],
            ['gao-ngu-coc', 'Gạo lứt đỏ nguyên cám', 'gao-lut-do-nguyen-cam', 32000, 'kg', 'photo-1540420773420-3366772f4999'],
            ['gao-ngu-coc', 'Gạo nếp cái hoa vàng', 'gao-nep-cai-hoa-vang', 35000, 'kg', 'photo-1518977676601-b53f82aba655'],
            ['dac-san', 'Mật ong hoa cà phê', 'mat-ong-hoa-ca-phe', 185000, 'chai', 'photo-1587049352851-8d4e89133924'],
            ['dac-san', 'Hạt điều rang mộc Bình Phước', 'hat-dieu-rang-moc-binh-phuoc', 165000, 'kg', 'photo-1518843875459-f738682238a6'],
            ['dac-san', 'Nho xanh Ninh Thuận', 'nho-xanh-ninh-thuan', 76000, 'kg', 'photo-1537640538966-79f369143f8f'],
            ['rau-gia-vi', 'Rau húng quế hữu cơ', 'rau-hung-que-huu-co', 18000, 'bó', 'photo-1597362925123-77861d3fbac7'],
            ['rau-gia-vi', 'Ngò rí tươi', 'ngo-ri-tuoi', 15000, 'bó', 'photo-1506976785307-8732e854ad03'],
            ['rau-gia-vi', 'Hành lá sạch', 'hanh-la-sach', 16000, 'bó', 'photo-1518977676601-b53f82aba655'],
        ];

        $products = [];
        foreach ($definitions as [$categorySlug, $name, $slug, $price, $unit, $photo]) {
            $product = Product::query()->withTrashed()->updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $categories[$categorySlug]->getKey(),
                    'ten_san_pham' => $name,
                    'mo_ta' => $name.' được canh tác và tuyển chọn kỹ lưỡng, truy xuất được nguồn gốc từng lô.',
                    'hinh_anh_dai_dien' => 'https://images.unsplash.com/'.$photo.'?auto=format&fit=crop&w=800&q=85',
                    'gia_ban_co_ban' => $price,
                    'don_vi_tinh' => $unit,
                    'is_active' => true,
                ],
            );
            if ($product->trashed()) {
                $product->restore();
            }
            $products[] = $product;
        }

        return $products;
    }

    private function seedAddresses(array $users): array
    {
        $definitions = [
            ['customer', 'Nhà riêng - Nguyễn Thị Mai', '12 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh', '0901234567', 10.7901, 106.6942, true],
            ['customer', 'Văn phòng - Nguyễn Thị Mai', '25 Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh', '0901234567', 10.7348, 106.7212, false],
            ['customer_2', 'Nhà riêng - Nguyễn Văn Bình', '88 Lê Văn Sỹ, Phường 13, Quận 3, TP. Hồ Chí Minh', '0901234571', 10.7863, 106.6818, true],
            ['customer_3', 'Nhà riêng - Trần Thị Lan', '36 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP. Hồ Chí Minh', '0901234572', 10.7998, 106.6813, true],
        ];

        $addresses = [];
        foreach ($definitions as [$userKey, $recipient, $address, $phone, $latitude, $longitude, $isDefault]) {
            $addresses[$userKey][] = Address::query()->updateOrCreate(
                ['user_id' => $users[$userKey]->getKey(), 'dia_chi' => $address],
                [
                    'ten_nguoi_nhan' => $recipient,
                    'so_dien_thoai' => $phone,
                    'vi_do' => $latitude,
                    'kinh_do' => $longitude,
                    'la_mac_dinh' => $isDefault,
                ],
            );
        }

        return $addresses;
    }

    private function seedBatches(array $products, array $seasons, User $farmStaff): array
    {
        $specifications = [];
        foreach ($products as $index => $product) {
            if ($index < 3) {
                $specifications[] = [$index, 1 + $index, 14, false, 120, 24];
            } elseif ($index < 6) {
                $specifications[] = [$index, -1 - (($index - 3) * 3), 15, true, 20, 0];
            } else {
                $specifications[] = [$index, 30 + ($index * 4), 30, false, 100, 64];
            }
        }
        foreach ([90, 120, 180] as $index => $expiryDays) {
            $specifications[] = [$index, $expiryDays, 35, false, 60, 36];
        }

        $batches = [];
        foreach ($specifications as $index => [$productIndex, $expiryOffset, $shelfLife, $isExpired, $quantityIn, $quantityOnHand]) {
            $product = $products[$productIndex];
            $expiryDate = now()->addDays($expiryOffset)->startOfDay();
            $harvestDate = $expiryDate->copy()->subDays($shelfLife);
            $code = 'NL-DEMO-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
            $batch = Batch::query()->updateOrCreate(
                ['ma_lo' => $code],
                [
                    'product_id' => $product->getKey(),
                    'season_id' => $seasons[$index % count($seasons)]->getKey(),
                    'ngay_thu_hoach' => $harvestDate->toDateString(),
                    'ngay_het_han' => $expiryDate->toDateString(),
                    'so_luong_nhap' => $quantityIn,
                    'so_luong_ton' => $quantityOnHand,
                    'so_luong_hao_hut' => $isExpired ? $quantityIn : 0,
                    'qr_code' => 'QR-'.$code,
                    'trang_thai' => $isExpired ? 'het_han' : 'con_hang',
                    'created_by' => $farmStaff->getKey(),
                ],
            );
            $batches[] = $batch;

            $activities = [
                ['gieo_hat', 'Gieo trồng hạt giống đã chọn lọc, ghi nhận nguồn giống và khu vực canh tác.', $harvestDate->copy()->subDays(40)->setTime(7, 30)],
                ['bon_phan', 'Bón phân hữu cơ theo định lượng, kiểm tra độ ẩm và dinh dưỡng của đất.', $harvestDate->copy()->subDays(25)->setTime(8, 0)],
                ['tuoi_nuoc', 'Tưới nước sạch vào buổi sáng, theo dõi sinh trưởng và phòng ngừa sâu bệnh.', $harvestDate->copy()->subDays(7)->setTime(6, 45)],
                ['thu_hoach', 'Thu hoạch đúng độ chín, phân loại và bảo quản theo quy trình an toàn.', $harvestDate->copy()->setTime(8, 0)],
            ];
            foreach ($activities as [$action, $note, $time]) {
                FarmingLog::query()->updateOrCreate(
                    ['batch_id' => $batch->getKey(), 'hanh_dong' => $action],
                    [
                        'farm_staff_id' => $farmStaff->getKey(),
                        'ghi_chu' => $note,
                        'thoi_gian' => $time,
                    ],
                );
            }
        }

        return $batches;
    }

    private function seedWasteLogs(array $batches, User $farmStaff): void
    {
        foreach (array_slice($batches, 3, 3) as $index => $batch) {
            WasteLog::query()->updateOrCreate(
                ['batch_id' => $batch->getKey()],
                [
                    'farm_staff_id' => $farmStaff->getKey(),
                    'so_luong' => 20,
                    'ly_do' => ['Lô quá hạn sử dụng', 'Nông sản dập hỏng trong bảo quản', 'Sản phẩm không đạt tiêu chuẩn chất lượng'][$index],
                    'thoi_gian' => now()->subDays(1 + ($index * 3))->setTime(9, 0),
                ],
            );
        }
    }

    private function seedSubscriptionPlans(): array
    {
        $definitions = [
            ['Gói rau củ gia đình hàng tuần', 'Rau củ theo mùa, giao tận nhà mỗi tuần.', 7],
            ['Gói trái cây theo mùa hai tuần', 'Trái cây tươi được tuyển chọn, giao hai tuần một lần.', 14],
        ];

        $plans = [];
        foreach ($definitions as [$name, $description, $interval]) {
            $plans[] = SubscriptionPlan::query()->updateOrCreate(
                ['ten_goi' => $name],
                ['mo_ta' => $description, 'chu_ky_ngay' => $interval, 'is_active' => true],
            );
        }

        return $plans;
    }

    private function seedSubscriptions(User $customer, array $addresses, array $plans, array $products): void
    {
        $definitions = [
            [0, 0, 0, 1, 2],
            [1, 1, 5, 1, 6],
        ];

        foreach ($definitions as [$planIndex, $addressIndex, $productIndex, $quantity, $weekday]) {
            $plan = $plans[$planIndex];
            $product = $products[$productIndex];
            $subscription = Subscription::query()->updateOrCreate(
                [
                    'user_id' => $customer->getKey(),
                    'plan_id' => $plan->getKey(),
                    'address_id' => $addresses['customer'][$addressIndex]->getKey(),
                ],
                [
                    'ngay_bat_dau' => now()->subDays($plan->chu_ky_ngay)->toDateString(),
                    'ngay_ket_thuc' => now()->addDays(60)->toDateString(),
                    'chu_ky_giao_ngay' => $plan->chu_ky_ngay,
                    'tong_tien' => $product->gia_ban_co_ban * $quantity,
                    'trang_thai' => 'dang_hoat_dong',
                ],
            );
            SubscriptionItem::query()->updateOrCreate(
                ['subscription_id' => $subscription->getKey(), 'product_id' => $product->getKey()],
                [
                    'so_luong_moi_lan' => $quantity,
                    'don_gia' => $product->gia_ban_co_ban,
                ],
            );
            SubscriptionDeliveryDay::query()->updateOrCreate(
                ['subscription_id' => $subscription->getKey(), 'thu_trong_tuan' => $weekday],
                [],
            );
        }
    }

    private function seedOrders(array $users, array $addresses, array $products, array $batches): array
    {
        $specifications = [
            ['cho_duyet', 2, 'cod', 'cho_xu_ly'],
            ['cho_duyet', 18, 'vietqr', 'cho_xu_ly'],
            ['da_thanh_toan', 30, 'payos', 'thanh_cong'],
            ['da_xac_nhan', 44, 'vnpay', 'thanh_cong'],
            ['dang_giao', 55, 'cod', 'thanh_cong'],
            ['da_giao', 5, 'vietqr', 'thanh_cong'],
            ['da_giao', 10, 'payos', 'thanh_cong'],
            ['da_giao', 72, 'vnpay', 'thanh_cong'],
            ['da_giao', 96, 'cod', 'thanh_cong'],
            ['da_huy', 118, 'cod', 'that_bai'],
            ['hoan_tien', 140, 'payos', 'hoan_tien'],
            ['giao_bu', 156, 'vietqr', 'thanh_cong'],
        ];
        $batchesByProduct = [];
        foreach ($batches as $batch) {
            if ($batch->trang_thai === 'con_hang') {
                $batchesByProduct[$batch->product_id][] = $batch;
            }
        }

        $orders = [];
        foreach ($specifications as $index => [$status, $hoursAgo, $paymentMethod, $paymentStatus]) {
            $customer = $users['customers'][$index % count($users['customers'])];
            $customerKey = ['customer', 'customer_2', 'customer_3'][$index % 3];
            $address = $addresses[$customerKey][0];
            $createdAt = now()->subHours($hoursAgo);
            $order = Order::query()->updateOrCreate(
                ['ma_don' => 'NL-DEMO-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $customer->getKey(),
                    'loai_don' => 'le',
                    'ten_nguoi_nhan' => $address->ten_nguoi_nhan,
                    'sdt_nguoi_nhan' => $address->so_dien_thoai,
                    'dia_chi_giao' => $address->dia_chi,
                    'khoang_cach_km' => 4.5 + $index,
                    'la_hoa_toc' => false,
                    'tong_tien_hang' => 0,
                    'phi_van_chuyen' => 20000,
                    'tong_thanh_toan' => 20000,
                    'trang_thai' => $status,
                    'ngay_giao_du_kien' => $createdAt->copy()->addDays(2)->toDateString(),
                    'ngay_giao_thuc_te' => $status === 'da_giao' ? $createdAt->copy()->addHours(3) : null,
                    'nguoi_duyet_id' => in_array($status, ['da_thanh_toan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'giao_bu'], true)
                        ? $users['sales']->getKey()
                        : null,
                    'ngay_duyet' => in_array($status, ['da_thanh_toan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'giao_bu'], true)
                        ? $createdAt->copy()->addMinutes(15)
                        : null,
                    'ghi_chu' => 'Đơn hàng mẫu dùng để trình diễn luồng vận hành.',
                ],
            );
            $order->setCreatedAt($createdAt);
            $order->save();

            $subtotal = 0;
            $productIndexes = [$index % 3, 6 + (($index * 2) % 9)];
            foreach ($productIndexes as $itemIndex => $productIndex) {
                $product = $products[$productIndex];
                $quantity = $itemIndex + 1;
                $subtotal += $product->gia_ban_co_ban * $quantity;
                $batch = $batchesByProduct[$product->getKey()][0];
                OrderDetail::query()->updateOrCreate(
                    ['order_id' => $order->getKey(), 'product_id' => $product->getKey()],
                    [
                        'batch_id' => $batch->getKey(),
                        'so_luong' => $quantity,
                        'don_gia' => $product->gia_ban_co_ban,
                    ],
                );
            }

            $shippingFee = 20000;
            $order->forceFill([
                'tong_tien_hang' => $subtotal,
                'phi_van_chuyen' => $shippingFee,
                'tong_thanh_toan' => $subtotal + $shippingFee,
            ])->save();

            $payment = Payment::query()->updateOrCreate(
                ['ma_giao_dich' => 'NLDEMO-PAY-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT)],
                [
                    'order_id' => $order->getKey(),
                    'subscription_id' => null,
                    'phuong_thuc' => $paymentMethod,
                    'so_tien' => $subtotal + $shippingFee,
                    'trang_thai' => $paymentStatus,
                    'thoi_gian_thanh_toan' => in_array($paymentStatus, ['thanh_cong', 'hoan_tien'], true)
                        ? $createdAt->copy()->addMinutes(20)
                        : null,
                ],
            );
            $payment->created_at = $createdAt;
            $payment->save();

            $orders[] = $order;
        }

        return $orders;
    }

    private function seedComplaints(array $orders): void
    {
        $definitions = [
            [5, 'dap_nat', 'Một phần rau củ bị dập nhẹ khi nhận hàng, xin hỗ trợ kiểm tra.', 'photo-1576045057995-568f588f82fb'],
            [6, 'thieu_hang', 'Đơn hàng bị thiếu một sản phẩm so với nội dung xác nhận.', 'photo-1540420773420-3366772f4999'],
        ];

        foreach ($definitions as [$orderIndex, $reason, $description, $photo]) {
            $order = $orders[$orderIndex];
            $complaint = Complaint::query()->updateOrCreate(
                ['order_id' => $order->getKey()],
                [
                    'user_id' => $order->user_id,
                    'ly_do' => $reason,
                    'mo_ta' => $description,
                    'trang_thai' => 'cho_xu_ly',
                    'phan_hoi' => null,
                    'ly_do_tu_choi' => null,
                    'nguoi_xu_ly_id' => null,
                    'xu_ly_luc' => null,
                ],
            );
            $complaint->created_at = now()->subHours($orderIndex === 5 ? 4 : 9);
            $complaint->save();

            $url = 'https://images.unsplash.com/'.$photo.'?auto=format&fit=crop&w=800&q=85';
            ComplaintMedia::query()->updateOrCreate(
                ['complaint_id' => $complaint->getKey(), 'media_url' => $url],
                [
                    'loai' => 'anh',
                    'mime_type' => 'image/jpeg',
                    'kich_thuoc_byte' => 420000,
                ],
            );
        }
    }

    private function seedReviews(array $orders): void
    {
        $comments = [
            'Nông sản tươi, đóng gói cẩn thận.',
            'Chất lượng tốt, sẽ tiếp tục ủng hộ.',
            'Sản phẩm đúng mô tả và giao đúng hẹn.',
            'Tươi ngon, nguồn gốc rõ ràng.',
            'Đóng gói sạch sẽ, sản phẩm đồng đều.',
            'Rất hài lòng với chất lượng mùa này.',
            'Hương vị tự nhiên, giao hàng nhanh.',
            'Sẽ giới thiệu cho gia đình và bạn bè.',
        ];
        $stars = [5, 4, 5, 4, 5, 4, 5, 4];
        $reviewIndex = 0;

        foreach (array_slice($orders, 5, 4) as $order) {
            foreach ($order->details()->orderBy('id')->get() as $detail) {
                Review::query()->updateOrCreate(
                    [
                        'user_id' => $order->user_id,
                        'product_id' => $detail->product_id,
                        'order_id' => $order->getKey(),
                    ],
                    [
                        'so_sao' => $stars[$reviewIndex],
                        'noi_dung' => $comments[$reviewIndex],
                    ],
                );
                $review = Review::query()->where([
                    'user_id' => $order->user_id,
                    'product_id' => $detail->product_id,
                    'order_id' => $order->getKey(),
                ])->firstOrFail();
                $review->created_at = $order->ngay_giao_thuc_te ?? now()->subDays(1);
                $review->save();
                $reviewIndex++;
            }
        }
    }

    private function seedAuditLogs(array $users, array $orders, array $batches): void
    {
        $definitions = [
            ['tao_mua_vu', 'season', null, 'Tạo mùa vụ canh tác', 'admin'],
            ['tao_san_pham', 'product', 0, 'Tạo sản phẩm mẫu', 'admin'],
            ['cap_nhat_san_pham', 'product', 1, 'Cập nhật giá sản phẩm', 'admin'],
            ['tao_tai_khoan', 'user', 'sales', 'Tạo tài khoản nhân viên bán hàng', 'admin'],
            ['tao_lo_hang', 'batch', 0, 'Tạo lô thu hoạch', 'farm_staff'],
            ['ghi_nhat_ky', 'batch', 1, 'Ghi nhật ký chăm sóc cây trồng', 'farm_staff'],
            ['duyet_don_hang', 'order', 3, 'Duyệt đơn hàng', 'sales'],
            ['xac_nhan_thanh_toan', 'order', 2, 'Đối soát thanh toán', 'sales'],
            ['xu_ly_khieu_nai', 'complaint', 0, 'Tiếp nhận khiếu nại khách hàng', 'sales'],
            ['ghi_nhan_xuat_huy', 'batch', 3, 'Ghi nhận lô quá hạn', 'farm_staff'],
        ];

        foreach ($definitions as $index => [$action, $object, $objectIndex, $description, $actorKey]) {
            $objectId = match ($object) {
                'order' => $orders[$objectIndex]->getKey(),
                'batch' => $batches[$objectIndex]->getKey(),
                'product' => Product::query()->where('slug', 'ca-chua-bi-huu-co')->value('id'),
                'complaint' => Complaint::query()->where('order_id', $orders[5]->getKey())->value('id'),
                default => null,
            };
            $log = AuditLog::query()->updateOrCreate(
                [
                    'hanh_dong' => $action,
                    'doi_tuong' => $object,
                    'doi_tuong_id' => $objectId,
                ],
                [
                    'user_id' => $users[$actorKey]->getKey(),
                    'du_lieu_cu' => $index % 2 === 0 ? null : ['trang_thai' => 'draft'],
                    'du_lieu_moi' => ['mo_ta' => $description],
                    'dia_chi_ip' => '127.0.0.1',
                ],
            );
            $log->created_at = now()->subDays(9 - $index)->setTime(10 + ($index % 8), 15);
            $log->save();
        }
    }
}
