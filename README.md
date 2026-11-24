# Website Thương mại điện tử Nông sản sạch

## Giới thiệu

Đồ án xây dựng nền tảng thương mại điện tử kết nối khách hàng với nông sản sạch, hỗ trợ quản lý hoạt động bán hàng và vận hành tại vườn. Giao diện được phát triển theo hướng **mobile-first**, ưu tiên trải nghiệm mua sắm rõ ràng và thuận tiện trên điện thoại.

Các chức năng trọng tâm theo định hướng đồ án:

- **Truy xuất nguồn gốc bằng QR:** giúp khách hàng tra cứu thông tin sản phẩm, lô hàng và nguồn gốc nông sản.
- **Xuất kho theo FEFO (First Expired, First Out):** ưu tiên xuất các lô có hạn sử dụng gần nhất.
- **Gói định kỳ (Subscription):** hỗ trợ đăng ký nhận nông sản theo chu kỳ.
- **Quản lý hao hụt tại vườn:** ghi nhận và theo dõi hao hụt trong quá trình thu hoạch, bảo quản và vận hành.

## Kiến trúc hệ thống

Ứng dụng sử dụng kiến trúc tách rời: **Laravel RESTful API** cung cấp backend, còn **ReactJS + Tailwind CSS** xây dựng frontend SPA. Thay cho Blade, cách tổ chức này tách biệt giao diện và API, hỗ trợ điều hướng mượt mà, dễ phát triển độc lập hai phần và tối ưu trải nghiệm SPA trên thiết bị di động. Component `MainLayout.jsx` quản lý phần bố cục dùng chung của frontend, đóng vai trò tương đương layout `app.blade.php` theo yêu cầu đề bài; các trang được hiển thị bên trong layout qua React Router.

Theo thiết kế đồ án, dữ liệu được lưu trong **MySQL 8.0**, với lược đồ mục tiêu gồm **24 bảng chuẩn hóa 3NF**. Hệ thống phân quyền theo năm vai trò:

1. **Guest:** khách chưa đăng nhập; xem thông tin và sản phẩm công khai.
2. **Customer:** khách hàng; sử dụng các chức năng mua sắm và gói định kỳ.
3. **Farm Staff:** nhân viên nông trại; quản lý thông tin lô hàng và ghi nhận hoạt động tại vườn.
4. **Sales:** nhân viên bán hàng; hỗ trợ quản lý nghiệp vụ bán hàng.
5. **Admin:** quản trị viên; quản lý cấu hình, tài khoản và phân quyền hệ thống.

## Cấu trúc thư mục

```text
.
├── .github/
│   └── pull_request_template.md
├── backend/                     # Laravel RESTful API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   └── Requests/
│   │   └── Services/
│   │       └── FefoService.php
│   ├── config/
│   ├── database/
│   ├── routes/
│   │   └── api.php
│   └── .env.example
├── docs/
│   ├── api-contract.md
│   ├── database-schema.sql
│   └── tu-dien-du-lieu-tuan-3.xlsx
├── frontend/                    # ReactJS + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── layouts/
│   │   └── pages/
│   ├── .env.example
│   └── package.json
├── AI_CONTEXT.md
├── README.md
└── .gitignore
```

## Cài đặt và chạy dự án

### Yêu cầu môi trường

- PHP 8.2 trở lên và Composer
- Node.js 20.19 trở lên và npm
- MySQL 8.0
- Git

### Backend — Laravel API

Từ thư mục gốc, tạo cấu hình môi trường và cài dependencies:

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
composer install
php artisan key:generate
```

Tạo database MySQL cho dự án, sau đó cấu hình kết nối trong `backend/.env`, ví dụ:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nongsan_sach
DB_USERNAME=root
DB_PASSWORD=
```

Chạy migration và khởi động API:

```powershell
php artisan migrate
php artisan serve
```

API mặc định chạy tại `http://localhost:8000`. Endpoint kiểm tra kết nối: `GET http://localhost:8000/api/ping`.

### Frontend — ReactJS + Vite

Mở terminal thứ hai tại thư mục gốc:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Vite mặc định chạy tại `http://localhost:5173`. Biến `VITE_API_BASE_URL` trong `frontend/.env` cấu hình địa chỉ Laravel API; giá trị mặc định là `http://localhost:8000/api`.

## Quy trình làm việc nhóm — Git Flow

- **`main`:** nhánh ổn định, chứa phiên bản sẵn sàng phát hành.
- **`develop`:** nhánh tích hợp các thay đổi đã hoàn tất, làm cơ sở cho phát triển tính năng.
- **`feature/*`:** nhánh tính năng, tạo từ `develop`; ví dụ `feature/cap-nhat-readme`. Sau khi hoàn tất và kiểm tra, mở Pull Request từ nhánh feature vào `develop`.
- Phát hành bằng Pull Request từ `develop` vào `main` sau khi kiểm thử và được duyệt.

### Quy chuẩn Commit — Conventional Commits

Viết commit message ngắn gọn bằng **tiếng Việt có dấu**, theo định dạng:

```text
<type>(<phạm-vi-tuỳ-chọn>): <mô tả ngắn bằng tiếng Việt>
```

Ví dụ:

```text
feat: khởi tạo giao diện chi tiết sản phẩm
fix(api): sửa phản hồi kiểm tra kết nối
docs: cập nhật hướng dẫn cài đặt dự án
chore: cấu hình khung dự án Laravel và ReactJS
```

Các type thường dùng: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`.
