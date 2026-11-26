<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table): void {
            $table->string('phan_hoi', 2000)->nullable();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE complaints MODIFY trang_thai ENUM('cho_xu_ly', 'chap_nhan', 'hoan_tien', 'giao_bu', 'tu_choi') NOT NULL DEFAULT 'cho_xu_ly'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('complaints')
                ->where('trang_thai', 'chap_nhan')
                ->update(['trang_thai' => 'cho_xu_ly']);

            DB::statement("ALTER TABLE complaints MODIFY trang_thai ENUM('cho_xu_ly', 'hoan_tien', 'giao_bu', 'tu_choi') NOT NULL DEFAULT 'cho_xu_ly'");
        }

        Schema::table('complaints', function (Blueprint $table): void {
            $table->dropColumn('phan_hoi');
        });
    }
};
