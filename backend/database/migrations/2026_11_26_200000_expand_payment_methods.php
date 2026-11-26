<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE payments MODIFY COLUMN phuong_thuc ENUM('cod','momo','vnpay','vietqr','payos') NOT NULL");
        } elseif (DB::getDriverName() === 'sqlite') {
            Schema::table('payments', function (Blueprint $table): void {
                $table->enum('phuong_thuc', ['cod', 'momo', 'vnpay', 'vietqr', 'payos'])->change();
            });
        }
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE payments SET phuong_thuc = 'vnpay' WHERE phuong_thuc IN ('vietqr', 'payos')");
            DB::statement("ALTER TABLE payments MODIFY COLUMN phuong_thuc ENUM('cod','momo','vnpay') NOT NULL");
        } elseif (DB::getDriverName() === 'sqlite') {
            DB::table('payments')->whereIn('phuong_thuc', ['vietqr', 'payos'])->update(['phuong_thuc' => 'vnpay']);
            Schema::table('payments', function (Blueprint $table): void {
                $table->enum('phuong_thuc', ['cod', 'momo', 'vnpay'])->change();
            });
        }
    }
};
