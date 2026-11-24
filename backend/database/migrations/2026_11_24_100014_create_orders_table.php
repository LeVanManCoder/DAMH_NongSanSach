<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('ma_don', 20);
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('subscription_id')->nullable();
            $table->enum('loai_don', ['le', 'dinh_ky'])->default('le');
            $table->string('ten_nguoi_nhan', 100);
            $table->string('sdt_nguoi_nhan', 15);
            $table->string('dia_chi_giao', 255);
            $table->decimal('khoang_cach_km', 6, 2)->nullable();
            $table->boolean('la_hoa_toc')->default(0);
            $table->decimal('tong_tien_hang', 12, 0)->default(0);
            $table->decimal('phi_van_chuyen', 12, 0)->default(0);
            $table->decimal('tong_thanh_toan', 12, 0)->default(0);
            $table->enum('trang_thai', ['cho_duyet', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy', 'hoan_tien', 'giao_bu'])->default('cho_duyet');
            $table->date('ngay_giao_du_kien')->nullable();
            $table->dateTime('ngay_giao_thuc_te')->nullable();
            $table->unsignedBigInteger('nguoi_duyet_id')->nullable();
            $table->dateTime('ngay_duyet')->nullable();
            $table->string('ghi_chu', 255)->nullable();
            $table->dateTime('ngay_tao')->useCurrent();
            $table->dateTime('ngay_cap_nhat')->nullable();
            $table->unique(['ma_don'], 'uq_orders_ma_don');
            $table->index(['trang_thai', 'ngay_tao'], 'idx_orders_trang_thai_ngay_tao');
            $table->index(['user_id', 'ngay_tao'], 'idx_orders_user_ngay_tao');
            $table->index(['subscription_id'], 'idx_orders_subscription');
            $table->index(['nguoi_duyet_id'], 'idx_orders_nguoi_duyet');
            $table->foreign(['user_id'], 'fk_orders_user_id')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['subscription_id'], 'fk_orders_subscription_id')
                ->references(['id'])->on('subscriptions')
                ->onDelete('set null')->onUpdate('cascade');
            $table->foreign(['nguoi_duyet_id'], 'fk_orders_nguoi_duyet_id')
                ->references(['id'])->on('users')
                ->onDelete('set null')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE orders ADD CONSTRAINT chk_orders_tong CHECK (tong_thanh_toan = tong_tien_hang + phi_van_chuyen)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT chk_orders_tien CHECK (tong_tien_hang >= 0 AND phi_van_chuyen >= 0)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT chk_orders_loai CHECK ((loai_don = \'dinh_ky\') = (subscription_id IS NOT NULL))');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
