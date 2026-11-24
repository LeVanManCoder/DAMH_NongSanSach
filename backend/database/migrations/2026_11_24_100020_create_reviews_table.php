<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedTinyInteger('so_sao');
            $table->string('noi_dung', 500)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->unique(['user_id', 'product_id', 'order_id'], 'uq_reviews_user_product_order');
            $table->index(['product_id', 'created_at'], 'idx_reviews_product');
            $table->index(['order_id'], 'idx_reviews_order');
            $table->foreign(['user_id'], 'fk_reviews_user_id')
                ->references(['id'])->on('users')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['product_id'], 'fk_reviews_product_id')
                ->references(['id'])->on('products')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['order_id'], 'fk_reviews_order_id')
                ->references(['id'])->on('orders')
                ->onDelete('cascade')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE reviews ADD CONSTRAINT chk_reviews_sao CHECK (so_sao BETWEEN 1 AND 5)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
