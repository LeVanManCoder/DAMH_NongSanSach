<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_delivery_days', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('subscription_id');
            $table->unsignedTinyInteger('thu_trong_tuan');
            $table->unique(['subscription_id', 'thu_trong_tuan'], 'uq_sub_days');
            $table->foreign(['subscription_id'], 'fk_subscription_delivery_days_subscription_id')
                ->references(['id'])->on('subscriptions')
                ->onDelete('cascade')->onUpdate('cascade');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE subscription_delivery_days ADD CONSTRAINT chk_sub_days_thu CHECK (thu_trong_tuan BETWEEN 1 AND 7)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_delivery_days');
    }
};
