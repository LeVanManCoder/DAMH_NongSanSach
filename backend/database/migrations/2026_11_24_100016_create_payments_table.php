<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('subscription_id')->nullable();
            $table->enum('phuong_thuc', ['cod', 'momo', 'vnpay']);
            $table->decimal('so_tien', 12, 0);
            $table->enum('trang_thai', ['cho_xu_ly', 'thanh_cong', 'that_bai', 'hoan_tien'])->default('cho_xu_ly');
            $table->string('ma_giao_dich', 100)->nullable();
            $table->dateTime('thoi_gian_thanh_toan')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->unique(['ma_giao_dich'], 'uq_payments_ma_giao_dich');
            $table->index(['order_id'], 'idx_payments_order');
            $table->index(['subscription_id'], 'idx_payments_subscription');
            $table->foreign(['order_id'], 'fk_payments_order_id')
                ->references(['id'])->on('orders')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['subscription_id'], 'fk_payments_subscription_id')
                ->references(['id'])->on('subscriptions')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE payments ADD CONSTRAINT chk_payments_doi_tuong CHECK ((order_id IS NULL) <> (subscription_id IS NULL))');
            DB::statement('ALTER TABLE payments ADD CONSTRAINT chk_payments_tien CHECK (so_tien > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
