# PHỤ LỤC: HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG PHẦN MỀM

Tài liệu này hướng dẫn chi tiết quy trình cài đặt môi trường phát triển/vận hành (Backend Laravel RESTful API & Frontend ReactJS) và quy trình thao tác nghiệp vụ dành cho 03 nhóm vai trò quản trị nội bộ của hệ thống **Website Thương mại điện tử Nông sản sạch (Nông Lành)**.

---

## PHỤ LỤC A: HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY HỆ THỐNG

### A.1. Yêu cầu môi trường hệ thống
Để triển khai và chạy thử nghiệm hệ thống trên máy cục bộ hoặc máy chủ, môi trường cần đáp ứng các phiên bản phần mềm tối thiểu sau:
* **Hệ quản trị CSDL:** MySQL 8.0 hoặc MariaDB 10.4 trở lên (hỗ trợ bộ mã `utf8mb4_unicode_ci` và `CHECK constraints`).
* **Môi trường Backend:** PHP $\ge$ 8.2 (bật các extension: `pdo_mysql`, `mbstring`, `openssl`, `curl`, `gd`, `fileinfo`), Composer $\ge$ 2.5.
* **Môi trường Frontend:** Node.js $\ge$ 18.x và npm $\ge$ 9.x.
* **Công cụ quản lý mã nguồn:** Git.

### A.2. Tải mã nguồn từ kho lưu trữ GitHub
Mở Terminal / Command Prompt và thực hiện lệnh tải mã nguồn dự án:

```bash
git clone https://github.com/LeVanManCoder/DAMH_NongSanSach.git
cd DAMH_NongSanSach
```

### A.3. Cài đặt và khởi chạy phân hệ Backend (Laravel RESTful API)

1. **Di chuyển vào thư mục `backend` và cài đặt thư viện phụ thuộc:**
   ```bash
   cd backend
   composer install
   ```

2. **Tạo tệp cấu hình môi trường `.env`:**
   ```bash
   cp .env.example .env
   ```
   Mở tệp `backend/.env` và cập nhật thông tin kết nối cơ sở dữ liệu cùng các dịch vụ tích hợp:
   ```env
   APP_NAME="Nong Lanh API"
   APP_URL=http://127.0.0.1:8000

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=nong_san_sach
   DB_USERNAME=root
   DB_PASSWORD=

   # Cấu hình Cloudinary (Lưu trữ ảnh đám mây - để trống sẽ tự lưu local)
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=

   # Cấu hình thanh toán VietQR động
   VIETQR_BANK_ID=MB
   VIETQR_ACCOUNT_NO=0984938121
   VIETQR_ACCOUNT_NAME="LE VAN MAN"
   VIETQR_TEMPLATE=compact2
   ```

3. **Sinh khóa bảo mật ứng dụng, khóa JWT và liên kết thư mục lưu trữ:**
   ```bash
   php artisan key:generate
   php artisan jwt:secret
   php artisan storage:link
   ```

4. **Khởi tạo 24 bảng cơ sở dữ liệu và nạp dữ liệu mẫu (Seeder):**
   ```bash
   php artisan migrate --seed
   ```

5. **Khởi chạy máy chủ API và kiểm tra tài liệu Swagger:**
   ```bash
   php artisan serve
   ```
   * Địa chỉ API gốc: `http://127.0.0.1:8000/api`
   * Tài liệu Swagger UI: `http://127.0.0.1:8000/api/documentation`

### A.4. Cài đặt và khởi chạy phân hệ Frontend (ReactJS + Vite)

1. **Mở cửa sổ Terminal thứ hai, di chuyển vào thư mục `frontend` và cài đặt gói thư viện:**
   ```bash
   cd frontend
   npm install
   ```

2. **Cấu hình biến môi trường kết nối API:**
   ```bash
   cp .env.example .env
   ```
   Đảm bảo biến `VITE_API_BASE_URL` trong `frontend/.env` trỏ đúng về máy chủ Backend:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```

3. **Khởi chạy giao diện người dùng:**
   ```bash
   npm run dev
   ```
   * Truy cập ứng dụng trên trình duyệt tại địa chỉ: `http://localhost:5173`

### A.5. Danh sách tài khoản kiểm thử mặc định
Sau khi chạy lệnh `php artisan migrate --seed`, hệ thống tự động khởi tạo sẵn bộ tài khoản cho đầy đủ 04 vai trò RBAC để đăng nhập và kiểm thử:

| STT | Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Phạm vi truy cập giao diện |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Super Admin** | `admin@nonganhlanh.local` | `Password@123` | `/admin` (Thống kê, Tài khoản, Cấu hình, Audit Log) |
| 2 | **Sales (Bán hàng)** | `sales@nonganhlanh.local` | `Password@123` | `/staff/orders`, `/staff/complaints` (Duyệt đơn FEFO, Khiếu nại) |
| 3 | **Farm Staff (Nông trại)** | `farm@nonganhlanh.local` | `Password@123` | `/farm` (Mùa vụ, Lô hàng, Nhật ký canh tác, QR, Xuất hủy) |
| 4 | **Customer (Khách hàng)** | `khachhang@nonganhlanh.local` | `Password@123` | `/`, `/cart`, `/checkout`, `/orders`, `/subscriptions` |

### A.6. Chạy hàng đợi và Scheduler cho gói định kỳ

Backend dùng `QUEUE_CONNECTION=database` mặc định. Sau khi chạy migration, mở terminal tại `backend/` và khởi động worker để xử lý các đơn định kỳ đã được đưa vào queue:

```bash
php artisan queue:work --tries=3
```

Có thể kiểm tra thủ công việc quét lịch giao đến hạn bằng lệnh:

```bash
php artisan subscriptions:dispatch-due
```

Lệnh này chỉ dispatch lịch `cho_sinh_don` có ngày giao đến hạn và gói đang hoạt động, chưa tự tạo lịch giao tương lai. Job tạo order con và cập nhật lịch trong cùng transaction; chạy lại Job không tạo đơn trùng.

Trên máy chủ, cấu hình cron gọi Laravel Scheduler mỗi phút để lịch chạy hằng ngày được thực thi:

```cron
* * * * * cd /path/to/DAMH_NongSanSach/backend && php artisan schedule:run >> /dev/null 2>&1
```

Queue worker phải luôn chạy riêng với web server. Khi triển khai phiên bản mới, restart worker để nạp code mới bằng `php artisan queue:restart`.

---

## PHỤ LỤC B: HƯỚNG DẪN SỬ DỤNG PHẦN MỀM THEO VAI TRÒ

### B.1. Hướng dẫn dành cho Nhân viên Nông trại (Farm Staff)
Nhân viên Nông trại chịu trách nhiệm quản lý quy trình sản xuất tại vườn, tạo lô thu hoạch, ghi nhật ký minh bạch nguồn gốc và phát hành mã QR. *(Lưu ý: Tài khoản Farm Staff không thể truy cập thông tin đơn hàng hay doanh thu của khách hàng).*

* **Bước 1 – Đăng nhập & Truy cập phân hệ Nông trại:**
  1. Truy cập trang đăng nhập (`/login`), nhập tài khoản `farm@nonganhlanh.local` / `Password@123`.
  2. Hệ thống tự động điều hướng đến trang **Quản lý Lô hàng & Canh tác (`/farm`)**.

* **Bước 2 – Khởi tạo Lô hàng mới (`Batch`):**
  1. Tại khu vực tạo lô mới, chọn **Sản phẩm nông sản** (ví dụ: *Cà chua hữu cơ*) và **Mùa vụ** tương ứng.
  2. Nhập **Mã lô** định danh (ví dụ: `LO-CACHUA-2026-01`), **Ngày gieo trồng / thu hoạch dự kiến** và **Sản lượng nhập (kg)**.
  3. Nhấn **Lưu lô hàng**. Lô mới khởi tạo mặc định ở trạng thái `dang_canh_tac`.

* **Bước 3 – Cập nhật Nhật ký canh tác kèm hình ảnh:**
  1. Chọn lô hàng đang chăm sóc trong danh sách, mở biểu mẫu **Thêm nhật ký canh tác**.
  2. Chọn loại hoạt động (*Gieo hạt*, *Bón phân hữu cơ*, *Tưới nước*, *Kiểm định chất lượng*), nhập thời gian thực hiện và ghi chú chi tiết.
  3. Tải lên hình ảnh chụp thực tế tại luống (định dạng JPG/PNG, dung lượng $\le$ 5MB). Ảnh sẽ tự động được nén và lưu trữ lên đám mây Cloudinary.

* **Bước 4 – Xác nhận Thu hoạch, Sinh và In mã QR truy xuất:**
  1. Khi nông sản đến kỳ thu hoạch, cập nhật trạng thái lô hàng sang **Đã thu hoạch (`da_thu_hoach`)** / **Còn hàng (`con_hang`)** và chốt **Ngày thu hoạch**, **Hạn sử dụng** thực tế.
  2. Nhấn nút **Sinh mã QR** trên thẻ lô hàng *(Điều kiện bắt buộc: lô đã thu hoạch và có tối thiểu 01 bản ghi nhật ký canh tác)*.
  3. Hệ thống hiển thị hình ảnh mã QR duy nhất của lô. Nhân viên nhấn **Tải mã QR / In tem** để dán lên bao bì nông sản. Khách hàng quét mã này bằng điện thoại sẽ mở trực tiếp trang `/trace/{ma_qr}` xem toàn bộ lịch sử chăm sóc mà không cần đăng nhập.

* **Bước 5 – Ghi nhận Xuất hủy / Hao hụt tồn kho:**
  1. Khi kiểm tra kho phát hiện nông sản bị hư hỏng hoặc dập nát, nhấn nút **Ghi nhận xuất hủy** tại lô tương ứng.
  2. Nhập **Số lượng hao hụt** (không vượt quá tồn kho hiện tại của lô) và **Lý do xuất hủy**, sau đó xác nhận. Hệ thống tự động trừ tồn kho thực tế và lưu vết vào bảng `waste_logs`.

---

### B.2. Hướng dẫn dành cho Nhân viên Bán hàng (Sales)
Nhân viên Bán hàng đảm nhận việc kiểm tra đơn đặt hàng, kích hoạt xuất kho tự động theo nguyên tắc FEFO, theo dõi hàng cận hạn và giải quyết khiếu nại sau bán hàng.

* **Bước 1 – Đăng nhập & Theo dõi danh sách đơn hàng:**
  1. Đăng nhập bằng tài khoản `sales@nonganhlanh.local` / `Password@123`.
  2. Tại màn hình **Quản lý Đơn hàng (`/staff/orders`)**, sử dụng bộ lọc trạng thái (*Chờ thanh toán*, *Chờ duyệt*, *Đang giao*, *Đã giao*) để ưu tiên xử lý các đơn hàng hỏa tốc trong ngày.

* **Bước 2 – Duyệt đơn hàng & Kích hoạt trừ kho tự động (FEFO):**
  1. Với các đơn hàng đã thanh toán thành công (qua cổng thanh toán hoặc đã đối soát chuyển khoản VietQR), mở chi tiết đơn và nhấn nút **Duyệt đơn hàng**.
  2. Hệ thống tự động chạy thuật toán **FEFO**: tìm các lô hàng chưa hết hạn có `ngay_het_han` gần nhất để trừ tồn kho. Nếu lô đầu tiên không đủ số lượng, hệ thống tự động tách phần thiếu sang lô có hạn sử dụng kế tiếp và gắn mã lô (`batch_id`) vào từng dòng chi tiết đơn hàng.
  3. Trường hợp tổng tồn kho khả dụng không đủ đáp ứng đơn hàng, hệ thống tự động hoàn tác giao dịch và hiển thị thông báo cảnh báo để Sales liên hệ khách hàng.

* **Bước 3 – Theo dõi Cảnh báo đỏ lô cận hạn & Xả hàng:**
  1. Kiểm tra mục **Cảnh báo tồn kho cận hạn** hiển thị các lô có số ngày sử dụng còn lại $\le$ ngưỡng cấu hình (mặc định 2 ngày).
  2. Phối hợp triển khai chương trình khuyến mãi xả hàng nhanh hoặc đề xuất đổi sang sản phẩm tương đương cho các đợt giao của gói định kỳ (Subscription) nếu lô chính thiếu hụt.

* **Bước 4 – Tiếp nhận và Xử lý Khiếu nại / Đổi trả:**
  1. Truy cập mục **Quản lý Khiếu nại (`/staff/complaints`)** để xem danh sách yêu cầu khách hàng gửi trong vòng 24 giờ sau khi nhận hàng.
  2. Mở chi tiết khiếu nại, đối chiếu **Hình ảnh minh chứng** của khách với **Mã lô hàng (`batch_id`)** đã xuất cho đơn đó.
  3. Chọn phương án xử lý: **Chấp nhận Hoàn tiền**, **Chấp nhận Giao bù** hoặc **Từ chối khiếu nại** (bắt buộc nhập rõ lý do từ chối) và nhấn **Lưu kết quả** để cập nhật thông báo cho khách hàng.

---

### B.3. Hướng dẫn dành cho Quản trị viên Hệ thống (Super Admin)
Quản trị viên nắm quyền giám sát toàn diện chỉ số vận hành kinh doanh, quản lý nhân sự phân quyền và kiểm toán an toàn dữ liệu.

* **Bước 1 – Đăng nhập & Xem Báo cáo tổng quan (`Admin Dashboard`):**
  1. Đăng nhập bằng tài khoản `admin@nonganhlanh.local` / `Password@123` để truy cập khu vực quản trị **`/admin`**.
  2. Theo dõi các thẻ chỉ số thống kê thời gian thực: **Tổng doanh thu**, **Tổng số đơn hàng**, **Số lượng khách hàng**, **Số lượng lô hàng đang lưu thông** và danh sách **Cảnh báo lô cận hạn**.

* **Bước 2 – Quản lý Tài khoản & Phân quyền người dùng:**
  1. Truy cập mục **Quản lý Người dùng (`/admin/users`)**.
  2. Tìm kiếm tài khoản theo họ tên, email hoặc lọc theo vai trò (`Admin`, `Sales`, `Farm Staff`, `Customer`).
  3. Sử dụng nút **Khóa tài khoản** / **Mở khóa tài khoản** để vô hiệu hóa hoặc khôi phục quyền đăng nhập của nhân sự/khách hàng vi phạm quy định. *(Mọi thao tác khóa/mở khóa đều được hệ thống tự động ghi vết kiểm toán).*

* **Bước 3 – Tra cứu Nhật ký Kiểm toán Hệ thống (`Audit Logs`):**
  1. Truy cập mục **Nhật ký hệ thống (`/admin/audit-logs`)**.
  2. Kiểm tra lịch sử các thao tác nhạy cảm trên hệ thống bao gồm: người thực hiện (`user_id`), hành động (`hanh_dong`), bảng dữ liệu tác động, dữ liệu trước/sau khi thay đổi, địa chỉ IP và dấu thời gian phục vụ công tác đối soát và bảo mật định kỳ.