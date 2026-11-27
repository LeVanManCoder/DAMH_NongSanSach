<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('chu_ky_giao_ngay')->default(7);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT chk_subs_delivery_interval CHECK (chu_ky_giao_ngay IN (7, 14))');
        }
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropColumn('chu_ky_giao_ngay');
        });
    }
};
