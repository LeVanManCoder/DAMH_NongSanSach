<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waste_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('batch_id');
            $table->unsignedBigInteger('farm_staff_id');
            $table->decimal('so_luong', 10, 2);
            $table->string('ly_do', 255);
            $table->dateTime('thoi_gian')->useCurrent();
            $table->index(['batch_id', 'thoi_gian'], 'idx_waste_logs_batch');
            $table->index(['farm_staff_id'], 'idx_waste_logs_staff');
            $table->foreign(['batch_id'], 'fk_waste_logs_batch_id')
                ->references(['id'])->on('batches')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['farm_staff_id'], 'fk_waste_logs_farm_staff_id')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE waste_logs ADD CONSTRAINT chk_waste_so_luong CHECK (so_luong > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_logs');
    }
};
