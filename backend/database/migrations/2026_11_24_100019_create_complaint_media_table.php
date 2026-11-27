<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_media', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('complaint_id');
            $table->string('media_url', 255);
            $table->enum('loai', ['anh', 'video']);
            $table->string('mime_type', 50);
            $table->unsignedInteger('kich_thuoc_byte');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->index(['complaint_id'], 'idx_cmedia_complaint');
            $table->foreign(['complaint_id'], 'fk_complaint_media_complaint_id')
                ->references(['id'])->on('complaints')
                ->onDelete('cascade')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE complaint_media ADD CONSTRAINT chk_cmedia_dung_luong CHECK ((loai = \'anh\' AND kich_thuoc_byte <= 5242880) OR (loai = \'video\' AND kich_thuoc_byte <= 31457280))');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_media');
    }
};
