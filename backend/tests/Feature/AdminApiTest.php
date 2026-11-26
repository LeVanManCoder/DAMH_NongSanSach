<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Batch;
use App\Models\Order;
use App\Models\User;
use App\Models\WasteLog;
use App\Services\JwtTokenService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['inventory.expiry_warning_days' => 2]);
        $this->seed(DatabaseSeeder::class);
    }

    public function test_admin_dashboard_reports_revenue_orders_customers_near_expiry_and_waste(): void
    {
        $customer = $this->userByRole('customer');
        $farmStaff = $this->userByRole('farm_staff');
        $this->createOrder($customer, 'da_thanh_toan', 100000);
        $this->createOrder($customer, 'da_giao', 50000);
        $this->createOrder($customer, 'cho_duyet', 25000);

        $batch = Batch::query()->where('trang_thai', 'con_hang')->firstOrFail();
        WasteLog::query()->create([
            'batch_id' => $batch->getKey(),
            'farm_staff_id' => $farmStaff->getKey(),
            'so_luong' => 2.5,
            'ly_do' => 'Nông sản bị dập.',
            'thoi_gian' => now(),
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.doanh_thu', 150000)
            ->assertJsonPath('data.don_hang.tong_so', 3)
            ->assertJsonPath('data.don_hang.theo_trang_thai.da_giao', 1)
            ->assertJsonPath('data.don_hang.theo_trang_thai.cho_duyet', 1)
            ->assertJsonPath('data.khach_hang', 1)
            ->assertJsonPath('data.hang_can_han.so_lo', 8)
            ->assertJsonPath('data.hang_can_han.so_luong', 192)
            ->assertJsonPath('data.hao_hut.so_lan_xuat_huy', 1)
            ->assertJsonPath('data.hao_hut.so_luong', 2.5);
    }

    public function test_only_admin_can_access_admin_apis(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();

        foreach (['customer', 'farm_staff', 'sales'] as $role) {
            $token = $this->tokenFor($role);
            foreach ([
                '/api/admin/dashboard',
                '/api/admin/users',
                '/api/admin/audit-logs',
            ] as $uri) {
                $this->withToken($token)->getJson($uri)->assertForbidden();
            }
        }

        $this->withToken($this->tokenFor('customer'))
            ->patchJson('/api/admin/users/'.$this->userByRole('sales')->getKey().'/status', [
                'is_active' => false,
            ])
            ->assertForbidden();
    }

    public function test_admin_can_list_users_and_lock_unlock_accounts_without_self_locking(): void
    {
        $admin = $this->userByRole('admin');
        $customer = $this->userByRole('customer');
        $adminToken = $this->tokenFor('admin');

        $this->withToken($adminToken)
            ->getJson('/api/admin/users?role=customer&is_active=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $customer->getKey())
            ->assertJsonPath('data.0.role.ten_vai_tro', 'customer')
            ->assertJsonPath('data.0.is_active', true);

        $this->withToken($adminToken)
            ->patchJson('/api/admin/users/'.$admin->getKey().'/status', ['is_active' => false])
            ->assertUnprocessable()
            ->assertJsonPath('errors.is_active.0', 'Bạn không thể tự khóa tài khoản của mình.');

        $customerToken = $this->tokenFor($customer);
        $this->withToken($adminToken)
            ->patchJson('/api/admin/users/'.$customer->getKey().'/status', ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->withToken($customerToken)->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->getKey(),
            'hanh_dong' => 'khoa_tai_khoan',
            'doi_tuong' => 'users',
            'doi_tuong_id' => $customer->getKey(),
        ]);

        $this->withToken($adminToken)
            ->patchJson('/api/admin/users/'.$customer->getKey().'/status', ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->getKey(),
            'hanh_dong' => 'mo_khoa_tai_khoan',
            'doi_tuong_id' => $customer->getKey(),
        ]);
    }

    public function test_admin_can_filter_paginated_audit_logs_by_action_and_table(): void
    {
        $admin = $this->userByRole('admin');
        AuditLog::query()->create([
            'user_id' => $admin->getKey(),
            'hanh_dong' => 'khoa_tai_khoan',
            'doi_tuong' => 'users',
            'doi_tuong_id' => $this->userByRole('customer')->getKey(),
            'du_lieu_cu' => ['is_active' => true],
            'du_lieu_moi' => ['is_active' => false],
            'dia_chi_ip' => '127.0.0.1',
        ]);
        AuditLog::query()->create([
            'user_id' => $admin->getKey(),
            'hanh_dong' => 'cap_nhat',
            'doi_tuong' => 'products',
            'doi_tuong_id' => 1,
        ]);

        $this->withToken($this->tokenFor('admin'))
            ->getJson('/api/admin/audit-logs?hanh_dong=khoa_tai_khoan&doi_tuong=users')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.hanh_dong', 'khoa_tai_khoan')
            ->assertJsonPath('data.0.user.ho_ten', $admin->ho_ten)
            ->assertJsonPath('data.0.du_lieu_moi.is_active', false);
    }

    private function userByRole(string $role): User
    {
        return User::query()
            ->whereHas('role', fn ($query) => $query->where('ten_vai_tro', $role))
            ->firstOrFail();
    }

    private function tokenFor(string|User $role): string
    {
        $user = $role instanceof User ? $role : $this->userByRole($role);

        return app(JwtTokenService::class)->issue($user);
    }

    private function createOrder(User $customer, string $status, int $total): Order
    {
        return Order::query()->create([
            'ma_don' => Str::upper(Str::random(20)),
            'user_id' => $customer->getKey(),
            'loai_don' => 'le',
            'ten_nguoi_nhan' => $customer->ho_ten,
            'sdt_nguoi_nhan' => '0901234567',
            'dia_chi_giao' => 'Địa chỉ kiểm thử',
            'tong_tien_hang' => $total,
            'phi_van_chuyen' => 0,
            'tong_thanh_toan' => $total,
            'trang_thai' => $status,
            'ngay_giao_thuc_te' => $status === 'da_giao' ? now() : null,
        ]);
    }
}
