<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('category_id');
            $table->string('ten_san_pham', 150);
            $table->string('slug', 170);
            $table->text('mo_ta')->nullable();
            $table->string('hinh_anh_dai_dien', 255)->nullable();
            $table->decimal('gia_ban_co_ban', 12, 0)->default(0);
            $table->string('don_vi_tinh', 20)->default('kg');
            $table->boolean('is_active')->default(1);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->unique(['slug'], 'uq_products_slug');
            $table->index(['category_id', 'is_active'], 'idx_products_category_active');
            $table->foreign(['category_id'], 'fk_products_category_id')
                ->references(['id'])->on('categories')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE products ADD FULLTEXT INDEX ft_products_ten (ten_san_pham)');
            DB::statement('ALTER TABLE products ADD CONSTRAINT chk_products_gia CHECK (gia_ban_co_ban >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
