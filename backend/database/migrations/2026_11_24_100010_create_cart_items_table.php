<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('so_luong', 8, 2)->default(1);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->unique(['user_id', 'product_id'], 'uq_cart_user_product');
            $table->index(['product_id'], 'idx_cart_product');
            $table->foreign(['user_id'], 'fk_cart_items_user_id')
                ->references(['id'])->on('users')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['product_id'], 'fk_cart_items_product_id')
                ->references(['id'])->on('products')
                ->onDelete('cascade')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE cart_items ADD CONSTRAINT chk_cart_so_luong CHECK (so_luong > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
