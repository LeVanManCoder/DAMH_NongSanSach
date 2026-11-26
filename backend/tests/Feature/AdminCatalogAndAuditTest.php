<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Category;
use App\Models\Complaint;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\ImageStorageService;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminCatalogAndAuditTest extends TestCase
{
    use RefreshDatabase;

    private const PNG_FIXTURE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
        Storage::fake('public');
    }

    public function test_customer_and_sales_cannot_access_admin_catalog_crud(): void
    {
        $categoryId = Category::query()->value('id');
        $productId = Product::query()->value('id');

        foreach (['customer', 'sales'] as $role) {
            $token = $this->tokenForRole($role);
            $this->withToken($token)->postJson('/api/admin/categories', [
                'ten_danh_muc' => 'Không được phép',
            ])->assertForbidden();
            $this->withToken($token)->postJson('/api/admin/products', [
                'ten_san_pham' => 'Không được phép',
                'category_id' => $categoryId,
                'gia_ban' => 1000,
                'don_vi_tinh' => 'kg',
            ])->assertForbidden();
            $this->withToken($token)->getJson('/api/admin/categories')->assertForbidden();
            $this->withToken($token)->getJson('/api/admin/products')->assertForbidden();
            $this->withToken($token)->putJson('/api/admin/categories/'.$categoryId, [
                'ten_danh_muc' => 'Không được phép',
            ])->assertForbidden();
            $this->withToken($token)->deleteJson('/api/admin/products/'.$productId)->assertForbidden();
        }
    }

    public function test_admin_can_manage_categories_and_products_and_each_change_is_audited(): void
    {
        $token = $this->tokenForRole('admin');
        $category = $this->withToken($token)->postJson('/api/admin/categories', [
            'ten_danh_muc' => 'Nông sản theo mùa',
            'mo_ta' => 'Danh mục mới',
            'trang_thai' => 'dang_ban',
        ])->assertCreated()
            ->assertJsonPath('data.ten_danh_muc', 'Nông sản theo mùa')
            ->json('data');

        $this->withToken($token)->putJson('/api/admin/categories/'.$category['id'], [
            'ten_danh_muc' => 'Nông sản hữu cơ',
            'trang_thai' => 'ngung_ban',
        ])->assertOk()
            ->assertJsonPath('data.ten_danh_muc', 'Nông sản hữu cơ')
            ->assertJsonPath('data.trang_thai', 'ngung_ban');

        $product = $this->withToken($token)->post('/api/admin/products', [
            'ten_san_pham' => 'Dâu tây hữu cơ',
            'category_id' => $category['id'],
            'gia_ban' => 125000,
            'don_vi_tinh' => 'hộp',
            'mo_ta' => 'Dâu tây thu hoạch trong ngày',
            'trang_thai' => 'dang_ban',
            'hinh_anh_dai_dien' => UploadedFile::fake()->createWithContent(
                'dau-tay.png',
                base64_decode(self::PNG_FIXTURE),
            ),
        ])->assertCreated()
            ->assertJsonPath('data.ten_san_pham', 'Dâu tây hữu cơ')
            ->assertJsonPath('data.gia_ban', 125000)
            ->assertJsonPath('data.trang_thai', 'dang_ban')
            ->json('data');

        $imagePath = app(ImageStorageService::class)->storagePath(
            $product['hinh_anh_dai_dien'],
        );
        $this->assertIsString($imagePath);
        Storage::disk('public')->assertExists($imagePath);

        $this->withToken($token)->putJson('/api/admin/products/'.$product['id'], [
            'ten_san_pham' => 'Dâu tây Đà Lạt',
            'gia_ban' => 130000,
            'trang_thai' => 'ngung_ban',
        ])->assertOk()
            ->assertJsonPath('data.ten_san_pham', 'Dâu tây Đà Lạt')
            ->assertJsonPath('data.gia_ban', 130000)
            ->assertJsonPath('data.trang_thai', 'ngung_ban');

        $this->withToken($token)->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonFragment(['ten_san_pham' => 'Dâu tây Đà Lạt']);

        $this->withToken($token)->deleteJson('/api/admin/products/'.$product['id'])
            ->assertNoContent();

        $this->assertSoftDeleted('products', ['id' => $product['id']]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'tao_danh_muc',
            'doi_tuong' => 'categories',
            'doi_tuong_id' => $category['id'],
            'user_id' => $this->userIdForRole('admin'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'cap_nhat_danh_muc',
            'doi_tuong' => 'categories',
            'doi_tuong_id' => $category['id'],
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'tao_san_pham',
            'doi_tuong' => 'products',
            'doi_tuong_id' => $product['id'],
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'cap_nhat_san_pham',
            'doi_tuong' => 'products',
            'doi_tuong_id' => $product['id'],
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'xoa_san_pham',
            'doi_tuong' => 'products',
            'doi_tuong_id' => $product['id'],
        ]);

        $this->withToken($token)->deleteJson('/api/admin/categories/'.$category['id'])
            ->assertConflict();
        $this->assertDatabaseMissing('audit_logs', [
            'hanh_dong' => 'xoa_danh_muc',
            'doi_tuong_id' => $category['id'],
        ]);
    }

    public function test_admin_cannot_delete_categories_with_products_or_products_with_batches_or_orders(): void
    {
        $token = $this->tokenForRole('admin');
        $category = Category::query()->firstOrFail();
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        $this->withToken($token)->deleteJson('/api/admin/categories/'.$category->getKey())
            ->assertConflict();
        $this->withToken($token)->deleteJson('/api/admin/products/'.$product->getKey())
            ->assertConflict();

        $this->assertSame(0, AuditLog::query()
            ->where('hanh_dong', 'xoa_danh_muc')
            ->count());
        $this->assertSame(0, AuditLog::query()
            ->where('hanh_dong', 'xoa_san_pham')
            ->count());

        $unbatchedProduct = Product::query()->create([
            'category_id' => $category->getKey(),
            'ten_san_pham' => 'Sản phẩm đã có đơn',
            'slug' => 'san-pham-da-co-don',
            'gia_ban_co_ban' => 50000,
            'don_vi_tinh' => 'kg',
            'is_active' => true,
        ]);
        $linkedOrder = Order::query()->create([
            'ma_don' => 'TEST-ORDER-LINK-01',
            'user_id' => $this->userIdForRole('customer'),
            'loai_don' => 'le',
            'ten_nguoi_nhan' => 'Khách hàng tích hợp',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
            'tong_tien_hang' => 50000,
            'phi_van_chuyen' => 0,
            'tong_thanh_toan' => 50000,
            'trang_thai' => 'cho_duyet',
        ]);
        $linkedOrder->details()->create([
            'product_id' => $unbatchedProduct->getKey(),
            'so_luong' => 1,
            'don_gia' => 50000,
        ]);
        $this->withToken($token)->deleteJson('/api/admin/products/'.$unbatchedProduct->getKey())
            ->assertConflict();
    }

    public function test_sales_can_confirm_vietqr_once_and_allocate_order_by_fefo_with_audit(): void
    {
        config([
            'services.vietqr.bank_id' => '970415',
            'services.vietqr.account_no' => '0123456789',
            'services.vietqr.account_name' => 'NONG LANH',
        ]);
        $customerToken = $this->tokenForRole('customer');
        $orderId = $this->createOrder($customerToken, '4.00');
        $payment = $this->withToken($customerToken)->postJson('/api/payments/create', [
            'order_id' => $orderId,
            'phuong_thuc' => 'vietqr',
        ])->assertCreated()->json('data.payment');
        $salesToken = $this->tokenForRole('sales');

        $this->withToken($customerToken)->patchJson('/api/orders/'.$orderId.'/confirm-payment')
            ->assertForbidden();
        $this->withToken($salesToken)->patchJson('/api/orders/'.$orderId.'/confirm-payment')
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'da_thanh_toan');
        $this->withToken($this->tokenForRole('admin'))
            ->patchJson('/api/orders/'.$orderId.'/confirm-payment')
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'da_thanh_toan');
        $this->withToken($salesToken)->patchJson('/api/orders/'.$orderId.'/confirm-payment')
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'da_thanh_toan');

        $this->assertDatabaseHas('payments', [
            'id' => $payment['id'],
            'trang_thai' => 'thanh_cong',
        ]);
        $this->assertSame('0.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('9.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertDatabaseCount('order_details', 2);
        $this->assertDatabaseCount('audit_logs', 1);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'xac_nhan_thanh_toan_vietqr',
            'doi_tuong' => 'orders',
            'doi_tuong_id' => $orderId,
            'user_id' => $this->userIdForRole('sales'),
        ]);
    }

    public function test_order_status_complaint_and_batch_waste_changes_create_audit_logs(): void
    {
        $customerToken = $this->tokenForRole('customer');
        $orderId = $this->createOrder($customerToken, '1.00');
        $salesToken = $this->tokenForRole('sales');
        $this->withToken($salesToken)->patchJson('/api/orders/'.$orderId.'/approve')->assertOk();
        $this->withToken($salesToken)->putJson('/api/orders/'.$orderId.'/status', [
            'trang_thai' => 'dang_giao',
        ])->assertOk();

        $order = Order::query()->findOrFail($orderId);
        $order->forceFill([
            'trang_thai' => 'da_giao',
            'ngay_giao_thuc_te' => now(),
        ])->save();
        $complaint = Complaint::query()->create([
            'order_id' => $orderId,
            'user_id' => $this->userIdForRole('customer'),
            'ly_do' => 'khac',
            'mo_ta' => 'Kiểm thử xử lý khiếu nại',
            'trang_thai' => 'cho_xu_ly',
        ]);
        $this->withToken($salesToken)->putJson('/api/complaints/'.$complaint->getKey(), [
            'trang_thai' => 'chap_nhan',
            'phan_hoi' => 'Đã tiếp nhận và xử lý.',
        ])->assertOk();

        $farmToken = $this->tokenForRole('farm_staff');
        $batch = Batch::query()->where('ma_lo', 'LO-FEFO-02')->firstOrFail();
        $this->withToken($farmToken)->postJson('/api/batches/'.$batch->getKey().'/waste', [
            'so_luong' => '1.00',
            'ly_do' => 'Hư hỏng khi phân loại',
        ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'duyet_don_hang',
            'doi_tuong' => 'orders',
            'doi_tuong_id' => $orderId,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'cap_nhat_trang_thai_don_hang',
            'doi_tuong' => 'orders',
            'doi_tuong_id' => $orderId,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'xu_ly_khieu_nai',
            'doi_tuong' => 'complaints',
            'doi_tuong_id' => $complaint->getKey(),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'hanh_dong' => 'ghi_nhan_xuat_huy',
            'doi_tuong' => 'batches',
            'doi_tuong_id' => $batch->getKey(),
        ]);
    }

    private function createOrder(string $token, string $quantity, ?Product $product = null): int
    {
        $product ??= Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $this->withToken($token)->postJson('/api/cart', [
            'product_id' => $product->getKey(),
            'so_luong' => $quantity,
        ])->assertCreated();

        return $this->withToken($token)->postJson('/api/orders', [
            'ten_nguoi_nhan' => 'Khách hàng tích hợp',
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
        ])->assertCreated()->json('data.id');
    }

    private function tokenForRole(string $role): string
    {
        return app(JwtTokenService::class)->issue($this->userForRole($role));
    }

    private function userForRole(string $role): User
    {
        return User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();
    }

    private function userIdForRole(string $role): int
    {
        return (int) $this->userForRole($role)->getKey();
    }
}
