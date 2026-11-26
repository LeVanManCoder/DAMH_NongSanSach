<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Product;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FarmOperationsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    public function test_guest_can_list_categories_and_search_products_by_name_and_category(): void
    {
        $categoryId = Product::query()
            ->where('slug', 'ca-chua-bi-huu-co')
            ->value('category_id');

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'ten_danh_muc', 'slug']]]);

        $this->getJson('/api/products?search=Cà%20chua&category_id='.$categoryId)
            ->assertOk()
            ->assertJsonFragment(['slug' => 'ca-chua-bi-huu-co']);

        $this->getJson('/api/products?search=khong-co-san-pham')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_farm_staff_can_create_season_batch_and_farming_log_with_automatic_qr(): void
    {
        $token = $this->tokenFor('farm_staff');
        $product = Product::query()->where('slug', 'ca-chua-bi-huu-co')->firstOrFail();

        $this->withToken($token)
            ->getJson('/api/seasons')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $seasonId = $this->withToken($token)
            ->postJson('/api/seasons', [
                'ten_mua_vu' => 'Vụ kiểm thử nhật ký',
                'khu_vuc_canh_tac' => 'Đà Lạt',
                'ngay_bat_dau' => now()->subDays(3)->toDateString(),
                'ngay_ket_thuc_du_kien' => now()->addDays(30)->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.ten_mua_vu', 'Vụ kiểm thử nhật ký')
            ->json('data.id');

        $batch = $this->withToken($token)
            ->postJson('/api/batches', [
                'product_id' => $product->getKey(),
                'season_id' => $seasonId,
                'ngay_thu_hoach' => now()->subDay()->toDateString(),
                'ngay_het_han' => now()->addDays(5)->toDateString(),
                'so_luong_nhap' => '7.50',
                'trang_thai' => 'con_hang',
            ])
            ->assertCreated()
            ->assertJsonPath('data.so_luong_ton', '7.50')
            ->json('data');

        $this->assertStringStartsWith('LO-', $batch['ma_lo']);
        $this->assertDatabaseHas('batches', [
            'id' => $batch['id'],
            'qr_code' => null,
        ]);

        $logResponse = $this->withToken($token)
            ->postJson('/api/batches/'.$batch['id'].'/farming-logs', [
                'hanh_dong' => 'cham_soc',
                'ghi_chu' => 'Tưới nước sạch và theo dõi tình trạng cây.',
                'thoi_gian' => now()->toDateTimeString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.hanh_dong', 'cham_soc');

        $qrCode = $logResponse->json('qr_code');
        $this->assertNotEmpty($qrCode);
        $this->assertDatabaseHas('farming_logs', [
            'batch_id' => $batch['id'],
            'farm_staff_id' => User::query()->where('email', 'nhanvien@nonganhlanh.local')->value('id'),
            'hanh_dong' => 'cham_soc',
        ]);
        Storage::disk('public')->assertExists('qrcodes/batch-'.$batch['id'].'.svg');

        $this->getJson('/api/trace/'.urlencode($qrCode))
            ->assertOk()
            ->assertJsonPath('data.farming_logs.0.ghi_chu', 'Tưới nước sạch và theo dõi tình trạng cây.');
    }

    public function test_only_farm_staff_can_manage_seasons_and_add_farming_logs(): void
    {
        $customerToken = $this->tokenFor('customer');
        $batchId = Batch::query()->value('id');

        $this->withToken($customerToken)
            ->getJson('/api/seasons')
            ->assertForbidden();

        $this->withToken($customerToken)
            ->postJson('/api/seasons', [])
            ->assertForbidden();

        $this->withToken($customerToken)
            ->postJson('/api/batches/'.$batchId.'/farming-logs', [
                'hanh_dong' => 'cham_soc',
                'ghi_chu' => 'Không được phép.',
                'thoi_gian' => now()->toDateTimeString(),
            ])
            ->assertForbidden();
    }

    private function tokenFor(string $role): string
    {
        $user = User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();

        return app(JwtTokenService::class)->issue($user);
    }
}
