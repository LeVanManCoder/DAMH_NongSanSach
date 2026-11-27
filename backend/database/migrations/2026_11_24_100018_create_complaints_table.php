<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('ly_do', ['dap_nat', 'hu_hong', 'thieu_hang', 'sai_san_pham', 'khac']);
            $table->text('mo_ta')->nullable();
            if (DB::getDriverName() === 'sqlite') {
                $table->string('trang_thai', 20)->default('cho_xu_ly');
            } else {
                $table->enum('trang_thai', ['cho_xu_ly', 'chap_nhan', 'hoan_tien', 'giao_bu', 'tu_choi'])->default('cho_xu_ly');
            }
            $table->string('ly_do_tu_choi', 255)->nullable();
            $table->unsignedBigInteger('nguoi_xu_ly_id')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('xu_ly_luc')->nullable();
            $table->unique(['order_id'], 'uq_complaints_order');
            $table->index(['trang_thai', 'created_at'], 'idx_complaints_trang_thai');
            $table->index(['user_id'], 'idx_complaints_user');
            $table->index(['nguoi_xu_ly_id'], 'idx_complaints_nguoi_xu_ly');
            $table->foreign(['order_id'], 'fk_complaints_order_id')
                ->references(['id'])->on('orders')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['user_id'], 'fk_complaints_user_id')
                ->references(['id'])->on('users')
                ->onDelete('restrict')->onUpdate('cascade');
            $table->foreign(['nguoi_xu_ly_id'], 'fk_complaints_nguoi_xu_ly_id')
                ->references(['id'])->on('users')
                ->onDelete('set null')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE complaints ADD CONSTRAINT chk_complaints_tu_choi CHECK (trang_thai <> \'tu_choi\' OR ly_do_tu_choi IS NOT NULL)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
