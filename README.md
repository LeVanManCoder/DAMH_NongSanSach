# Nông Lành

### Website Thương mại Điện tử Nông sản Sạch & Truy xuất Nguồn gốc

Nông Lành kết nối nông trại với người tiêu dùng qua cửa hàng nông sản sạch, quy trình vận hành theo vai trò và hồ sơ truy xuất QR cho từng lô hàng. Khách hàng có thể mua sắm, theo dõi đơn và nguồn gốc sản phẩm; nhân viên nông trại, bán hàng và quản trị viên làm việc trong các phân hệ riêng.

> **Phiên bản backend:** Repository hiện khai báo `laravel/framework: ^12.0` trong `backend/composer.json`. README ghi theo dependency thực tế của nhánh này.

## Mục lục

- [Tính năng và phân quyền](#tính-năng-và-phân-quyền)
- [Công nghệ](#công-nghệ)
- [Cấu trúc repository](#cấu-trúc-repository)
- [Cài đặt và chạy local](#cài-đặt-và-chạy-local)
- [Tài khoản demo](#tài-khoản-demo)
- [Kiểm thử và CI](#kiểm-thử-và-ci)
- [Nhóm thực hiện](#nhóm-thực-hiện)

## Tính năng và phân quyền

Ứng dụng có **5 nhóm quyền truy cập**: Guest và 4 vai trò RBAC được lưu trong hệ thống. Guest là người chưa đăng nhập, không phải một role trong bảng `roles`.

| Nhóm quyền | Chức năng |
|---|---|
| **Guest** | Duyệt danh mục, tìm sản phẩm, đăng ký/đăng nhập và tra cứu nguồn gốc công khai tại `/trace/:qrCode`. |
| **Customer** (`customer`) | Quản lý hồ sơ và sổ địa chỉ; giỏ hàng, thanh toán, đơn hàng; hủy đơn chờ duyệt; gửi khiếu nại kèm ảnh trong 24 giờ; đánh giá sản phẩm; quản lý gói giao định kỳ. |
| **Farm Staff** (`farm_staff`) | Quản lý mùa vụ và lô thu hoạch; ghi nhật ký canh tác; phát hành/tải/in QR; ghi nhận xuất hủy. Không được xem đơn hàng, khách hàng hoặc doanh thu. |
| **Sales** (`sales`) | Duyệt đơn theo FEFO, đối soát thanh toán chuyển khoản, cập nhật giao hàng, theo dõi lô cận hạn và xử lý khiếu nại. Không được tạo lô, sửa tồn kho thủ công hoặc ghi nhận xuất hủy. |
| **Admin** (`admin`) | Dashboard, quản lý danh mục và sản phẩm, tạo tài khoản nhân viên, khóa/mở tài khoản và xem Audit Logs. Không được sửa tồn kho thủ công. |

Đăng nhập chuyển người dùng thẳng đến không gian phù hợp với vai trò. Vai trò được gán bởi hệ thống, người dùng không thể tự chọn role khi đăng nhập. API và quy tắc phân quyền chi tiết được mô tả trong [docs/api-contract.md](docs/api-contract.md).

## Công nghệ

- **Backend:** Laravel 12, PHP 8.2+, REST API JSON, JWT ký HMAC-SHA256 và middleware RBAC.
- **Frontend:** React 19, React Router 7, Vite 8, Tailwind CSS 3, Axios và Lucide.
- **Cơ sở dữ liệu:** MySQL 8; schema nghiệp vụ gồm 24 bảng, thiết kế chuẩn hóa theo 3NF.
- **Tích hợp:** Cloudinary (lưu ảnh), VietQR, PayOS và VNPay.
- **CI:** GitHub Actions chạy bộ kiểm thử backend khi push hoặc mở Pull Request vào `develop`/`main`.

Cloudinary và các cổng thanh toán cần cấu hình thông tin môi trường tương ứng. VietQR dùng để hiển thị hướng dẫn chuyển khoản; xác nhận giao dịch cần được đối soát theo luồng hệ thống.

## Cấu trúc repository

```text
.
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/  # REST API
│   │   ├── Http/Middleware/       # JWT, RBAC
│   │   ├── Models/
│   │   └── Services/              # FEFO, JWT, tích hợp ngoài
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   ├── tests/Feature/
│   └── .env.example
├── frontend/
│   ├── src/api/                   # API clients
│   ├── src/contexts/              # AuthProvider
│   ├── src/layouts/
│   ├── src/pages/
│   └── .env.example
├── docs/
│   ├── api-contract.md
│   ├── database-schema.sql
│   └── HUONG_DAN_CAI_DAT_VA_SU_DUNG.md
├── .github/workflows/ci.yml
└── AI_CONTEXT.md
```

## Cài đặt và chạy local

### Yêu cầu

- PHP 8.2+, Composer 2
- Node.js 20.19+ và npm
- MySQL 8

### 1. Cấu hình và chạy backend

Mở PowerShell tại thư mục repository:

```powershell
Copy-Item backend\.env.example backend\.env
Set-Location backend
composer install
php artisan key:generate
```

Tạo database MySQL rỗng (mặc định `nongsan_sach`) và cấu hình `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` trong `backend\.env`. Có thể đặt `JWT_SECRET` riêng; nếu bỏ trống, ứng dụng dùng `APP_KEY` làm khóa ký JWT.

Nạp schema và dữ liệu demo:

```powershell
php artisan migrate:fresh --seed
```

> Lệnh `migrate:fresh` sẽ xóa toàn bộ bảng hiện có trong database được cấu hình. Chỉ chạy trên database local/dev có thể làm mới.

Khởi động API:

```powershell
php artisan serve
```

Backend mặc định chạy tại `http://localhost:8000`; endpoint kiểm tra hoạt động là `GET /api/ping`.

### 2. Cấu hình và chạy frontend

Mở terminal PowerShell mới tại thư mục repository:

```powershell
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`. Thiết lập `VITE_API_BASE_URL` trong `frontend\.env` nếu API chạy ở địa chỉ khác.

### Tích hợp ngoài

Các biến cấu hình Cloudinary, VietQR, PayOS, VNPay và giao hàng nằm trong `backend/.env.example`. Không đưa khóa API hoặc thông tin thanh toán thật lên Git. Khi chưa cấu hình Cloudinary, môi trường local có thể dùng public disk theo cấu hình backend.

## Tài khoản demo

Sau khi chạy `php artisan migrate:fresh --seed`, các tài khoản demo chính có chung mật khẩu **`12345678`**:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Customer | `khach@nonglanh.vn` | `12345678` |
| Farm Staff | `nongtrai@nonglanh.vn` | `12345678` |
| Sales | `banhang@nonglanh.vn` | `12345678` |
| Admin | `admin@nonglanh.vn` | `12345678` |

Seeder cũng tạo hai tài khoản khách hàng phụ: `khach2@nonglanh.vn` và `khach3@nonglanh.vn`; cả hai dùng mật khẩu `12345678`. Tài khoản demo chỉ dành cho local/dev. Hãy đổi mật khẩu hoặc không nạp seed demo trong môi trường production.

## Kiểm thử và CI

Chạy backend tests:

```powershell
Set-Location backend
php artisan test
```

Kiểm tra frontend:

```powershell
Set-Location frontend
npm run lint
npm run build
```

GitHub Actions workflow tại `.github/workflows/ci.yml` tự cài dependencies PHP và chạy `php artisan test`.

## Nhóm thực hiện

**Lớp CĐ CNTT 24WEBC**

**Trường Cao đẳng Kỹ thuật Cao Thắng**
