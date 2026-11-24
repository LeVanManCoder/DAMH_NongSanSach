# AI_CONTEXT - WEBSITE THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN SẠCH (NÔNG LÀNH)

## 1. Tổng quan & Kiến trúc hệ thống
- **Mô hình kinh doanh:** Thương mại điện tử nông sản sạch kết nối trực tiếp nông trại đơn lẻ (Single Farm) đến người tiêu dùng.
- **Kiến trúc:** Client–Server tách biệt (Decoupled Monorepo):
  - `backend/`: Laravel (PHP 8.x) xây dựng **RESTful API** (`routes/api.php`), trả về JSON thống nhất.
  - `frontend/`: **ReactJS + Vite + Tailwind CSS**, giao diện SPA chuẩn **Mobile-first** (từ 360px trở lên)[cite: 7, 9].
  - **Cơ sở dữ liệu:** MySQL 8 (InnoDB, utf8mb4), chuẩn hóa 3NF gồm **24 bảng**[cite: 9].

## 2. Phân quyền RBAC & Vùng cấm tuyệt đối (4 vai trò đăng nhập + Guest)
Mọi API yêu cầu xác thực bằng **JWT** (thiếu/sai trả `401`, sai vai trò trả `403` qua Middleware `CheckRole`)[cite: 9]:
1. **Guest (Khách vãng lai):** Xem sản phẩm, đăng ký/đăng nhập, quét mã QR truy xuất nguồn gốc công khai[cite: 9].
2. **Customer (Khách hàng):** Đặt đơn lẻ, đăng ký gói định kỳ (Subscription), đánh giá, gửi khiếu nại kèm ảnh/video trong vòng **24 giờ** từ lúc đơn chuyển `Đã giao`[cite: 9].
3. **Farm Staff (Nhân viên nông trại):** Quản lý mùa vụ, tạo lô hàng mới (`batches`), cập nhật nhật ký canh tác (`farming_logs`), sinh mã QR sau thu hoạch, ghi nhận xuất hủy/hao hụt (`waste_logs`)[cite: 9]. **CẤM TUYỆT ĐỐI (`403`):** Xem danh sách đơn hàng, thông tin khách hàng, doanh thu[cite: 9].
4. **Sales (Nhân viên bán hàng):** Xem & duyệt đơn hàng (kích hoạt trừ kho FEFO), tính phí vận chuyển, nhận cảnh báo đỏ lô cận hạn (mặc định ≤ 2 ngày), xử lý khiếu nại (Hoàn tiền/Giao bù)[cite: 9]. **CẤM TUYỆT ĐỐI (`403`):** Tạo lô mới, sửa tồn kho thủ công, sửa nhật ký canh tác, ghi nhận xuất hủy[cite: 9].
5. **Admin (Quản trị viên):** Quản lý danh mục, nhân sự, xem báo cáo thống kê, cấu hình ngưỡng cảnh báo xả hàng (`system_settings`), xem `audit_logs`[cite: 9]. **CẤM:** Sửa lịch sử canh tác của lô đã thu hoạch[cite: 9].

## 3. Các quy tắc nghiệp vụ cốt lõi (Bắt buộc tuân thủ khi viết code)
1. **Quản lý kho theo Lô & Trừ kho FEFO (`FefoService.php`):**
   - Tồn kho nằm ở bảng `batches` (`so_luong_ton`), KHÔNG nằm ở `products`[cite: 9].
   - Khi Sales duyệt đơn, hệ thống chạy trong **Database Transaction** kèm khóa dòng (`FOR UPDATE`), lấy các lô `trang_thai = 'con_hang'`, `so_luong_ton > 0`, `ngay_het_han >= CURDATE()`, sắp xếp theo `ngay_het_han ASC, ngay_thu_hoach ASC` để trừ dần[cite: 9].
   - Lưu vết từng lô đã xuất vào `order_details.batch_id`[cite: 9]. Tồn kho không bao giờ được phép âm (`so_luong_ton >= 0`)[cite: 9].
2. **Nhật ký canh tác & Truy xuất QR:**
   - Chỉ sinh mã QR (`qr_code` duy nhất) khi lô ở trạng thái `da_thu_hoach` và có ít nhất 1 bản ghi trong `farming_logs`[cite: 9].
   - Khi lô đã thu hoạch, không cho sửa/xóa các mốc canh tác trước đó[cite: 9].
3. **Gói định kỳ (Subscription):**
   - Khách chọn gói, sản phẩm, các thứ giao trong tuần (`subscription_delivery_days`) và thanh toán trước 1 tháng[cite: 9].
   - Laravel Scheduler tự động quét `delivery_schedules` để sinh đơn con vào bảng `orders` trước ngày giao 1 ngày[cite: 9].
4. **Khiếu nại & Upload Media:**
   - Tự động từ chối nếu gửi sau 24h kể từ lúc giao[cite: 9]. Bắt buộc đính kèm minh chứng: ảnh (`JPG/PNG/WEBP` ≤ 5MB) hoặc video (`MP4` ≤ 30MB), kiểm tra cả đuôi file và MIME type ở Backend[cite: 9].
5. **Dịch vụ bên thứ 3 (Loose Coupling):**
   - Thanh toán (MoMo/VNPay), Phí ship (Google Maps/Ahamove), Media (Cloudinary/S3) phải viết qua Interface/Service có sẵn lớp **Mock Service** dự phòng khi chạy local/test[cite: 9].

## 4. Quy chuẩn Code & Git
- Branching: `main` <- `develop` <- `feature/<ten-chuc-nang>`[cite: 9].
- Conventional Commits tiếng Việt có dấu (VD: `feat: bổ sung thuật toán xuất kho FEFO`)[cite: 9].
## Quy tắc hỗ trợ dự án dành cho AI

- Tuyệt đối không tự động chạy `git commit` hoặc `git push`. Chỉ thực hiện khi người dùng yêu cầu rõ ràng.
- Tuyệt đối không chèn dòng `Co-authored-by:` hoặc bất kỳ dấu vết đồng tác giả AI nào vào commit message.
- Mọi commit message phải viết bằng tiếng Việt có dấu, ngắn gọn và theo chuẩn Conventional Commits với các type được phép: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.
