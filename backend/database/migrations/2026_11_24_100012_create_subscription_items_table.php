<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('subscription_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('so_luong_moi_lan', 8, 2);
            $table->decimal('don_gia', 12, 0);
            $table->unique(['subscription_id', 'product_id'], 'uq_sub_items');
            $table->index(['product_id'], 'idx_sub_items_product');
            $table->foreign(['subscription_id'], 'fk_subscription_items_subscription_id')
                ->references(['id'])->on('subscriptions')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['product_id'], 'fk_subscription_items_product_id')
                ->references(['id'])->on('products')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE subscription_items ADD CONSTRAINT chk_sub_items_sl CHECK (so_luong_moi_lan > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_items');
    }
};
