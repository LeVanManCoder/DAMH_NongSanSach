<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedInteger('plan_id');
            $table->unsignedBigInteger('address_id');
            $table->date('ngay_bat_dau');
            $table->date('ngay_ket_thuc');
            $table->decimal('tong_tien', 12, 0)->default(0);
            $table->enum('trang_thai', ['cho_thanh_toan', 'dang_hoat_dong', 'tam_dung', 'het_han', 'da_huy'])->default('cho_thanh_toan');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->index(['user_id', 'trang_thai'], 'idx_subs_user_trang_thai');
            $table->index(['trang_thai', 'ngay_ket_thuc'], 'idx_subs_trang_thai_ket_thuc');
            $table->index(['plan_id'], 'idx_subs_plan');
            $table->index(['address_id'], 'idx_subs_address');
            $table->foreign(['user_id'], 'fk_subscriptions_user_id')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['plan_id'], 'fk_subscriptions_plan_id')
                ->references(['id'])->on('subscription_plans')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['address_id'], 'fk_subscriptions_address_id')
                ->references(['id'])->on('addresses')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT chk_subs_ngay CHECK (ngay_ket_thuc > ngay_bat_dau)');
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT chk_subs_tien CHECK (tong_tien >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
