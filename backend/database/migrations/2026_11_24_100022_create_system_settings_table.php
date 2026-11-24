<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('khoa', 60)->primary();
            $table->string('gia_tri', 255);
            $table->string('mo_ta', 255)->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->index(['updated_by'], 'idx_settings_updated_by');
            $table->foreign(['updated_by'], 'fk_system_settings_updated_by')
                ->references(['id'])->on('users')
                ->onDelete('set null')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
