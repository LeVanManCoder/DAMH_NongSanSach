<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\CartItem;
use App\Models\OrderDetail;
use App\Models\Product;
use App\Models\Season;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class BatchOrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
    }

    public function test_farm_staff_can_manage_batches_and_record_waste(): void
    {
        $farmStaffToken = $this->tokenFor('farm_staff');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $seasonId = Season::query()->value('id');
        $batchData = [
            'ma_lo' => 'API-BATCH-CRUD',
            'product_id' => $product->getKey(),
            'season_id' => $seasonId,
            'ngay_thu_hoach' => now()->subDay()->toDateString(),
            'ngay_het_han' => now()->addDays(5)->toDateString(),
            'so_luong_nhap' => '10.00',
            'so_luong_ton' => '10.00',
            'trang_thai' => 'con_hang',
        ];

        $created = $this->withToken($farmStaffToken)
            ->postJson('/api/batches', $batchData)
            ->assertCreated()
            ->assertJsonPath('data.ma_lo', 'API-BATCH-CRUD');
        $batchId = $created->json('data.id');

        $this->withToken($farmStaffToken)
            ->getJson('/api/batches?product_id='.$product->getKey().'&trang_thai=con_hang')
            ->assertOk()
            ->assertJsonFragment(['ma_lo' => 'API-BATCH-CRUD']);

        $this->withToken($farmStaffToken)
            ->getJson('/api/batches/'.$batchId)
            ->assertOk()
            ->assertJsonPath('data.ma_lo', 'API-BATCH-CRUD')
            ->assertJsonPath('data.farming_logs', []);

        $this->withToken($farmStaffToken)
            ->putJson('/api/batches/'.$batchId, ['ma_lo' => 'API-BATCH-UPDATED'])
            ->assertOk()
            ->assertJsonPath('data.ma_lo', 'API-BATCH-UPDATED');

        $this->withToken($farmStaffToken)
            ->postJson('/api/batches/'.$batchId.'/waste', [
                'so_luong' => '2.00',
                'ly_do' => 'Dập nát trong quá trình phân loại',
            ])
            ->assertCreated()
            ->assertJsonPath('data.ly_do', 'Dập nát trong quá trình phân loại');

        $batch = Batch::query()->findOrFail($batchId);
        $this->assertSame('8.00', $batch->so_luong_ton);
        $this->assertSame('2.00', $batch->so_luong_hao_hut);
        $this->assertDatabaseHas('waste_logs', [
            'batch_id' => $batchId,
            'farm_staff_id' => User::query()->where('email', 'nhanvien@nonganhlanh.local')->value('id'),
            'so_luong' => '2.00',
        ]);

        $this->withToken($farmStaffToken)
            ->deleteJson('/api/batches/'.$batchId)
            ->assertStatus(409)
            ->assertJsonPath('status', 'error');

        $deletable = $this->withToken($farmStaffToken)
            ->postJson('/api/batches', [
                ...$batchData,
                'ma_lo' => 'API-BATCH-DELETE',
                'so_luong_ton' => '0.00',
                'trang_thai' => 'dang_canh_tac',
                'ngay_thu_hoach' => null,
                'ngay_het_han' => null,
            ])
            ->assertCreated();

        $this->withToken($farmStaffToken)
            ->deleteJson('/api/batches/'.$deletable->json('data.id'))
            ->assertNoContent();
    }

    public function test_batch_routes_enforce_view_and_write_roles(): void
    {
        $this->withToken($this->tokenFor('customer'))
            ->getJson('/api/batches')
            ->assertForbidden()
            ->assertJsonPath('status', 'error');

        foreach (['sales', 'admin'] as $role) {
            $token = $this->tokenFor($role);
            $this->withToken($token)->getJson('/api/batches')->assertOk();
            $this->withToken($token)
                ->postJson('/api/batches', [])
                ->assertForbidden()
                ->assertJsonPath('status', 'error');
        }
    }

    public function test_customer_places_ten_kilograms_and_sales_approval_allocates_by_fefo(): void
    {
        $customerToken = $this->tokenFor('customer');
        $salesToken = $this->tokenFor('sales');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        $cartItem = $this->withToken($customerToken)
            ->postJson('/api/cart', [
                'product_id' => $product->getKey(),
                'so_luong' => '1.00',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withToken($customerToken)->getJson('/api/cart')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->withToken($customerToken)
            ->putJson('/api/cart/'.$cartItem, ['so_luong' => '9.00'])
            ->assertOk();
        $this->withToken($customerToken)
            ->patchJson('/api/cart/'.$cartItem, ['so_luong' => '10.00'])
            ->assertOk()
            ->assertJsonPath('data.so_luong', '10.00');

        $order = $this->withToken($customerToken)
            ->postJson('/api/orders', [
                'ten_nguoi_nhan' => 'Nguyễn Thị An',
                'sdt_nguoi_nhan' => '0901234567',
                'dia_chi_giao' => '12 Đường Xanh, Đà Lạt',
            ])
            ->assertCreated()
            ->assertJsonPath('data.trang_thai', 'cho_duyet')
            ->assertJsonPath('data.tong_thanh_toan', '450000');
        $orderId = $order->json('data.id');

        $this->withToken($customerToken)->getJson('/api/cart')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->withToken($customerToken)->getJson('/api/orders')
            ->assertOk()
            ->assertJsonFragment(['id' => $orderId]);

        $this->withToken($salesToken)
            ->patchJson('/api/orders/'.$orderId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.trang_thai', 'da_xac_nhan');

        $details = OrderDetail::query()
            ->where('order_id', $orderId)
            ->orderBy('batch_id')
            ->get();
        $firstBatch = Batch::query()->where('ma_lo', 'LO-FEFO-01')->firstOrFail();
        $secondBatch = Batch::query()->where('ma_lo', 'LO-FEFO-02')->firstOrFail();

        $this->assertCount(2, $details);
        $this->assertSame((int) $firstBatch->getKey(), (int) $details[0]->batch_id);
        $this->assertSame('3.00', $details[0]->so_luong);
        $this->assertSame((int) $secondBatch->getKey(), (int) $details[1]->batch_id);
        $this->assertSame('7.00', $details[1]->so_luong);
        $this->assertSame('0.00', $firstBatch->refresh()->so_luong_ton);
        $this->assertSame('3.00', $secondBatch->refresh()->so_luong_ton);

        $this->withToken($customerToken)
            ->postJson('/api/cart', ['product_id' => $product->getKey(), 'so_luong' => '1.00'])
            ->assertCreated();
        $remainingCartItem = $this->withToken($customerToken)->getJson('/api/cart')->json('data.0.id');
        $this->withToken($customerToken)->deleteJson('/api/cart/'.$remainingCartItem)->assertNoContent();
    }

    public function test_order_approval_returns_standard_json_and_rolls_back_when_stock_is_insufficient(): void
    {
        $customer = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', 'customer'))
            ->firstOrFail();
        $customerToken = app(JwtTokenService::class)->issue($customer);
        $salesToken = $this->tokenFor('sales');
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();

        CartItem::query()->create([
            'user_id' => $customer->getKey(),
            'product_id' => $product->getKey(),
            'so_luong' => '15.00',
        ]);

        $orderId = $this->withToken($customerToken)
            ->postJson('/api/orders', [
                'ten_nguoi_nhan' => 'Trần Văn Bình',
                'sdt_nguoi_nhan' => '0912345678',
                'dia_chi_giao' => '45 Đường Nông Trại, Đà Lạt',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withToken($salesToken)
            ->patchJson('/api/orders/'.$orderId.'/approve')
            ->assertUnprocessable()
            ->assertExactJson([
                'status' => 'error',
                'message' => 'Số lượng tồn kho không đủ',
            ]);

        $this->assertSame('3.00', Batch::query()->where('ma_lo', 'LO-FEFO-01')->value('so_luong_ton'));
        $this->assertSame('10.00', Batch::query()->where('ma_lo', 'LO-FEFO-02')->value('so_luong_ton'));
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'trang_thai' => 'cho_duyet']);
        $this->assertDatabaseHas('order_details', ['order_id' => $orderId, 'batch_id' => null]);
    }

    public function test_api_not_found_validation_and_system_errors_use_the_standard_json_shape(): void
    {
        $staffToken = $this->tokenFor('farm_staff');

        $this->getJson('/api/no-such-resource')
            ->assertNotFound()
            ->assertExactJson([
                'status' => 'error',
                'message' => 'Không tìm thấy tài nguyên yêu cầu.',
            ]);

        $this->withToken($staffToken)
            ->postJson('/api/batches', [])
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'Dữ liệu gửi lên không hợp lệ.')
            ->assertJsonStructure(['errors' => ['ma_lo', 'product_id', 'so_luong_nhap']]);

        Route::get('/api/__test-system-error', function (): void {
            throw new \RuntimeException('Không được tiết lộ chi tiết lỗi nội bộ.');
        });

        $this->getJson('/api/__test-system-error')
            ->assertInternalServerError()
            ->assertExactJson([
                'status' => 'error',
                'message' => 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
            ]);
    }

    private function tokenFor(string $role): string
    {
        $user = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();

        return app(JwtTokenService::class)->issue($user);
    }
}
