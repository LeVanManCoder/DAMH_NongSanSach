<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->tinyIncrements('id');
            $table->string('ten_vai_tro', 30);
            $table->string('mo_ta', 255)->nullable();
            $table->unique('ten_vai_tro', 'uq_roles_ten_vai_tro');
        });

        DB::table('roles')->insert([
            ['ten_vai_tro' => 'customer', 'mo_ta' => 'Khách hàng'],
            ['ten_vai_tro' => 'farm_staff', 'mo_ta' => 'Nhân viên nông trại'],
            ['ten_vai_tro' => 'sales', 'mo_ta' => 'Nhân viên bán hàng'],
            ['ten_vai_tro' => 'admin', 'mo_ta' => 'Quản trị viên'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
