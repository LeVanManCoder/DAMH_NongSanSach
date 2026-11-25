<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Product;
use App\Models\User;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FefoTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->seed(FefoTestSeeder::class);
    }

    public function test_guest_can_list_products_with_available_batches_and_farming_timelines(): void
    {
        $response = $this->getJson('/api/products?per_page=100')->assertOk();
        $product = collect($response->json('data'))
            ->firstWhere('slug', 'ca-chua-huu-co-fefo-test');

        $this->assertNotNull($product);
        $this->assertSame('Cà chua hữu cơ FEFO Test', $product['ten_san_pham']);
        $this->assertCount(2, $product['batches']);
        $this->assertSame('LO-FEFO-01', $product['batches'][0]['ma_lo']);
        $this->assertSame('3.00', $product['batches'][0]['so_luong_kha_dung']);
        $this->assertCount(2, $product['batches'][0]['farming_logs']);
        $this->assertSame(
            ['LO-FEFO-01', 'LO-FEFO-02'],
            array_column($product['batches'], 'ma_lo'),
        );
    }

    public function test_product_detail_uses_slug_and_hides_expired_or_empty_batches(): void
    {
        $this->getJson('/api/products/ca-chua-huu-co-fefo-test')
            ->assertOk()
            ->assertJsonPath('data.slug', 'ca-chua-huu-co-fefo-test')
            ->assertJsonPath('data.batches.0.ma_lo', 'LO-FEFO-01')
            ->assertJsonPath('data.batches.0.farming_logs.0.hanh_dong', 'cham_soc')
            ->assertJsonCount(2, 'data.batches');

        $this->getJson('/api/products/not-a-live-product')
            ->assertNotFound()
            ->assertJsonPath('status', 'error');
    }

    public function test_cart_add_and_update_reject_quantities_above_available_batch_stock(): void
    {
        $product = Product::query()->where('slug', 'ca-chua-huu-co-fefo-test')->firstOrFail();
        $token = $this->tokenFor('customer');
        $firstBatch = Batch::query()->where('ma_lo', 'LO-FEFO-01')->firstOrFail();
        $secondBatch = Batch::query()->where('ma_lo', 'LO-FEFO-02')->firstOrFail();

        $this->withToken($token)
            ->postJson('/api/cart', [
                'product_id' => $product->getKey(),
                'so_luong' => '14.00',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.so_luong.0', 'Số lượng yêu cầu vượt quá tồn kho khả dụng.');

        $this->assertDatabaseCount('cart_items', 0);
        $this->assertSame('3.00', $firstBatch->refresh()->so_luong_ton);
        $this->assertSame('10.00', $secondBatch->refresh()->so_luong_ton);

        $itemId = $this->withToken($token)
            ->postJson('/api/cart', [
                'product_id' => $product->getKey(),
                'so_luong' => '10.00',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withToken($token)
            ->postJson('/api/cart', [
                'product_id' => $product->getKey(),
                'so_luong' => '4.00',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.so_luong.0', 'Số lượng yêu cầu vượt quá tồn kho khả dụng.');

        $this->withToken($token)
            ->putJson('/api/cart/'.$itemId, ['so_luong' => '14.00'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('cart_items', [
            'id' => $itemId,
            'so_luong' => '10.00',
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
