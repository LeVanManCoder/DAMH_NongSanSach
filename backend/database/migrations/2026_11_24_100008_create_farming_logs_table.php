<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farming_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('batch_id');
            $table->unsignedBigInteger('farm_staff_id');
            $table->enum('hanh_dong', ['gieo_hat', 'bon_phan', 'tuoi_nuoc', 'phun_thuoc', 'cham_soc', 'thu_hoach', 'khac']);
            $table->text('ghi_chu')->nullable();
            $table->string('hinh_anh_minh_chung', 255)->nullable();
            $table->dateTime('thoi_gian');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->index(['batch_id', 'thoi_gian'], 'idx_farming_logs_batch_time');
            $table->index(['farm_staff_id'], 'idx_farming_logs_staff');
            $table->foreign(['batch_id'], 'fk_farming_logs_batch_id')
                ->references(['id'])->on('batches')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['farm_staff_id'], 'fk_farming_logs_farm_staff_id')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('farming_logs');
    }
};
