<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('hanh_dong', 50);
            $table->string('doi_tuong', 50);
            $table->unsignedBigInteger('doi_tuong_id')->nullable();
            $table->json('du_lieu_cu')->nullable();
            $table->json('du_lieu_moi')->nullable();
            $table->string('dia_chi_ip', 45)->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->index(['doi_tuong', 'doi_tuong_id'], 'idx_audit_doi_tuong');
            $table->index(['user_id', 'created_at'], 'idx_audit_user_time');
            $table->index(['created_at'], 'idx_audit_created_at');
            $table->foreign(['user_id'], 'fk_audit_logs_user_id')
                ->references(['id'])->on('users')
                ->onDelete('set null')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
