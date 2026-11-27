
SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `nongsan_sach`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `nongsan_sach`;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `complaint_media`;
DROP TABLE IF EXISTS `complaints`;
DROP TABLE IF EXISTS `delivery_schedules`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_details`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `subscription_delivery_days`;
DROP TABLE IF EXISTS `subscription_items`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `subscription_plans`;
DROP TABLE IF EXISTS `waste_logs`;
DROP TABLE IF EXISTS `farming_logs`;
DROP TABLE IF EXISTS `batches`;
DROP TABLE IF EXISTS `seasons`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

--bảng hệ thống Laravel
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `job_batches`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `migrations`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `migrations` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` VARCHAR(255) NOT NULL,
  `batch`     INT          NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `email`      VARCHAR(255) NOT NULL,
  `token`      VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id`            VARCHAR(255)    NOT NULL,
  `user_id`       BIGINT UNSIGNED NULL DEFAULT NULL,
  `ip_address`    VARCHAR(45)     NULL DEFAULT NULL,
  `user_agent`    TEXT            NULL,
  `payload`       LONGTEXT        NOT NULL,
  `last_activity` INT             NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key`        VARCHAR(255) NOT NULL,
  `value`      MEDIUMTEXT   NOT NULL,
  `expiration` INT          NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key`        VARCHAR(255) NOT NULL,
  `owner`      VARCHAR(255) NOT NULL,
  `expiration` INT          NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id`           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `queue`        VARCHAR(255)     NOT NULL,
  `payload`      LONGTEXT         NOT NULL,
  `attempts`     TINYINT UNSIGNED NOT NULL,
  `reserved_at`  INT UNSIGNED     NULL DEFAULT NULL,
  `available_at` INT UNSIGNED     NOT NULL,
  `created_at`   INT UNSIGNED     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id`             VARCHAR(255) NOT NULL,
  `name`           VARCHAR(255) NOT NULL,
  `total_jobs`     INT          NOT NULL,
  `pending_jobs`   INT          NOT NULL,
  `failed_jobs`    INT          NOT NULL,
  `failed_job_ids` LONGTEXT     NOT NULL,
  `options`        MEDIUMTEXT   NULL,
  `cancelled_at`   INT          NULL DEFAULT NULL,
  `created_at`     INT          NOT NULL,
  `finished_at`    INT          NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`       VARCHAR(255)    NOT NULL,
  `connection` TEXT            NOT NULL,
  `queue`      TEXT            NOT NULL,
  `payload`    LONGTEXT        NOT NULL,
  `exception`  LONGTEXT        NOT NULL,
  `failed_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_access_tokens` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255)    NOT NULL,
  `tokenable_id`   BIGINT UNSIGNED NOT NULL,
  `name`           TEXT            NOT NULL,
  `token`          VARCHAR(64)     NOT NULL,
  `abilities`      TEXT            NULL,
  `last_used_at`   TIMESTAMP       NULL DEFAULT NULL,
  `expires_at`     TIMESTAMP       NULL DEFAULT NULL,
  `created_at`     TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`     TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `roles` (
  `id`          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_vai_tro` VARCHAR(30)      NOT NULL,
  `mo_ta`       VARCHAR(255)     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_ten_vai_tro` (`ten_vai_tro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id`                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `role_id`              TINYINT UNSIGNED NOT NULL,
  `ho_ten`               VARCHAR(100)     NOT NULL,
  `email`                VARCHAR(150)     NOT NULL,
  `email_verified_at`    TIMESTAMP        NULL DEFAULT NULL,
  `password`             VARCHAR(255)     NOT NULL,
  `remember_token`       VARCHAR(100)     NULL DEFAULT NULL,
  `so_dien_thoai`        VARCHAR(15)      NULL DEFAULT NULL,
  `diem_tich_luy`        INT UNSIGNED     NOT NULL DEFAULT 0,
  `so_lan_dang_nhap_sai` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `khoa_den`             DATETIME         NULL DEFAULT NULL,
  `is_active`            TINYINT(1)       NOT NULL DEFAULT 1,
  `created_at`           TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`           TIMESTAMP        NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_so_dien_thoai` (`so_dien_thoai`),
  KEY `idx_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_users_diem` CHECK (`diem_tich_luy` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `addresses` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `ten_nguoi_nhan` VARCHAR(100)    NOT NULL,
  `so_dien_thoai`  VARCHAR(15)     NOT NULL,
  `dia_chi`        VARCHAR(255)    NOT NULL,
  `vi_do`          DECIMAL(10,7)   NULL DEFAULT NULL,
  `kinh_do`        DECIMAL(10,7)   NULL DEFAULT NULL,
  `la_mac_dinh`    TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id`    INT UNSIGNED NULL DEFAULT NULL,
  `ten_danh_muc` VARCHAR(100) NOT NULL,
  `slug`         VARCHAR(120) NOT NULL,
  `mo_ta`        VARCHAR(255) NULL DEFAULT NULL,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_parent_id` (`parent_id`),
  CONSTRAINT `fk_categories_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`       INT UNSIGNED    NOT NULL,
  `ten_san_pham`      VARCHAR(150)    NOT NULL,
  `slug`              VARCHAR(170)    NOT NULL,
  `mo_ta`             TEXT            NULL,
  `hinh_anh_dai_dien` VARCHAR(255)    NULL DEFAULT NULL,
  `gia_ban_co_ban`    DECIMAL(12,0)   NOT NULL DEFAULT 0,
  `don_vi_tinh`       VARCHAR(20)     NOT NULL DEFAULT 'kg',
  `is_active`         TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`        TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP       NULL DEFAULT NULL,
  `deleted_at`        TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_category_active` (`category_id`, `is_active`),
  FULLTEXT KEY `ft_products_ten` (`ten_san_pham`),
  CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_products_gia` CHECK (`gia_ban_co_ban` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seasons` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_mua_vu`            VARCHAR(120)    NOT NULL,
  `khu_vuc_canh_tac`      VARCHAR(100)    NULL DEFAULT NULL,
  `ngay_bat_dau`          DATE            NOT NULL,
  `ngay_ket_thuc_du_kien` DATE            NULL DEFAULT NULL,
  `trang_thai`            ENUM('dang_canh_tac', 'da_thu_hoach', 'ket_thuc') NOT NULL DEFAULT 'dang_canh_tac',
  `created_by`            BIGINT UNSIGNED NOT NULL,
  `created_at`            TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_seasons_trang_thai` (`trang_thai`),
  KEY `idx_seasons_created_by` (`created_by`),
  CONSTRAINT `fk_seasons_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_seasons_ngay` CHECK (`ngay_ket_thuc_du_kien` IS NULL OR `ngay_ket_thuc_du_kien` >= `ngay_bat_dau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `batches` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_lo`            VARCHAR(30)     NOT NULL,
  `product_id`       BIGINT UNSIGNED NOT NULL,
  `season_id`        BIGINT UNSIGNED NULL DEFAULT NULL,
  `ngay_thu_hoach`   DATE            NULL DEFAULT NULL,
  `ngay_het_han`     DATE            NULL DEFAULT NULL,
  `so_luong_nhap`    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  `so_luong_ton`     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  `so_luong_hao_hut` DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  `qr_code`          VARCHAR(255)    NULL DEFAULT NULL,
  `trang_thai`       ENUM('dang_canh_tac', 'da_thu_hoach', 'con_hang', 'het_hang', 'het_han') NOT NULL DEFAULT 'dang_canh_tac',
  `created_by`       BIGINT UNSIGNED NOT NULL,
  `created_at`       TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batches_ma_lo` (`ma_lo`),
  UNIQUE KEY `uq_batches_qr_code` (`qr_code`),
  UNIQUE KEY `uq_batches_id_product` (`id`, `product_id`),
  KEY `idx_batches_ngay_het_han` (`ngay_het_han`),
  KEY `idx_batches_fefo` (`product_id`, `trang_thai`, `ngay_het_han`, `ngay_thu_hoach`),
  KEY `idx_batches_season_id` (`season_id`),
  KEY `idx_batches_created_by` (`created_by`),
  CONSTRAINT `fk_batches_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_batches_season_id` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_batches_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_batches_ton` CHECK (`so_luong_ton` >= 0),
  CONSTRAINT `chk_batches_nhap` CHECK (`so_luong_nhap` >= 0 AND `so_luong_hao_hut` >= 0),
  CONSTRAINT `chk_batches_can_bang` CHECK ((`so_luong_ton` + `so_luong_hao_hut`) <= `so_luong_nhap`),
  CONSTRAINT `chk_batches_ngay` CHECK (`ngay_het_han` IS NULL OR `ngay_thu_hoach` IS NULL OR `ngay_het_han` >= `ngay_thu_hoach`),
  CONSTRAINT `chk_batches_da_thu_hoach` CHECK (`trang_thai` = 'dang_canh_tac' OR (`ngay_thu_hoach` IS NOT NULL AND `ngay_het_han` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `farming_logs` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`            BIGINT UNSIGNED NOT NULL,
  `farm_staff_id`       BIGINT UNSIGNED NOT NULL,
  `hanh_dong`           ENUM('gieo_hat', 'bon_phan', 'tuoi_nuoc', 'phun_thuoc', 'cham_soc', 'thu_hoach', 'khac') NOT NULL,
  `ghi_chu`             TEXT            NULL,
  `hinh_anh_minh_chung` VARCHAR(255)    NULL DEFAULT NULL,
  `thoi_gian`           DATETIME        NOT NULL,
  `created_at`          TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farming_logs_batch_time` (`batch_id`, `thoi_gian`),
  KEY `idx_farming_logs_staff` (`farm_staff_id`),
  CONSTRAINT `fk_farming_logs_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_farming_logs_farm_staff_id` FOREIGN KEY (`farm_staff_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `waste_logs` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`      BIGINT UNSIGNED NOT NULL,
  `farm_staff_id` BIGINT UNSIGNED NOT NULL,
  `so_luong`      DECIMAL(10,2)   NOT NULL,
  `ly_do`         VARCHAR(255)    NOT NULL,
  `thoi_gian`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_waste_logs_batch` (`batch_id`, `thoi_gian`),
  KEY `idx_waste_logs_staff` (`farm_staff_id`),
  CONSTRAINT `fk_waste_logs_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_waste_logs_farm_staff_id` FOREIGN KEY (`farm_staff_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_waste_so_luong` CHECK (`so_luong` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_plans` (
  `id`          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `ten_goi`     VARCHAR(120)      NOT NULL,
  `mo_ta`       VARCHAR(255)      NULL DEFAULT NULL,
  `chu_ky_ngay` SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  `is_active`   TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP         NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP         NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plans_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
  `id`               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED  NOT NULL,
  `plan_id`          INT UNSIGNED     NOT NULL,
  `address_id`       BIGINT UNSIGNED  NOT NULL,
  `ngay_bat_dau`     DATE             NOT NULL,
  `ngay_ket_thuc`    DATE             NOT NULL,
  `chu_ky_giao_ngay` TINYINT UNSIGNED NOT NULL DEFAULT 7,
  `tong_tien`        DECIMAL(12,0)    NOT NULL DEFAULT 0,
  `trang_thai`       ENUM('cho_thanh_toan', 'dang_hoat_dong', 'tam_dung', 'het_han', 'da_huy') NOT NULL DEFAULT 'cho_thanh_toan',
  `created_at`       TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP        NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user_trang_thai` (`user_id`, `trang_thai`),
  KEY `idx_subs_trang_thai_ket_thuc` (`trang_thai`, `ngay_ket_thuc`),
  KEY `idx_subs_plan` (`plan_id`),
  KEY `idx_subs_address` (`address_id`),
  CONSTRAINT `fk_subscriptions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_subscriptions_plan_id` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_subscriptions_address_id` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_subs_ngay` CHECK (`ngay_ket_thuc` > `ngay_bat_dau`),
  CONSTRAINT `chk_subs_tien` CHECK (`tong_tien` >= 0),
  CONSTRAINT `chk_subs_delivery_interval` CHECK (`chu_ky_giao_ngay` IN (7, 14))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_items` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id`  BIGINT UNSIGNED NOT NULL,
  `product_id`       BIGINT UNSIGNED NOT NULL,
  `so_luong_moi_lan` DECIMAL(8,2)    NOT NULL,
  `don_gia`          DECIMAL(12,0)   NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_items` (`subscription_id`, `product_id`),
  KEY `idx_sub_items_product` (`product_id`),
  CONSTRAINT `fk_subscription_items_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_subscription_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_sub_items_sl` CHECK (`so_luong_moi_lan` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_delivery_days` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED  NOT NULL,
  `thu_trong_tuan`  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_days` (`subscription_id`, `thu_trong_tuan`),
  CONSTRAINT `fk_subscription_delivery_days_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_sub_days_thu` CHECK (`thu_trong_tuan` BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- NHÓM E: GIỎ HÀNG, ĐƠN HÀNG, THANH TOÁN & LỊCH GIAO (cart_items, orders, order_details, payments, delivery_schedules)
-- ----------------------------------------------------------------------------

CREATE TABLE `cart_items` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `so_luong`   DECIMAL(8,2)    NOT NULL DEFAULT 1.00,
  `created_at` TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_user_product` (`user_id`, `product_id`),
  KEY `idx_cart_product` (`product_id`),
  CONSTRAINT `fk_cart_items_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_cart_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_cart_so_luong` CHECK (`so_luong` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don`            VARCHAR(20)     NOT NULL,
  `user_id`           BIGINT UNSIGNED NOT NULL,
  `subscription_id`   BIGINT UNSIGNED NULL DEFAULT NULL,
  `loai_don`          ENUM('le', 'dinh_ky') NOT NULL DEFAULT 'le',
  `ten_nguoi_nhan`    VARCHAR(100)    NOT NULL,
  `sdt_nguoi_nhan`    VARCHAR(15)     NOT NULL,
  `dia_chi_giao`      VARCHAR(255)    NOT NULL,
  `khoang_cach_km`    DECIMAL(6,2)    NULL DEFAULT NULL,
  `la_hoa_toc`        TINYINT(1)      NOT NULL DEFAULT 0,
  `tong_tien_hang`    DECIMAL(12,0)   NOT NULL DEFAULT 0,
  `phi_van_chuyen`    DECIMAL(12,0)   NOT NULL DEFAULT 0,
  `tong_thanh_toan`   DECIMAL(12,0)   NOT NULL DEFAULT 0,
  `trang_thai`        ENUM('cho_duyet', 'da_thanh_toan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy', 'hoan_tien', 'giao_bu') NOT NULL DEFAULT 'cho_duyet',
  `ngay_giao_du_kien` DATE            NULL DEFAULT NULL,
  `ngay_giao_thuc_te` DATETIME        NULL DEFAULT NULL,
  `nguoi_duyet_id`    BIGINT UNSIGNED NULL DEFAULT NULL,
  `ngay_duyet`        DATETIME        NULL DEFAULT NULL,
  `ghi_chu`           VARCHAR(255)    NULL DEFAULT NULL,
  `ngay_tao`          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat`     DATETIME        NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_ma_don` (`ma_don`),
  KEY `idx_orders_trang_thai_ngay_tao` (`trang_thai`, `ngay_tao`),
  KEY `idx_orders_user_ngay_tao` (`user_id`, `ngay_tao`),
  KEY `idx_orders_subscription` (`subscription_id`),
  KEY `idx_orders_nguoi_duyet` (`nguoi_duyet_id`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_orders_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_orders_nguoi_duyet_id` FOREIGN KEY (`nguoi_duyet_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `chk_orders_tong` CHECK (`tong_thanh_toan` = (`tong_tien_hang` + `phi_van_chuyen`)),
  CONSTRAINT `chk_orders_tien` CHECK (`tong_tien_hang` >= 0 AND `phi_van_chuyen` >= 0),
  CONSTRAINT `chk_orders_loai` CHECK ((`loai_don` = 'dinh_ky') = (`subscription_id` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_details` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_id`   BIGINT UNSIGNED NULL DEFAULT NULL,
  `so_luong`   DECIMAL(8,2)    NOT NULL,
  `don_gia`    DECIMAL(12,0)   NOT NULL,
  `thanh_tien` DECIMAL(14,0)   GENERATED ALWAYS AS (`so_luong` * `don_gia`) STORED,
  PRIMARY KEY (`id`),
  KEY `idx_od_order` (`order_id`),
  KEY `idx_od_batch` (`batch_id`),
  KEY `idx_od_product` (`product_id`),
  KEY `idx_od_batch_product` (`batch_id`, `product_id`),
  CONSTRAINT `fk_order_details_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_order_details_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_order_details_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_od_batch_product` FOREIGN KEY (`batch_id`, `product_id`) REFERENCES `batches` (`id`, `product_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_od_so_luong` CHECK (`so_luong` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`             BIGINT UNSIGNED NULL DEFAULT NULL,
  `subscription_id`      BIGINT UNSIGNED NULL DEFAULT NULL,
  `phuong_thuc`          ENUM('cod', 'momo', 'vnpay', 'vietqr', 'payos') NOT NULL,
  `so_tien`              DECIMAL(12,0)   NOT NULL,
  `trang_thai`           ENUM('cho_xu_ly', 'thanh_cong', 'that_bai', 'hoan_tien') NOT NULL DEFAULT 'cho_xu_ly',
  `ma_giao_dich`         VARCHAR(100)    NULL DEFAULT NULL,
  `thoi_gian_thanh_toan` DATETIME        NULL DEFAULT NULL,
  `created_at`           TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_ma_giao_dich` (`ma_giao_dich`),
  KEY `idx_payments_order` (`order_id`),
  KEY `idx_payments_subscription` (`subscription_id`),
  CONSTRAINT `fk_payments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_payments_doi_tuong` CHECK ((`order_id` IS NULL) <> (`subscription_id` IS NULL)),
  CONSTRAINT `chk_payments_tien` CHECK (`so_tien` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `delivery_schedules` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED NOT NULL,
  `ngay_giao`       DATE            NOT NULL,
  `order_id`        BIGINT UNSIGNED NULL DEFAULT NULL,
  `trang_thai`      ENUM('cho_sinh_don', 'da_sinh_don', 'thieu_hang', 'da_doi_san_pham', 'bo_qua', 'da_giao') NOT NULL DEFAULT 'cho_sinh_don',
  `ghi_chu`         VARCHAR(255)    NULL DEFAULT NULL,
  `created_at`      TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sched_sub_ngay` (`subscription_id`, `ngay_giao`),
  UNIQUE KEY `uq_sched_order` (`order_id`),
  KEY `idx_sched_ngay_trang_thai` (`ngay_giao`, `trang_thai`),
  CONSTRAINT `fk_delivery_schedules_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_delivery_schedules_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE `complaints` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`       BIGINT UNSIGNED NOT NULL,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `ly_do`          ENUM('dap_nat', 'hu_hong', 'thieu_hang', 'sai_san_pham', 'khac') NOT NULL,
  `mo_ta`          TEXT            NULL,
  `trang_thai`     ENUM('cho_xu_ly', 'chap_nhan', 'hoan_tien', 'giao_bu', 'tu_choi') NOT NULL DEFAULT 'cho_xu_ly',
  `phan_hoi`       VARCHAR(2000)   NULL DEFAULT NULL,
  `ly_do_tu_choi`  VARCHAR(255)    NULL DEFAULT NULL,
  `nguoi_xu_ly_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `xu_ly_luc`      DATETIME        NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_complaints_order` (`order_id`),
  KEY `idx_complaints_trang_thai` (`trang_thai`, `created_at`),
  KEY `idx_complaints_user` (`user_id`),
  KEY `idx_complaints_nguoi_xu_ly` (`nguoi_xu_ly_id`),
  CONSTRAINT `fk_complaints_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_complaints_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_complaints_nguoi_xu_ly_id` FOREIGN KEY (`nguoi_xu_ly_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `chk_complaints_tu_choi` CHECK (`trang_thai` <> 'tu_choi' OR `ly_do_tu_choi` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `complaint_media` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id`    BIGINT UNSIGNED NOT NULL,
  `media_url`       VARCHAR(255)    NOT NULL,
  `loai`            ENUM('anh', 'video') NOT NULL,
  `mime_type`       VARCHAR(50)     NOT NULL,
  `kich_thuoc_byte` INT UNSIGNED    NOT NULL,
  `created_at`      TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmedia_complaint` (`complaint_id`),
  CONSTRAINT `fk_complaint_media_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_cmedia_dung_luong` CHECK ((`loai` = 'anh' AND `kich_thuoc_byte` <= 5242880) OR (`loai` = 'video' AND `kich_thuoc_byte` <= 31457280))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reviews` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED  NOT NULL,
  `product_id` BIGINT UNSIGNED  NOT NULL,
  `order_id`   BIGINT UNSIGNED  NOT NULL,
  `so_sao`     TINYINT UNSIGNED NOT NULL,
  `noi_dung`   VARCHAR(500)     NULL DEFAULT NULL,
  `created_at` TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product_order` (`user_id`, `product_id`, `order_id`),
  KEY `idx_reviews_product` (`product_id`, `created_at`),
  KEY `idx_reviews_order` (`order_id`),
  CONSTRAINT `fk_reviews_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_reviews_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_reviews_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_reviews_sao` CHECK (`so_sao` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id`                        BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `recipient_id`              BIGINT UNSIGNED  NOT NULL,
  `loai`                      ENUM('can_han', 'thieu_hang', 'khieu_nai') NOT NULL,
  `batch_id`                  BIGINT UNSIGNED  NULL DEFAULT NULL,
  `noi_dung`                  VARCHAR(500)     NOT NULL,
  `so_luong_ton_luc_canh_bao` DECIMAL(10,2)    NULL DEFAULT NULL,
  `so_lan_gui`                TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `da_doc`                    TINYINT(1)       NOT NULL DEFAULT 0,
  `created_at`                TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_dedup` (`recipient_id`, `batch_id`, `loai`, `so_luong_ton_luc_canh_bao`),
  KEY `idx_notif_inbox` (`recipient_id`, `da_doc`, `created_at`),
  KEY `idx_notif_batch` (`batch_id`),
  CONSTRAINT `fk_notifications_recipient_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_notifications_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_settings` (
  `khoa`       VARCHAR(60)     NOT NULL,
  `gia_tri`    VARCHAR(255)    NOT NULL,
  `mo_ta`      VARCHAR(255)    NULL DEFAULT NULL,
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`khoa`),
  KEY `idx_settings_updated_by` (`updated_by`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NULL DEFAULT NULL,
  `hanh_dong`    VARCHAR(50)     NOT NULL,
  `doi_tuong`    VARCHAR(50)     NOT NULL,
  `doi_tuong_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `du_lieu_cu`   JSON            NULL,
  `du_lieu_moi`  JSON            NULL,
  `dia_chi_ip`   VARCHAR(45)     NULL DEFAULT NULL,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_doi_tuong` (`doi_tuong`, `doi_tuong_id`),
  KEY `idx_audit_user_time` (`user_id`, `created_at`),
  KEY `idx_audit_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `migrations` (`migration`, `batch`) VALUES
  ('0001_01_01_000000_create_users_table', 1),
  ('0001_01_01_000001_create_cache_table', 1),
  ('0001_01_01_000002_create_jobs_table', 1),
  ('2026_11_23_141426_create_personal_access_tokens_table', 1),
  ('2026_11_24_100000_create_roles_table', 1),
  ('2026_11_24_100001_update_users_table', 1),
  ('2026_11_24_100002_create_categories_table', 1),
  ('2026_11_24_100003_create_seasons_table', 1),
  ('2026_11_24_100004_create_subscription_plans_table', 1),
  ('2026_11_24_100005_create_addresses_table', 1),
  ('2026_11_24_100006_create_products_table', 1),
  ('2026_11_24_100007_create_batches_table', 1),
  ('2026_11_24_100008_create_farming_logs_table', 1),
  ('2026_11_24_100009_create_waste_logs_table', 1),
  ('2026_11_24_100010_create_cart_items_table', 1),
  ('2026_11_24_100011_create_subscriptions_table', 1),
  ('2026_11_24_100012_create_subscription_items_table', 1),
  ('2026_11_24_100013_create_subscription_delivery_days_table', 1),
  ('2026_11_24_100014_create_orders_table', 1),
  ('2026_11_24_100015_create_order_details_table', 1),
  ('2026_11_24_100016_create_payments_table', 1),
  ('2026_11_24_100017_create_delivery_schedules_table', 1),
  ('2026_11_24_100018_create_complaints_table', 1),
  ('2026_11_24_100019_create_complaint_media_table', 1),
  ('2026_11_24_100020_create_reviews_table', 1),
  ('2026_11_24_100021_create_notifications_table', 1),
  ('2026_11_24_100022_create_system_settings_table', 1),
  ('2026_11_24_100023_create_audit_logs_table', 1),
  ('2026_11_25_230000_add_da_thanh_toan_to_orders_status', 1),
  ('2026_11_26_000001_add_complaint_resolution_fields', 1),
  ('2026_11_26_000002_add_delivery_interval_to_subscriptions', 1),
  ('2026_11_26_200000_expand_payment_methods', 1);


-- 4.1 Vai trò RBAC
INSERT INTO `roles` (`id`, `ten_vai_tro`, `mo_ta`) VALUES
  (1, 'customer',   'Khách hàng'),
  (2, 'farm_staff', 'Nhân viên nông trại'),
  (3, 'sales',      'Nhân viên bán hàng'),
  (4, 'admin',      'Quản trị viên');

-- 4.2 Tài khoản (4 vai trò chính + 2 khách hàng khớp phiếu khiếu nại KN-001, KN-002)
INSERT INTO `users` (`id`, `role_id`, `ho_ten`, `email`, `so_dien_thoai`, `password`, `diem_tich_luy`, `so_lan_dang_nhap_sai`, `is_active`, `created_at`, `updated_at`) VALUES
  (1, 1, 'Nguyễn Minh Anh', 'kh0001@nonganhlanh.local', '0901000001', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56', 150, 0, 1, NOW(), NOW()),
  (2, 2, 'Anh Dũng',        'nhanvien@nonganhlanh.local',  '0923456789', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56',   0, 0, 1, NOW(), NOW()),
  (3, 3, 'Thu Hà',          'banhang@nonganhlanh.local',   '0912345678', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56',   0, 0, 1, NOW(), NOW()),
  (4, 4, 'Minh Hoàng',      'admin@nonganhlanh.local',     '0901234567', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56',   0, 0, 1, NOW(), NOW()),
  (5, 1, 'Nguyễn Thu Hương','thuhuong@nonganhlanh.local',  '0901000005', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56',  80, 0, 1, NOW(), NOW()),
  (6, 1, 'Trần Minh Đức',   'minhduc@nonganhlanh.local',   '0901000006', '$2y$12$nU8ZabUkadArjQV5g9TXPepCg5aXw2GUhNZmwmKIn6ASIJkUlxZ56',  60, 0, 1, NOW(), NOW());

-- 4.3  địa chỉ
INSERT INTO `addresses` (`id`, `user_id`, `ten_nguoi_nhan`, `so_dien_thoai`, `dia_chi`, `vi_do`, `kinh_do`, `la_mac_dinh`, `created_at`, `updated_at`) VALUES
  (1, 1, 'Nguyễn Minh Anh',  '0901000001', '12 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',      10.7715950, 106.7013510, 1, NOW(), NOW()),
  (2, 5, 'Nguyễn Thu Hương', '0901000005', '48 Lê Lợi, Quận Ninh Kiều, Cần Thơ',           10.0341850, 105.7875820, 1, NOW(), NOW()),
  (3, 6, 'Trần Minh Đức',    '0901000006', '81 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh',10.8012340, 106.7105430, 1, NOW(), NOW());

-- 4.4 Danh mục
INSERT INTO `categories` (`id`, `parent_id`, `ten_danh_muc`, `slug`, `mo_ta`, `is_active`, `created_at`, `updated_at`) VALUES
  (1, NULL, 'Rau củ',   'rau-cu',   'Rau củ tươi sạch thu hoạch mỗi sớm tại nông trại.', 1, NOW(), NOW()),
  (2, NULL, 'Trái cây', 'trai-cay', 'Trái cây chín tự nhiên, ngọt thanh chuẩn VietGAP.', 1, NOW(), NOW()),
  (3, NULL, 'Lúa gạo',  'lua-gao',  'Gạo ST25 thơm hương và gạo lứt huyết rồng nguyên cám.', 1, NOW(), NOW());

-- 4.5 Mùa vụ tại 4 nông trại 
INSERT INTO `seasons` (`id`, `ten_mua_vu`, `khu_vuc_canh_tac`, `ngay_bat_dau`, `ngay_ket_thuc_du_kien`, `trang_thai`, `created_by`, `created_at`, `updated_at`) VALUES
  (1, 'Vụ Rau Củ Đà Lạt Đông Xuân 2026',  'Nông trại Đà Lạt',    DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'da_thu_hoach', 2, NOW(), NOW()),
  (2, 'Vụ Thủy Canh Mộc Châu 2026',       'Nông trại Mộc Châu',  DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'da_thu_hoach', 2, NOW(), NOW()),
  (3, 'Vụ Rau Xanh Củ Chi 2026',          'Nông trại Củ Chi',    DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'da_thu_hoach', 2, NOW(), NOW()),
  (4, 'Vụ Trái Cây Tiền Giang 2026',      'Nông trại Tiền Giang',DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_ADD(CURDATE(), INTERVAL 40 DAY), 'da_thu_hoach', 2, NOW(), NOW());

-- 4.6 Sản phẩm
INSERT INTO `products` (`id`, `category_id`, `ten_san_pham`, `slug`, `mo_ta`, `hinh_anh_dai_dien`, `gia_ban_co_ban`, `don_vi_tinh`, `is_active`, `created_at`, `updated_at`) VALUES
  (1,  1, 'Cà chua beef',         'ca-chua-beef',        'Cà chua beef hữu cơ chín cây, mọng nước, tuyển chọn trực tiếp từ Nông trại Đà Lạt.', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80', 45000, 'kg',  1, NOW(), NOW()),
  (2,  1, 'Cải bó xôi non',       'cai-bo-xoi-non',      'Cải bó xôi non xanh mướt, thu hoạch sáng sớm, tươi ngon mỗi ngày.',                 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80', 38000, 'kg',  1, NOW(), NOW()),
  (3,  1, 'Khoai tây vàng',       'khoai-tay-vang',      'Khoai tây vàng bùi thơm từ vùng trồng sạch Đà Lạt, không chất bảo quản.',           'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=85', 42000, 'kg',  1, NOW(), NOW()),
  (4,  1, 'Xà lách thủy canh',    'xa-lach-thuy-canh',   'Xà lách thủy canh giòn ngọt, trồng trong nhà màng sạch tại Nông trại Mộc Châu.',    'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=400&q=80', 48000, 'kg',  1, NOW(), NOW()),
  (5,  1, 'Cà rốt baby',          'ca-rot-baby',         'Cà rốt baby ngọt giòn tự nhiên, thu hoạch mới mỗi ngày tại Đà Lạt.',                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=85', 55000, 'kg',  1, NOW(), NOW()),
  (6,  1, 'Bông cải xanh',        'bong-cai-xanh',       'Bông cải xanh giòn tươi từ Nông trại Củ Chi, giàu chất xơ và vitamin.',             'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=400&q=80', 40000, 'kg',  1, NOW(), NOW()),
  (7,  2, 'Dứa mật',              'dua-mat',             'Dứa mật chín tự nhiên, vị ngọt thơm thanh mát từ nhà vườn Tiền Giang.',             'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=500&q=85', 38000, 'kg',  1, NOW(), NOW()),
  (8,  2, 'Chuối già Nam Mỹ',     'chuoi-gia-nam-my',    'Chuối già Nam Mỹ chín tự nhiên, thơm dẻo, phù hợp cho bữa ăn nhẹ lành mạnh.',       'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=85', 32000, 'kg',  1, NOW(), NOW()),
  (9,  2, 'Cam sành mọng nước',   'cam-sanh-mong-nuoc',  'Cam sành mọng nước, vị chua ngọt tự nhiên, thu hoạch tươi trong ngày.',             'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=400&q=80', 56000, 'kg',  1, NOW(), NOW()),
  (10, 2, 'Bơ sáp Đà Lạt',        'bo-sap-da-lat',       'Bơ sáp dẻo vàng, béo bùi tự nhiên, thu hoạch chuẩn độ già tại vườn.',               'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=400&q=80', 32000, 'kg',  1, NOW(), NOW()),
  (11, 3, 'Gạo ST25 thơm hương',  'gao-st25-thom-huong', 'Gạo ST25 hạt dài trắng trong, cơm dẻo thơm hương lá dứa tuyển chọn kỹ càng.',       'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=85', 25000, 'kg',  1, NOW(), NOW()),
  (12, 3, 'Gạo lứt huyết rồng',   'gao-lut-huyet-rong',  'Gạo lứt huyết rồng nguyên cám giàu dinh dưỡng, thơm ngon cho bữa cơm lành.',        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=85', 48000, 'kg',  1, NOW(), NOW());

-- 4.7 Lô hàng 
INSERT INTO `batches` (`id`, `ma_lo`, `product_id`, `season_id`, `ngay_thu_hoach`, `ngay_het_han`, `so_luong_nhap`, `so_luong_ton`, `so_luong_hao_hut`, `qr_code`, `trang_thai`, `created_by`, `created_at`, `updated_at`) VALUES
  (1,  'LH-0248-FEFO', 1,  1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY),    3.00,   3.00,  0.00, 'LH-0248-FEFO', 'con_hang', 2, NOW(), NOW()),
  (2,  'LH-0248',      1,  1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY),  245.00, 235.00,  5.00, 'LH-0248',      'con_hang', 2, NOW(), NOW()),
  (3,  'LH-0247',      4,  2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY),  102.00,  85.00, 12.00, 'LH-0247',      'con_hang', 2, NOW(), NOW()),
  (4,  'LH-0246',      5,  1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 8 DAY),  163.00, 160.00,  0.00, 'LH-0246',      'con_hang', 2, NOW(), NOW()),
  (5,  'LH-0245',      6,  3, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY),   62.00,  62.00,  0.00, 'LH-0245',      'con_hang', 2, NOW(), NOW()),
  (6,  'LH-0244',      2,  3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY),   91.50,  90.00,  0.00, 'LH-0244',      'con_hang', 2, NOW(), NOW()),
  (7,  'LH-0243',      3,  1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 120.00, 120.00,  0.00, 'LH-0243',      'con_hang', 2, NOW(), NOW()),
  (8,  'LH-0242',      7,  4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY),   85.00,  85.00,  0.00, 'LH-0242',      'con_hang', 2, NOW(), NOW()),
  (9,  'LH-0241',      8,  4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY),   95.00,  95.00,  0.00, 'LH-0241',      'con_hang', 2, NOW(), NOW()),
  (10, 'LH-0240',      9,  4, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 110.00, 110.00,  0.00, 'LH-0240',      'con_hang', 2, NOW(), NOW()),
  (11, 'LH-0239',     10,  1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY),   75.00,  75.00,  0.00, 'LH-0239',      'con_hang', 2, NOW(), NOW()),
  (12, 'LH-0238',     11,  4, DATE_SUB(CURDATE(), INTERVAL 10 DAY),DATE_ADD(CURDATE(), INTERVAL 120 DAY),200.00, 180.00,  0.00, 'LH-0238',      'con_hang', 2, NOW(), NOW()),
  (13, 'LH-0237',     12,  4, DATE_SUB(CURDATE(), INTERVAL 10 DAY),DATE_ADD(CURDATE(), INTERVAL 120 DAY),150.00, 140.00,  0.00, 'LH-0237',      'con_hang', 2, NOW(), NOW()),
  (14, 'LH-0236-EXP',  1,  1, DATE_SUB(CURDATE(), INTERVAL 12 DAY),DATE_SUB(CURDATE(), INTERVAL 1 DAY),    5.00,   5.00,  0.00, NULL,           'het_han',  2, NOW(), NOW());

-- 4.8 Nhật ký canh tác 
INSERT INTO `farming_logs` (`batch_id`, `farm_staff_id`, `hanh_dong`, `ghi_chu`, `hinh_anh_minh_chung`, `thoi_gian`) VALUES
  (1, 2, 'cham_soc',  'Theo dõi độ chín đợt thu hoạch sớm tại nhà kính Khu A.',                        NULL,                                                                                          DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (1, 2, 'thu_hoach', 'Thu hoạch đợt sớm 3 kg cà chua beef đạt chuẩn đưa kho mát.',                    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (2, 2, 'gieo_hat',  'Gieo hạt giống cà chua beef hữu cơ trên giá thể sạch tại Nông trại Đà Lạt.',    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80', DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (2, 2, 'cham_soc',  'Kiểm tra độ ẩm đất: độ ẩm ổn định, tiếp tục tưới nhỏ giọt theo lịch.',          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (2, 2, 'thu_hoach', 'Hái tay từng quả chín đỏ, loại bỏ quả dập và đóng gói ngay tại vườn.',          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (3, 2, 'cham_soc',  'Đã loại bỏ lá hư và kiểm tra sâu bệnh sinh học cho lô LH-0247.',                NULL,                                                                                          DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3, 2, 'thu_hoach', 'Thu hoạch xà lách thủy canh sáng sớm, đóng gói giữ lạnh 4 độ C.',               'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=80', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (4, 2, 'thu_hoach', 'Thu hoạch cà rốt baby sạch đất, rửa nước ozon và phân loại tại vườn.',          NULL,                                                                                          DATE_SUB(NOW(), INTERVAL 3 DAY));

-- 4.9 Nhật ký xuất hủy / hao hụt (
INSERT INTO `waste_logs` (`batch_id`, `farm_staff_id`, `so_luong`, `ly_do`, `thoi_gian`) VALUES
  (3, 2, 12.00, 'Sắp hết hạn',                           DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (2, 2,  5.00, 'Dập, hỏng trong quá trình bảo quản',    DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- 4.10 Gói định kỳ (Subscription)
INSERT INTO `subscription_plans` (`id`, `ten_goi`, `mo_ta`, `chu_ky_ngay`, `is_active`, `created_at`, `updated_at`) VALUES
  (1, 'Giỏ nông sản xanh mỗi tuần', 'Giao nông sản tươi sạch định kỳ hàng tuần từ nông trại đến bàn ăn.', 30, 1, NOW(), NOW());

INSERT INTO `subscriptions` (`id`, `user_id`, `plan_id`, `address_id`, `ngay_bat_dau`, `ngay_ket_thuc`, `chu_ky_giao_ngay`, `tong_tien`, `trang_thai`, `created_at`, `updated_at`) VALUES
  (1, 1, 1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 7, 166000, 'dang_hoat_dong', NOW(), NOW());

INSERT INTO `subscription_items` (`subscription_id`, `product_id`, `so_luong_moi_lan`, `don_gia`) VALUES
  (1, 1, 2.00, 45000),
  (1, 2, 2.00, 38000);

INSERT INTO `subscription_delivery_days` (`subscription_id`, `thu_trong_tuan`) VALUES
  (1, 2),
  (1, 5);

INSERT INTO `delivery_schedules` (`subscription_id`, `ngay_giao`, `order_id`, `trang_thai`, `ghi_chu`, `created_at`, `updated_at`) VALUES
  (1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), NULL, 'cho_sinh_don', 'Lịch giao kế tiếp để Job tự sinh đơn định kỳ', NOW(), NOW());

-- 4.11 Đơn hàng 
INSERT INTO `orders` (`id`, `ma_don`, `user_id`, `subscription_id`, `loai_don`, `ten_nguoi_nhan`, `sdt_nguoi_nhan`, `dia_chi_giao`, `khoang_cach_km`, `la_hoa_toc`, `tong_tien_hang`, `phi_van_chuyen`, `tong_thanh_toan`, `trang_thai`, `ngay_giao_du_kien`, `ngay_giao_thuc_te`, `nguoi_duyet_id`, `ngay_duyet`, `ngay_tao`, `ngay_cap_nhat`) VALUES
  (1, 'MN-2482', 1, NULL, 'le', 'Nguyễn Minh Anh',  '0901000001', '12 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',       5.20, 1, 225000, 25000, 250000, 'cho_duyet',   CURDATE(), NULL,                              NULL, NULL,                              NOW(),                           NOW()),
  (2, 'MN-2481', 1, NULL, 'le', 'Trần Thị Lan',     '0901000011', '48 Lê Lợi, Quận Ninh Kiều, Cần Thơ',            6.00, 0,  96000, 20000, 116000, 'cho_duyet',   CURDATE(), NULL,                              NULL, NULL,                              DATE_SUB(NOW(), INTERVAL 1 HOUR),NOW()),
  (3, 'MN-2480', 1, NULL, 'le', 'Lê Hoàng Nam',     '0901000012', '25 Phan Đình Phùng, Đà Lạt, Lâm Đồng',          4.50, 0, 165000, 15000, 180000, 'da_xac_nhan', CURDATE(), NULL,                              3,    DATE_SUB(NOW(), INTERVAL 3 HOUR),  DATE_SUB(NOW(), INTERVAL 5 HOUR),NOW()),
  (4, 'MN-2479', 1, NULL, 'le', 'Phạm Ngọc Mai',    '0901000013', '81 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh', 5.80, 0, 195000, 15000, 210000, 'dang_giao',   CURDATE(), NULL,                              3,    DATE_SUB(NOW(), INTERVAL 6 HOUR),  DATE_SUB(NOW(), INTERVAL 8 HOUR),NOW()),
  (5, 'MN-2476', 5, NULL, 'le', 'Nguyễn Thu Hương', '0901000005', '48 Lê Lợi, Quận Ninh Kiều, Cần Thơ',            5.00, 0,  96000, 15000, 111000, 'da_giao',     CURDATE(), DATE_SUB(NOW(), INTERVAL 4 HOUR),  3,    DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),
  (6, 'MN-2469', 6, NULL, 'le', 'Trần Minh Đức',    '0901000006', '81 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh', 4.80, 0, 135000, 15000, 150000, 'da_giao',     CURDATE(), DATE_SUB(NOW(), INTERVAL 6 HOUR),  3,    DATE_SUB(NOW(), INTERVAL 14 HOUR), DATE_SUB(NOW(), INTERVAL 1 DAY), NOW());

-- 4.12 Chi tiết đơn hàng 
INSERT INTO `order_details` (`order_id`, `product_id`, `batch_id`, `so_luong`, `don_gia`) VALUES
  (1, 1, NULL, 5.00, 45000),  -- 225.000 đ
  (2, 4, NULL, 2.00, 48000),  --  96.000 đ
  (3, 5, 4,    3.00, 55000),  -- 165.000 đ 
  (4, 1, 2,    2.00, 45000),  --  90.000 đ
  (4, 4, 3,    1.00, 48000),  --  48.000 đ 
  (4, 2, 6,    1.50, 38000),  --  57.000 đ
  (5, 4, 3,    2.00, 48000),  --  96.000 đ 
  (6, 1, 2,    3.00, 45000);  -- 135.000 đ 

-- 4.13 Giao dịch thanh toán
INSERT INTO `payments` (`order_id`, `subscription_id`, `phuong_thuc`, `so_tien`, `trang_thai`, `ma_giao_dich`, `thoi_gian_thanh_toan`, `created_at`) VALUES
  (1,    NULL, 'cod',    250000, 'cho_xu_ly',  'COD-MN-2482', NULL,                              NOW()),
  (2,    NULL, 'vietqr', 116000, 'cho_xu_ly',  'VQR-MN-2481', NULL,                              DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (3,    NULL, 'vnpay',  180000, 'thanh_cong', 'VNP-MN-2480', DATE_SUB(NOW(), INTERVAL 4 HOUR),  DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (4,    NULL, 'vietqr', 210000, 'thanh_cong', 'VQR-MN-2479', DATE_SUB(NOW(), INTERVAL 7 HOUR),  DATE_SUB(NOW(), INTERVAL 8 HOUR)),
  (5,    NULL, 'momo',   111000, 'thanh_cong', 'MMO-MN-2476', DATE_SUB(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (6,    NULL, 'vnpay',  150000, 'thanh_cong', 'VNP-MN-2469', DATE_SUB(NOW(), INTERVAL 22 HOUR), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (NULL, 1,    'vnpay',  166000, 'thanh_cong', 'VNP-SUB-001', NOW(),                             NOW());

-- 4.14 Khiếu nại & minh chứng 
INSERT INTO `complaints` (`id`, `order_id`, `user_id`, `ly_do`, `mo_ta`, `trang_thai`, `created_at`) VALUES
  (1, 5, 5, 'dap_nat',      'Xà lách bị dập khi giao', 'cho_xu_ly', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (2, 6, 6, 'sai_san_pham', 'Yêu cầu đổi cà chua',     'cho_xu_ly', DATE_SUB(NOW(), INTERVAL 1 HOUR));

INSERT INTO `complaint_media` (`complaint_id`, `media_url`, `loai`, `mime_type`, `kich_thuoc_byte`, `created_at`) VALUES
  (1, 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=80', 'anh', 'image/jpeg', 245000, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (2, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', 'anh', 'image/jpeg', 268000, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 4.15 Đánh giá sản phẩm
INSERT INTO `reviews` (`user_id`, `product_id`, `order_id`, `so_sao`, `noi_dung`, `created_at`) VALUES
  (6, 1, 6, 5, 'Cà chua beef tươi ngon, quét mã QR xem được rõ nhật ký canh tác Đà Lạt.', DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 4.16 Cảnh báo cận hạn cho Sales (UC05.2)
INSERT INTO `notifications` (`recipient_id`, `loai`, `batch_id`, `noi_dung`, `so_luong_ton_luc_canh_bao`, `so_lan_gui`, `da_doc`, `created_at`) VALUES
  (3, 'can_han', 1, 'Cảnh báo đỏ: Lô LH-0248-FEFO (Cà chua beef) chỉ còn 1 ngày hết hạn, tồn 3.00 kg.',  3.00, 1, 0, NOW()),
  (3, 'can_han', 3, 'Cảnh báo đỏ: Lô LH-0247 (Xà lách thủy canh) chỉ còn 2 ngày hết hạn, tồn 85.00 kg.',85.00, 1, 0, NOW());

-- 4.17 Cấu hình hệ thống
INSERT INTO `system_settings` (`khoa`, `gia_tri`, `mo_ta`, `updated_by`, `updated_at`) VALUES
  ('canh_bao_can_han_ngay', '2',     'Số ngày còn lại trước hạn sử dụng để cảnh báo đỏ cho Sales', 4, NOW()),
  ('thoi_han_khieu_nai_gio','24',    'Số giờ tối đa cho phép gửi khiếu nại sau khi nhận hàng',     4, NOW()),
  ('phi_ship_co_ban',       '15000', 'Phí giao hàng tiêu chuẩn nội thành (VNĐ)',                   4, NOW());

-- 4.18 Nhật ký kiểm toán 
INSERT INTO `audit_logs` (`user_id`, `hanh_dong`, `doi_tuong`, `doi_tuong_id`, `du_lieu_cu`, `du_lieu_moi`, `dia_chi_ip`, `created_at`) VALUES
  (3, 'duyet_don_hang',    'orders',  3, JSON_OBJECT('trang_thai', 'cho_duyet'),  JSON_OBJECT('trang_thai', 'da_xac_nhan', 'nguoi_duyet_id', 3), '127.0.0.1', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (2, 'ghi_nhan_xuat_huy', 'batches', 2, JSON_OBJECT('so_luong_ton', 240.00),     JSON_OBJECT('so_luong_ton', 235.00, 'so_luong_hao_hut', 5.00), '127.0.0.1', DATE_SUB(NOW(), INTERVAL 3 HOUR));
