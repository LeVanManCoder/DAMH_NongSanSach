<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_details', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('batch_id')->nullable();
            $table->decimal('so_luong', 8, 2);
            $table->decimal('don_gia', 12, 0);
            $table->decimal('thanh_tien', 14, 0)->storedAs('so_luong * don_gia');
            $table->index(['order_id'], 'idx_od_order');
            $table->index(['batch_id'], 'idx_od_batch');
            $table->index(['product_id'], 'idx_od_product');
            $table->foreign(['order_id'], 'fk_order_details_order_id')
                ->references(['id'])->on('orders')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['product_id'], 'fk_order_details_product_id')
                ->references(['id'])->on('products')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['batch_id'], 'fk_order_details_batch_id')
                ->references(['id'])->on('batches')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['batch_id', 'product_id'], 'fk_od_batch_product')
                ->references(['id', 'product_id'])->on('batches')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE order_details ADD CONSTRAINT chk_od_so_luong CHECK (so_luong > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_details');
    }
};
