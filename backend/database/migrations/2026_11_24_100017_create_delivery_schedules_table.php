<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_schedules', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('subscription_id');
            $table->date('ngay_giao');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->enum('trang_thai', ['cho_sinh_don', 'da_sinh_don', 'thieu_hang', 'da_doi_san_pham', 'bo_qua', 'da_giao'])->default('cho_sinh_don');
            $table->string('ghi_chu', 255)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->unique(['subscription_id', 'ngay_giao'], 'uq_sched_sub_ngay');
            $table->index(['ngay_giao', 'trang_thai'], 'idx_sched_ngay_trang_thai');
            $table->unique(['order_id'], 'uq_sched_order');
            $table->foreign(['subscription_id'], 'fk_delivery_schedules_subscription_id')
                ->references(['id'])->on('subscriptions')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['order_id'], 'fk_delivery_schedules_order_id')
                ->references(['id'])->on('orders')
                ->onDelete('set null')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_schedules');
    }
};
