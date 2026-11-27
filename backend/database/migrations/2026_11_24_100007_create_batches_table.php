<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('ma_lo', 30);
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('season_id')->nullable();
            $table->date('ngay_thu_hoach')->nullable();
            $table->date('ngay_het_han')->nullable();
            $table->decimal('so_luong_nhap', 10, 2)->default(0);
            $table->decimal('so_luong_ton', 10, 2)->default(0);
            $table->decimal('so_luong_hao_hut', 10, 2)->default(0);
            $table->string('qr_code', 255)->nullable();
            $table->enum('trang_thai', ['dang_canh_tac', 'da_thu_hoach', 'con_hang', 'het_hang', 'het_han'])->default('dang_canh_tac');
            $table->unsignedBigInteger('created_by');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->unique(['ma_lo'], 'uq_batches_ma_lo');
            $table->unique(['qr_code'], 'uq_batches_qr_code');
            $table->index(['ngay_het_han'], 'idx_batches_ngay_het_han');
            $table->index(['product_id', 'trang_thai', 'ngay_het_han', 'ngay_thu_hoach'], 'idx_batches_fefo');
            $table->unique(['id', 'product_id'], 'uq_batches_id_product');
            $table->index(['season_id'], 'idx_batches_season_id');
            $table->index(['created_by'], 'idx_batches_created_by');
            $table->foreign(['product_id'], 'fk_batches_product_id')
                ->references(['id'])->on('products')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['season_id'], 'fk_batches_season_id')
                ->references(['id'])->on('seasons')
                ->onDelete('set null')->onUpdate('cascade');
            $table->foreign(['created_by'], 'fk_batches_created_by')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE batches ADD CONSTRAINT chk_batches_ton CHECK (so_luong_ton >= 0)');
            DB::statement('ALTER TABLE batches ADD CONSTRAINT chk_batches_nhap CHECK (so_luong_nhap >= 0 AND so_luong_hao_hut >= 0)');
            DB::statement('ALTER TABLE batches ADD CONSTRAINT chk_batches_can_bang CHECK (so_luong_ton + so_luong_hao_hut <= so_luong_nhap)');
            DB::statement('ALTER TABLE batches ADD CONSTRAINT chk_batches_ngay CHECK (ngay_het_han IS NULL OR ngay_thu_hoach IS NULL OR ngay_het_han >= ngay_thu_hoach)');
            DB::statement('ALTER TABLE batches ADD CONSTRAINT chk_batches_da_thu_hoach CHECK (trang_thai = \'dang_canh_tac\' OR (ngay_thu_hoach IS NOT NULL AND ngay_het_han IS NOT NULL))');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
