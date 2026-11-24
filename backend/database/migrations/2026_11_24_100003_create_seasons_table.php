<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seasons', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('ten_mua_vu', 120);
            $table->string('khu_vuc_canh_tac', 100)->nullable();
            $table->date('ngay_bat_dau');
            $table->date('ngay_ket_thuc_du_kien')->nullable();
            $table->enum('trang_thai', ['dang_canh_tac', 'da_thu_hoach', 'ket_thuc'])->default('dang_canh_tac');
            $table->unsignedBigInteger('created_by');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->index(['trang_thai'], 'idx_seasons_trang_thai');
            $table->index(['created_by'], 'idx_seasons_created_by');
            $table->foreign(['created_by'], 'fk_seasons_created_by')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE seasons ADD CONSTRAINT chk_seasons_ngay CHECK (ngay_ket_thuc_du_kien IS NULL OR ngay_ket_thuc_du_kien >= ngay_bat_dau)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seasons');
    }
};
