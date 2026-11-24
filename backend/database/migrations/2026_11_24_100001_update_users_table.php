<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'name') && ! Schema::hasColumn('users', 'ho_ten')) {
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('name', 'ho_ten');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('role_id')->nullable()->after('id');
            $table->string('so_dien_thoai', 15)->nullable();
            $table->unsignedInteger('diem_tich_luy')->default(0);
            $table->unsignedTinyInteger('so_lan_dang_nhap_sai')->default(0);
            $table->dateTime('khoa_den')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('deleted_at')->nullable();
            $table->string('ho_ten', 100)->change();
            $table->string('email', 150)->change();
            $table->unique('email', 'uq_users_email');
            $table->unique('so_dien_thoai', 'uq_users_so_dien_thoai');
            $table->index('role_id', 'idx_users_role_id');
        });

        DB::table('users')->whereNull('role_id')->update([
            'role_id' => DB::table('roles')->where('ten_vai_tro', 'customer')->value('id'),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('role_id')->nullable(false)->change();
            $table->foreign('role_id', 'fk_users_role_id')->references('id')->on('roles')->onDelete('restrict')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_diem CHECK (diem_tich_luy >= 0)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE users DROP CHECK chk_users_diem');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropIndex('idx_users_role_id');
            $table->dropUnique('uq_users_email');
            $table->dropUnique('uq_users_so_dien_thoai');
            $table->dropColumn(['role_id', 'so_dien_thoai', 'diem_tich_luy', 'so_lan_dang_nhap_sai', 'khoa_den', 'is_active', 'deleted_at']);
            $table->renameColumn('ho_ten', 'name');
            $table->string('name', 255)->change();
            $table->string('email', 255)->change();
        });

        if (DB::getDriverName() === 'mysql') {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('email');
            });
        }
    }
};
