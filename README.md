# Website Thương mại điện tử Nông sản sạch

Monorepo gồm RESTful API Laravel trong `backend/` và ứng dụng React + Vite + Tailwind CSS trong `frontend/`.

## Kiến trúc hệ thống

Dự án sử dụng mô hình tách rời: Laravel cung cấp RESTful API ở backend, còn ReactJS kết hợp Tailwind CSS đảm nhiệm giao diện frontend. Thay cho Blade, kiến trúc này giúp frontend hoạt động như một SPA, hỗ trợ trải nghiệm điều hướng nhanh và tối ưu giao diện di động. Component `MainLayout.jsx` đảm nhiệm vai trò layout dùng chung tương đương `app.blade.php` theo yêu cầu đề bài; React Router hiển thị các trang bên trong layout này.

## Yêu cầu

- PHP 8.2 trở lên và Composer
- Node.js 20.19 trở lên và npm
- Git

## Chạy dự án ở môi trường phát triển

Mở hai terminal tại thư mục gốc. Sao chép tệp môi trường mẫu trước khi chạy ứng dụng:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Trong `backend/.env`, đặt cấu hình môi trường và thông tin cơ sở dữ liệu phù hợp với máy của bạn. Frontend mặc định gọi API tại `http://localhost:8000/api`; có thể đổi URL bằng biến `VITE_API_BASE_URL` trong `frontend/.env`.

**Backend**

```powershell
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

API chạy tại `http://localhost:8000`; endpoint kiểm tra là `GET http://localhost:8000/api/ping`.

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

Vite chạy tại `http://localhost:5173`. Axios được cấu hình gọi API tại `http://localhost:8000/api`.

## Git Flow

- `main`: phiên bản ổn định, sẵn sàng phát hành.
- `develop`: nhánh tích hợp các thay đổi đã hoàn tất.
- `feature/<mo-ta-ngan>`: tạo từ `develop`, ví dụ `feature/product-catalog`; mở Pull Request về `develop`.
- Chỉ đưa bản phát hành đã kiểm thử từ `develop` vào `main` qua Pull Request.

### Quy chuẩn Commit (Conventional Commits)

Commit theo định dạng `<type>(<scope>): <mô tả ngắn bằng tiếng Việt có dấu>`, ví dụ:

```text
feat: khởi tạo giao diện chi tiết sản phẩm
chore: cấu hình khung dự án Laravel và ReactJS
docs: bổ sung hướng dẫn cài đặt dự án
```

Các type thường dùng: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`. Quy tắc dành cho trợ lý AI được ghi trong [AI_CONTEXT.md](./AI_CONTEXT.md).
