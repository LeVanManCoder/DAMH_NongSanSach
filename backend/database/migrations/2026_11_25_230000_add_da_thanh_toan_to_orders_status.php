<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const STATUSES = "'cho_duyet','da_thanh_toan','da_xac_nhan','dang_giao','da_giao','da_huy','hoan_tien','giao_bu'";

    private const PREVIOUS_STATUSES = "'cho_duyet','da_xac_nhan','dang_giao','da_giao','da_huy','hoan_tien','giao_bu'";

    public function up(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE orders MODIFY COLUMN trang_thai ENUM('.self::STATUSES.") NOT NULL DEFAULT 'cho_duyet'");
        }
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("UPDATE orders SET trang_thai = 'da_xac_nhan' WHERE trang_thai = 'da_thanh_toan'");
            DB::statement('ALTER TABLE orders MODIFY COLUMN trang_thai ENUM('.self::PREVIOUS_STATUSES.") NOT NULL DEFAULT 'cho_duyet'");
        }
    }
};
