<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->string('ten_nguoi_nhan', 100);
            $table->string('so_dien_thoai', 15);
            $table->string('dia_chi', 255);
            $table->decimal('vi_do', 10, 7)->nullable();
            $table->decimal('kinh_do', 10, 7)->nullable();
            $table->boolean('la_mac_dinh')->default(0);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->index(['user_id'], 'idx_addresses_user_id');
            $table->foreign(['user_id'], 'fk_addresses_user_id')
                ->references(['id'])->on('users')
                ->onDelete('cascade')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
