<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAndRbacTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = '12345678';
    private const REGISTRATION_PASSWORD = 'Password@123';

    public function test_registration_login_current_user_and_logout(): void
    {
        $registration = $this->postJson('/api/auth/register', [
            'ho_ten' => 'Nguyễn Thị An',
            'email' => 'an@example.test',
            'password' => self::REGISTRATION_PASSWORD,
        ]);

        $registration->assertCreated()
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonMissingPath('data.password');

        $login = $this->postJson('/api/auth/login', [
            'email' => 'an@example.test',
            'password' => self::REGISTRATION_PASSWORD,
        ])->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('expires_in', 3600)
            ->assertJsonPath('user.role', 'customer');

        $token = $login->json('access_token');
        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'an@example.test');
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonMissingPath('data.khoa_den');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_account_is_locked_for_fifteen_minutes_after_five_failed_logins(): void
    {
        $this->seed(DatabaseSeeder::class);
        $email = 'khach@nonglanh.vn';

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'WrongPassword1',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassword1',
        ])->assertStatus(429)
            ->assertJsonStructure(['message', 'retry_after']);

        $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => self::PASSWORD,
        ])->assertStatus(429);

        $this->travel(16)->minutes();
        $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => self::PASSWORD,
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'so_lan_dang_nhap_sai' => 0,
            'khoa_den' => null,
        ]);
    }

    public function test_seed_creates_roles_accounts_catalog_batches_and_trace_logs(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(4, Role::query()->count());
        $this->assertSame(6, User::query()->count());
        $this->assertDatabaseCount('categories', 5);
        $this->assertDatabaseCount('seasons', 4);
        $this->assertDatabaseCount('products', 15);
        $this->assertDatabaseCount('batches', 18);
        $this->assertDatabaseCount('farming_logs', 72);
        $this->assertDatabaseCount('waste_logs', 3);
        $this->assertDatabaseCount('addresses', 4);
        $this->assertDatabaseCount('subscription_plans', 2);
        $this->assertDatabaseCount('subscriptions', 2);
        $this->assertDatabaseCount('orders', 12);
        $this->assertSame(12, Order::query()->where('ngay_tao', '>=', now()->subDays(7))->count());
        $this->assertDatabaseCount('order_details', 24);
        $this->assertDatabaseCount('payments', 12);
        $this->assertDatabaseCount('reviews', 8);
        $this->assertDatabaseCount('complaints', 2);
        $this->assertDatabaseCount('complaint_media', 2);
        $this->assertDatabaseCount('audit_logs', 10);
        $this->assertTrue(
            Batch::query()
                ->where('trang_thai', 'con_hang')
                ->whereDate('ngay_het_han', now()->addDay())
                ->exists(),
        );

        foreach (['customer', 'farm_staff', 'sales', 'admin'] as $roleName) {
            $account = User::query()->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $roleName))->firstOrFail();
            $this->assertTrue(Hash::check(self::PASSWORD, $account->password));
        }

        foreach (['khach2@nonglanh.vn', 'khach3@nonglanh.vn'] as $email) {
            $account = User::query()->where('email', $email)->firstOrFail();
            $this->assertTrue(Hash::check(self::PASSWORD, $account->password));
        }
    }

    public function test_protected_role_routes_return_401_without_valid_token(): void
    {
        foreach ([
            '/api/addresses',
            '/api/farm/seasons',
            '/api/sales/orders',
            '/api/admin/audit-logs',
            '/api/auth/me',
        ] as $uri) {
            $this->getJson($uri)->assertUnauthorized();
        }

        $this->withToken('not.a.valid.jwt')->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_each_role_can_only_access_its_authorized_api_area(): void
    {
        $this->seed(DatabaseSeeder::class);

        $roleRoutes = [
            'customer' => '/api/addresses',
            'farm_staff' => '/api/farm/seasons',
            'sales' => '/api/sales/orders',
            'admin' => '/api/admin/audit-logs',
        ];
        $allowedRoutes = [
            'customer' => ['/api/addresses'],
            'farm_staff' => ['/api/farm/seasons'],
            'sales' => ['/api/sales/orders'],
            'admin' => ['/api/sales/orders', '/api/admin/audit-logs'],
        ];

        foreach (array_keys($roleRoutes) as $roleName) {
            $email = User::query()->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $roleName))->value('email');
            $token = $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => self::PASSWORD,
            ])->assertOk()->json('access_token');

            foreach ($roleRoutes as $route) {
                $response = $this->withToken($token)->getJson($route);
                if (in_array($route, $allowedRoutes[$roleName], true)) {
                    $response->assertOk();
                } else {
                    $response->assertForbidden();
                }
            }
        }
    }
}
