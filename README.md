# Nông Lành — Website thương mại điện tử nông sản sạch

Nông Lành là ứng dụng thương mại điện tử nông sản sạch, gồm frontend SPA và Laravel REST API. Khách hàng có thể mua sản phẩm, quản lý địa chỉ và tra cứu nguồn gốc; nhân viên nông trại và bán hàng thao tác trong các không gian riêng theo RBAC.

## Công nghệ

- **Frontend:** React 19, React Router 7, Vite 8, Tailwind CSS 3, Axios, `lucide-react`.
- **Backend:** PHP 8.2+, Laravel 12, REST API JSON, JWT và middleware RBAC.
- **Database:** MySQL 8.
- **Tích hợp tùy cấu hình:** Cloudinary, VietQR, PayOS, VNPay; giao diện QR sử dụng `qrcode.react`, quét QR dùng `@zxing/browser`.

## Chức năng theo vai trò

Guest là khách chưa đăng nhập, không phải role trong hệ thống. Bốn role đăng nhập là `customer`, `farm_staff`, `sales` và `admin`.

| Vai trò | Chức năng chính |
|---|---|
| Guest | Duyệt danh mục/sản phẩm, đăng ký hoặc đăng nhập, tra cứu công khai tại `/trace/:qrCode`. |
| Customer | Giỏ hàng, thanh toán, địa chỉ giao hàng, lịch sử/chi tiết và hủy đơn đang chờ duyệt, khiếu nại kèm ảnh trong 24 giờ, đánh giá sản phẩm và quản lý gói định kỳ. |
| Farm Staff | Quản lý mùa vụ/lô, ghi nhật ký canh tác, tạo và tải/in QR, ghi nhận xuất hủy. |
| Sales | Xem và duyệt đơn theo FEFO, xác nhận thanh toán VietQR sau khi đối soát, cập nhật giao hàng, theo dõi lô cận hạn và phản hồi khiếu nại. |
| Admin | Dashboard, quản lý danh mục/sản phẩm, tạo tài khoản Farm Staff/Sales, khóa/mở tài khoản và tra cứu audit logs. |

Farm Staff không truy cập đơn hàng, khách hàng hoặc doanh thu. Sales không được tạo lô, sửa tồn kho thủ công, sửa nhật ký canh tác hay ghi nhận xuất hủy. Tài khoản không tự chọn role lúc đăng nhập. Các route frontend và quyền API chi tiết được mô tả trong [hợp đồng API](docs/api-contract.md).

## Luồng và route giao diện

- **Customer/Public:** `/`, `/products`, `/products/:slug`, `/about`, `/contact`, `/trace/:qrCode`, `/cart`, `/checkout`, `/orders`, `/orders/:orderId`, `/profile`, `/subscriptions`, `/login`, `/register`.
- **Farm Staff/Sales:** `/staff/batches`, `/staff/orders`, `/staff/complaints`. Menu nội bộ được lọc theo role.
- **Admin:** `/admin/dashboard`, `/admin/products`, `/admin/users`, `/admin/audit-logs`.

Frontend dùng React Router và `AuthProvider`. Storefront, workspace nhân viên và workspace Admin dùng layout tách biệt; sau đăng nhập, người dùng được chuyển tới không gian phù hợp với role.

## Quy tắc nghiệp vụ đáng chú ý

- Tồn kho được quản lý theo lô. Khi Sales duyệt đơn, backend phân bổ và trừ tồn theo FEFO trong transaction; không cho Sales/Admin sửa số tồn thủ công.
- Lô có QR truy xuất nguồn gốc công khai, gồm thông tin sản phẩm/lô và nhật ký canh tác.
- Gói định kỳ hiện hỗ trợ chu kỳ 7 hoặc 14 ngày; chưa có chu kỳ theo tháng.
- Khiếu nại có thể ghi nhận phương án hoàn tiền/đổi hàng/từ chối, nhưng trạng thái “hoàn tiền” hoặc “đổi hàng” chưa tự thực hiện giao dịch hay tạo đơn thay thế.
- VietQR không tự gửi xác nhận giao dịch về hệ thống; Sales/Admin phải đối soát trước khi xác nhận. PayOS/VNPay cần credentials và callback cấu hình phù hợp.
- Khi chưa cấu hình Cloudinary, ảnh dùng public disk của Laravel trong môi trường local.

## Cấu trúc thư mục

```text
.
├── backend/                 # Laravel REST API
│   ├── app/Http/
│   │   ├── Controllers/Api/
│   │   └── Requests/
│   ├── database/
│   ├── routes/api.php
│   └── .env.example
├── docs/
│   ├── api-contract.md      # Endpoint, payload, RBAC và tình trạng triển khai
│   └── database-schema.sql
├── frontend/                # React SPA
│   ├── src/api/              # API clients
│   ├── src/contexts/         # AuthProvider
│   ├── src/layouts/
│   ├── src/pages/
│   └── .env.example
└── AI_CONTEXT.md
```

## Cài đặt và chạy local

Yêu cầu: PHP 8.2+, Composer, Node.js 20.19+, npm và MySQL 8.

### 1. Backend

Từ PowerShell tại thư mục gốc:

```powershell
Copy-Item backend\.env.example backend\.env
Set-Location backend
composer install
php artisan key:generate
```

Tạo database MySQL rồi cập nhật `DB_DATABASE`, `DB_USERNAME` và `DB_PASSWORD` trong `backend\.env`. Sau đó:

```powershell
php artisan migrate
php artisan serve
```

API mặc định chạy tại `http://localhost:8000`; health check là `GET http://localhost:8000/api/ping`.

### 2. Frontend

Mở terminal mới tại thư mục gốc:

```powershell
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm install
npm run dev
```

Vite mặc định chạy tại `http://localhost:5173`. `VITE_API_BASE_URL` trong `frontend\.env` trỏ tới API, mặc định `http://localhost:8000/api`.

### Tích hợp ngoài

Các biến cấu hình tùy chọn như `CLOUDINARY_*`, `VIETQR_*`, `PAYOS_*`, `VNPAY_*` và cấu hình địa chỉ/tọa độ giao hàng nằm trong [backend/.env.example](backend/.env.example). Không đưa credentials thật vào repository. Nếu thiếu cấu hình Cloudinary, backend dùng public disk; các phương thức thanh toán có behavior phụ thuộc gateway và cấu hình môi trường.

## Kiểm tra chất lượng

Chạy từ các thư mục tương ứng:

```powershell
# backend
Set-Location backend
php artisan test

# frontend
Set-Location ..\frontend
npm run lint
npm run build
```

## Quy trình làm việc — Git Flow

- `main`: nhánh ổn định.
- `develop`: nhánh tích hợp.
- `feature/*`: tạo từ `develop`; mở Pull Request về `develop` sau khi kiểm tra.
- Phát hành bằng Pull Request từ `develop` vào `main`.

### Conventional Commits

Dùng commit message ngắn gọn bằng tiếng Việt theo định dạng:

```text
<type>(<phạm-vi-tuỳ-chọn>): <mô tả ngắn>
```

Ví dụ: `docs: cập nhật hướng dẫn sử dụng`. Các type thường dùng: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`.
