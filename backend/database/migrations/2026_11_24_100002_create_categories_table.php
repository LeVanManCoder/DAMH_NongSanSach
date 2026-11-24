<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('parent_id')->nullable();
            $table->string('ten_danh_muc', 100);
            $table->string('slug', 120);
            $table->string('mo_ta', 255)->nullable();
            $table->boolean('is_active')->default(1);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->unique(['slug'], 'uq_categories_slug');
            $table->index(['parent_id'], 'idx_categories_parent_id');
            $table->foreign(['parent_id'], 'fk_categories_parent_id')
                ->references(['id'])->on('categories')
                ->onDelete('set null')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
