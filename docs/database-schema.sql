-- Generated from docs/tu-dien-du-lieu-tuan-3.xlsx (208-column data dictionary).
-- Requires MySQL 8.0.16+ for enforced CHECK constraints.
-- Laravel framework support tables are intentionally separate from these 24 business tables.
-- Use this file OR `php artisan migrate` to initialize the business schema; do not run both.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `roles` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_vai_tro` VARCHAR(30) NOT NULL,
  `mo_ta` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_ten_vai_tro` (`ten_vai_tro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `ho_ten` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `so_dien_thoai` VARCHAR(15) NULL,
  `password` VARCHAR(255) NOT NULL,
  `diem_tich_luy` INT UNSIGNED NOT NULL DEFAULT 0,
  `so_lan_dang_nhap_sai` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `khoa_den` DATETIME NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `email_verified_at` TIMESTAMP NULL,
  `remember_token` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_so_dien_thoai` (`so_dien_thoai`),
  KEY `idx_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_users_diem` CHECK (diem_tich_luy >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `ten_nguoi_nhan` VARCHAR(100) NOT NULL,
  `so_dien_thoai` VARCHAR(15) NOT NULL,
  `dia_chi` VARCHAR(255) NOT NULL,
  `vi_do` DECIMAL(10,7) NULL,
  `kinh_do` DECIMAL(10,7) NULL,
  `la_mac_dinh` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` INT UNSIGNED NULL,
  `ten_danh_muc` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `mo_ta` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_parent_id` (`parent_id`),
  CONSTRAINT `fk_categories_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `seasons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_mua_vu` VARCHAR(120) NOT NULL,
  `khu_vuc_canh_tac` VARCHAR(100) NULL,
  `ngay_bat_dau` DATE NOT NULL,
  `ngay_ket_thuc_du_kien` DATE NULL,
  `trang_thai` ENUM('dang_canh_tac','da_thu_hoach','ket_thuc') NOT NULL DEFAULT 'dang_canh_tac',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_seasons_trang_thai` (`trang_thai`),
  KEY `idx_seasons_created_by` (`created_by`),
  CONSTRAINT `fk_seasons_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_seasons_ngay` CHECK (ngay_ket_thuc_du_kien IS NULL OR ngay_ket_thuc_du_kien >= ngay_bat_dau)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `subscription_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_goi` VARCHAR(120) NOT NULL,
  `mo_ta` VARCHAR(255) NULL,
  `chu_ky_ngay` SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plans_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `ten_san_pham` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `mo_ta` TEXT NULL,
  `hinh_anh_dai_dien` VARCHAR(255) NULL,
  `gia_ban_co_ban` DECIMAL(12,0) NOT NULL DEFAULT 0,
  `don_vi_tinh` VARCHAR(20) NOT NULL DEFAULT 'kg',
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_category_active` (`category_id`, `is_active`),
  FULLTEXT KEY `ft_products_ten` (`ten_san_pham`),
  CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_products_gia` CHECK (gia_ban_co_ban >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_lo` VARCHAR(30) NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `season_id` BIGINT UNSIGNED NULL,
  `ngay_thu_hoach` DATE NULL,
  `ngay_het_han` DATE NULL,
  `so_luong_nhap` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `so_luong_ton` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `so_luong_hao_hut` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `qr_code` VARCHAR(255) NULL,
  `trang_thai` ENUM('dang_canh_tac','da_thu_hoach','con_hang','het_hang','het_han') NOT NULL DEFAULT 'dang_canh_tac',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batches_ma_lo` (`ma_lo`),
  UNIQUE KEY `uq_batches_qr_code` (`qr_code`),
  KEY `idx_batches_ngay_het_han` (`ngay_het_han`),
  KEY `idx_batches_fefo` (`product_id`, `trang_thai`, `ngay_het_han`, `ngay_thu_hoach`),
  UNIQUE KEY `uq_batches_id_product` (`id`, `product_id`),
  KEY `idx_batches_season_id` (`season_id`),
  KEY `idx_batches_created_by` (`created_by`),
  CONSTRAINT `fk_batches_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_batches_season_id` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_batches_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_batches_ton` CHECK (so_luong_ton >= 0),
  CONSTRAINT `chk_batches_nhap` CHECK (so_luong_nhap >= 0 AND so_luong_hao_hut >= 0),
  CONSTRAINT `chk_batches_can_bang` CHECK (so_luong_ton + so_luong_hao_hut <= so_luong_nhap),
  CONSTRAINT `chk_batches_ngay` CHECK (ngay_het_han IS NULL OR ngay_thu_hoach IS NULL OR ngay_het_han >= ngay_thu_hoach),
  CONSTRAINT `chk_batches_da_thu_hoach` CHECK (trang_thai = 'dang_canh_tac' OR (ngay_thu_hoach IS NOT NULL AND ngay_het_han IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `farming_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `farm_staff_id` BIGINT UNSIGNED NOT NULL,
  `hanh_dong` ENUM('gieo_hat','bon_phan','tuoi_nuoc','phun_thuoc','cham_soc','thu_hoach','khac') NOT NULL,
  `ghi_chu` TEXT NULL,
  `hinh_anh_minh_chung` VARCHAR(255) NULL,
  `thoi_gian` DATETIME NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farming_logs_batch_time` (`batch_id`, `thoi_gian`),
  KEY `idx_farming_logs_staff` (`farm_staff_id`),
  CONSTRAINT `fk_farming_logs_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_farming_logs_farm_staff_id` FOREIGN KEY (`farm_staff_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `waste_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `farm_staff_id` BIGINT UNSIGNED NOT NULL,
  `so_luong` DECIMAL(10,2) NOT NULL,
  `ly_do` VARCHAR(255) NOT NULL,
  `thoi_gian` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_waste_logs_batch` (`batch_id`, `thoi_gian`),
  KEY `idx_waste_logs_staff` (`farm_staff_id`),
  CONSTRAINT `fk_waste_logs_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_waste_logs_farm_staff_id` FOREIGN KEY (`farm_staff_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_waste_so_luong` CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `so_luong` DECIMAL(8,2) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_user_product` (`user_id`, `product_id`),
  KEY `idx_cart_product` (`product_id`),
  CONSTRAINT `fk_cart_items_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_cart_so_luong` CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` INT UNSIGNED NOT NULL,
  `address_id` BIGINT UNSIGNED NOT NULL,
  `ngay_bat_dau` DATE NOT NULL,
  `ngay_ket_thuc` DATE NOT NULL,
  `tong_tien` DECIMAL(12,0) NOT NULL DEFAULT 0,
  `trang_thai` ENUM('cho_thanh_toan','dang_hoat_dong','tam_dung','het_han','da_huy') NOT NULL DEFAULT 'cho_thanh_toan',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user_trang_thai` (`user_id`, `trang_thai`),
  KEY `idx_subs_trang_thai_ket_thuc` (`trang_thai`, `ngay_ket_thuc`),
  KEY `idx_subs_plan` (`plan_id`),
  KEY `idx_subs_address` (`address_id`),
  CONSTRAINT `fk_subscriptions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_subscriptions_plan_id` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_subscriptions_address_id` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_subs_ngay` CHECK (ngay_ket_thuc > ngay_bat_dau),
  CONSTRAINT `chk_subs_tien` CHECK (tong_tien >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don` VARCHAR(20) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `subscription_id` BIGINT UNSIGNED NULL,
  `loai_don` ENUM('le','dinh_ky') NOT NULL DEFAULT 'le',
  `ten_nguoi_nhan` VARCHAR(100) NOT NULL,
  `sdt_nguoi_nhan` VARCHAR(15) NOT NULL,
  `dia_chi_giao` VARCHAR(255) NOT NULL,
  `khoang_cach_km` DECIMAL(6,2) NULL,
  `la_hoa_toc` BOOLEAN NOT NULL DEFAULT 0,
  `tong_tien_hang` DECIMAL(12,0) NOT NULL DEFAULT 0,
  `phi_van_chuyen` DECIMAL(12,0) NOT NULL DEFAULT 0,
  `tong_thanh_toan` DECIMAL(12,0) NOT NULL DEFAULT 0,
  `trang_thai` ENUM('cho_duyet','da_xac_nhan','dang_giao','da_giao','da_huy','hoan_tien','giao_bu') NOT NULL DEFAULT 'cho_duyet',
  `ngay_giao_du_kien` DATE NULL,
  `ngay_giao_thuc_te` DATETIME NULL,
  `nguoi_duyet_id` BIGINT UNSIGNED NULL,
  `ngay_duyet` DATETIME NULL,
  `ghi_chu` VARCHAR(255) NULL,
  `ngay_tao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_ma_don` (`ma_don`),
  KEY `idx_orders_trang_thai_ngay_tao` (`trang_thai`, `ngay_tao`),
  KEY `idx_orders_user_ngay_tao` (`user_id`, `ngay_tao`),
  KEY `idx_orders_subscription` (`subscription_id`),
  KEY `idx_orders_nguoi_duyet` (`nguoi_duyet_id`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_orders_nguoi_duyet_id` FOREIGN KEY (`nguoi_duyet_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_orders_tong` CHECK (tong_thanh_toan = tong_tien_hang + phi_van_chuyen),
  CONSTRAINT `chk_orders_tien` CHECK (tong_tien_hang >= 0 AND phi_van_chuyen >= 0),
  CONSTRAINT `chk_orders_loai` CHECK ((loai_don = 'dinh_ky') = (subscription_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `order_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_id` BIGINT UNSIGNED NULL,
  `so_luong` DECIMAL(8,2) NOT NULL,
  `don_gia` DECIMAL(12,0) NOT NULL,
  `thanh_tien` DECIMAL(14,0) GENERATED ALWAYS AS (so_luong * don_gia) STORED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_od_order` (`order_id`),
  KEY `idx_od_batch` (`batch_id`),
  KEY `idx_od_product` (`product_id`),
  CONSTRAINT `fk_order_details_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_order_details_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_order_details_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_od_batch_product` FOREIGN KEY (`batch_id`, `product_id`) REFERENCES `batches` (`id`, `product_id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_od_so_luong` CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NULL,
  `subscription_id` BIGINT UNSIGNED NULL,
  `phuong_thuc` ENUM('cod','momo','vnpay') NOT NULL,
  `so_tien` DECIMAL(12,0) NOT NULL,
  `trang_thai` ENUM('cho_xu_ly','thanh_cong','that_bai','hoan_tien') NOT NULL DEFAULT 'cho_xu_ly',
  `ma_giao_dich` VARCHAR(100) NULL,
  `thoi_gian_thanh_toan` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_ma_giao_dich` (`ma_giao_dich`),
  KEY `idx_payments_order` (`order_id`),
  KEY `idx_payments_subscription` (`subscription_id`),
  CONSTRAINT `fk_payments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_payments_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_payments_doi_tuong` CHECK ((order_id IS NULL) <> (subscription_id IS NULL)),
  CONSTRAINT `chk_payments_tien` CHECK (so_tien > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `subscription_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `so_luong_moi_lan` DECIMAL(8,2) NOT NULL,
  `don_gia` DECIMAL(12,0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_items` (`subscription_id`, `product_id`),
  KEY `idx_sub_items_product` (`product_id`),
  CONSTRAINT `fk_subscription_items_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_subscription_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_sub_items_sl` CHECK (`so_luong_moi_lan` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_delivery_days` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED NOT NULL,
  `thu_trong_tuan` TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_days` (`subscription_id`, `thu_trong_tuan`),
  CONSTRAINT `fk_subscription_delivery_days_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_sub_days_thu` CHECK (thu_trong_tuan BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `delivery_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED NOT NULL,
  `ngay_giao` DATE NOT NULL,
  `order_id` BIGINT UNSIGNED NULL,
  `trang_thai` ENUM('cho_sinh_don','da_sinh_don','thieu_hang','da_doi_san_pham','bo_qua','da_giao') NOT NULL DEFAULT 'cho_sinh_don',
  `ghi_chu` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sched_sub_ngay` (`subscription_id`, `ngay_giao`),
  KEY `idx_sched_ngay_trang_thai` (`ngay_giao`, `trang_thai`),
  UNIQUE KEY `uq_sched_order` (`order_id`),
  CONSTRAINT `fk_delivery_schedules_subscription_id` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_schedules_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `complaints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `ly_do` ENUM('dap_nat','hu_hong','thieu_hang','sai_san_pham','khac') NOT NULL,
  `mo_ta` TEXT NULL,
  `trang_thai` ENUM('cho_xu_ly','hoan_tien','giao_bu','tu_choi') NOT NULL DEFAULT 'cho_xu_ly',
  `ly_do_tu_choi` VARCHAR(255) NULL,
  `nguoi_xu_ly_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `xu_ly_luc` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_complaints_order` (`order_id`),
  KEY `idx_complaints_trang_thai` (`trang_thai`, `created_at`),
  KEY `idx_complaints_user` (`user_id`),
  KEY `idx_complaints_nguoi_xu_ly` (`nguoi_xu_ly_id`),
  CONSTRAINT `fk_complaints_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_complaints_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_complaints_nguoi_xu_ly_id` FOREIGN KEY (`nguoi_xu_ly_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_complaints_tu_choi` CHECK (trang_thai <> 'tu_choi' OR ly_do_tu_choi IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `complaint_media` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `media_url` VARCHAR(255) NOT NULL,
  `loai` ENUM('anh','video') NOT NULL,
  `mime_type` VARCHAR(50) NOT NULL,
  `kich_thuoc_byte` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cmedia_complaint` (`complaint_id`),
  CONSTRAINT `fk_complaint_media_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_cmedia_dung_luong` CHECK ((loai = 'anh' AND kich_thuoc_byte <= 5242880) OR (loai = 'video' AND kich_thuoc_byte <= 31457280))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `so_sao` TINYINT UNSIGNED NOT NULL,
  `noi_dung` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_product_order` (`user_id`, `product_id`, `order_id`),
  KEY `idx_reviews_product` (`product_id`, `created_at`),
  KEY `idx_reviews_order` (`order_id`),
  CONSTRAINT `fk_reviews_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_sao` CHECK (so_sao BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_id` BIGINT UNSIGNED NOT NULL,
  `loai` ENUM('can_han','thieu_hang','khieu_nai') NOT NULL,
  `batch_id` BIGINT UNSIGNED NULL,
  `noi_dung` VARCHAR(500) NOT NULL,
  `so_luong_ton_luc_canh_bao` DECIMAL(10,2) NULL,
  `so_lan_gui` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `da_doc` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_dedup` (`recipient_id`, `batch_id`, `loai`, `so_luong_ton_luc_canh_bao`),
  KEY `idx_notif_inbox` (`recipient_id`, `da_doc`, `created_at`),
  KEY `idx_notif_batch` (`batch_id`),
  CONSTRAINT `fk_notifications_recipient_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_batch_id` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `system_settings` (
  `khoa` VARCHAR(60) NOT NULL,
  `gia_tri` VARCHAR(255) NOT NULL,
  `mo_ta` VARCHAR(255) NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`khoa`),
  KEY `idx_settings_updated_by` (`updated_by`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `hanh_dong` VARCHAR(50) NOT NULL,
  `doi_tuong` VARCHAR(50) NOT NULL,
  `doi_tuong_id` BIGINT UNSIGNED NULL,
  `du_lieu_cu` JSON NULL,
  `du_lieu_moi` JSON NULL,
  `dia_chi_ip` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_doi_tuong` (`doi_tuong`, `doi_tuong_id`),
  KEY `idx_audit_user_time` (`user_id`, `created_at`),
  KEY `idx_audit_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Guest is unauthenticated; only the four authenticated roles are stored.
INSERT INTO roles (ten_vai_tro, mo_ta) VALUES
    ('customer', 'Khách hàng'),
    ('farm_staff', 'Nhân viên nông trại'),
    ('sales', 'Nhân viên bán hàng'),
    ('admin', 'Quản trị viên');
