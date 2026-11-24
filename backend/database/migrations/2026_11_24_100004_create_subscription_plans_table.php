<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->increments('id');
            $table->string('ten_goi', 120);
            $table->string('mo_ta', 255)->nullable();
            $table->unsignedSmallInteger('chu_ky_ngay')->default(30);
            $table->boolean('is_active')->default(1);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->index(['is_active'], 'idx_plans_active');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
