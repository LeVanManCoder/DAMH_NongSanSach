<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('recipient_id');
            $table->enum('loai', ['can_han', 'thieu_hang', 'khieu_nai']);
            $table->unsignedBigInteger('batch_id')->nullable();
            $table->string('noi_dung', 500);
            $table->decimal('so_luong_ton_luc_canh_bao', 10, 2)->nullable();
            $table->unsignedTinyInteger('so_lan_gui')->default(0);
            $table->boolean('da_doc')->default(0);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->unique(['recipient_id', 'batch_id', 'loai', 'so_luong_ton_luc_canh_bao'], 'uq_notif_dedup');
            $table->index(['recipient_id', 'da_doc', 'created_at'], 'idx_notif_inbox');
            $table->index(['batch_id'], 'idx_notif_batch');
            $table->foreign(['recipient_id'], 'fk_notifications_recipient_id')
                ->references(['id'])->on('users')
                ->onDelete('cascade')->onUpdate('cascade');
            $table->foreign(['batch_id'], 'fk_notifications_batch_id')
                ->references(['id'])->on('batches')
                ->onDelete('cascade')->onUpdate('cascade');
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
