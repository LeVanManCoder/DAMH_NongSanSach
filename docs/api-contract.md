# Hợp đồng RESTful API — Nông Lành

> **Trạng thái:** Tài liệu gồm cả API đã triển khai và API mục tiêu. Hiện `GET /api/products`, `GET /api/products/{slug}` và nhóm giỏ hàng `/api/cart` đã được triển khai; các phần còn lại cần đối chiếu mã nguồn trước khi coi là cam kết đã hoàn thành. Báo cáo Chương 3 không cung cấp danh sách endpoint cụ thể; danh sách này ánh xạ các use case UC01–UC05 và quyền RBAC thành API nhất quán.

Tên bảng trong cơ sở dữ liệu giữ tiếng Anh theo thiết kế; tên cột, enum và ràng buộc được đồng bộ theo workbook [`tu-dien-du-lieu-tuan-3.xlsx`](./tu-dien-du-lieu-tuan-3.xlsx). Payload ví dụ dùng cùng các tên trường như `ho_ten`, `ten_san_pham`, `so_luong`, `ngay_het_han`, `ten_nguoi_nhan` và `dia_chi`.

## Quy ước chung

- Base URL local: `http://localhost:8000/api`.
- Payload và phản hồi dùng JSON UTF-8. Endpoint upload dùng `multipart/form-data`.
- Các endpoint cần đăng nhập yêu cầu `Authorization: Bearer <JWT>`. Guest là người chưa đăng nhập, không phải một role lưu trong database.
- Role đăng nhập: `customer`, `farm_staff`, `sales`, `admin`. Thiếu/sai token trả `401`; sai quyền trả `403`.
- Danh sách mặc định phân trang tối đa 20 bản ghi/trang; tham số chung: `page`, `per_page`, `sort`.
- JSON lỗi thống nhất:

```json
{
  "status": "error",
  "message": "Dữ liệu không hợp lệ.",
  "errors": {
    "field": ["Nội dung lỗi."]
  }
}
```

- Quy ước mã HTTP: `200` đọc/cập nhật thành công, `201` tạo thành công, `204` xóa thành công, `401` chưa xác thực, `403` không đủ quyền, `404` không tìm thấy, `409` xung đột trạng thái, `422` dữ liệu không hợp lệ hoặc tồn kho khả dụng không đủ, `429` vượt giới hạn.
- Không trả thông tin khách hàng, đơn hàng hay doanh thu cho Farm Staff. Sales không được tạo lô, sửa tồn kho trực tiếp, sửa nhật ký canh tác hoặc ghi nhận xuất hủy.

## Kiểm tra dịch vụ & xác thực

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/ping` | Công khai | Health check, trả `{"status":"ok"}`. **Đã có trong boilerplate.** |
| POST | `/auth/register` | Guest | Tạo tài khoản Customer. |
| POST | `/auth/login` | Guest | Đăng nhập, trả access token JWT (hết hạn tối đa 1 giờ). |
| POST | `/auth/logout` | Đã đăng nhập | Thu hồi token hiện tại. |
| GET | `/auth/me` | Đã đăng nhập | Trả thông tin người dùng và role hiện tại. |
| GET | `/user` | Đã đăng nhập | Route mẫu Laravel Sanctum hiện có; cần thống nhất với JWT khi tích hợp xác thực. |

Đăng nhập sai liên tiếp 5 lần phải bị khóa tạm 15 phút. Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và số; chỉ lưu hash.

## Danh mục, sản phẩm & truy xuất QR

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/categories` | Công khai | Danh mục đang hoạt động. |
| GET | `/products` | Công khai | **Đã triển khai.** Danh sách sản phẩm đang hoạt động có ít nhất một lô còn hạn, còn tồn; lọc `category_id`, `q`, `per_page` (mặc định 20, tối đa 100), có phân trang. |
| GET | `/products/{slug}` | Công khai | **Đã triển khai.** Chi tiết theo slug, gồm danh mục, lô đang mở bán, tồn khả dụng, mã QR và nhật ký canh tác công khai. |
| GET | `/products/{product}/reviews` | Công khai | Đánh giá đã công bố. |
| GET | `/trace/{qr_code}` | Công khai | Truy xuất nguồn gốc lô: sản phẩm, mùa vụ, ngày thu hoạch, chứng nhận nếu có và timeline canh tác. |
| GET | `/batches/{batch}/trace` | Customer, Sales, Admin; Farm Staff chỉ lô thuộc nghiệp vụ được cấp | Tra cứu timeline nội bộ theo mã lô. |
| POST | `/products/{product}/reviews` | Customer | Đánh giá sản phẩm đã mua; chỉ đơn đã giao mới đủ điều kiện. |

QR chỉ được tạo sau khi lô chuyển sang `da_thu_hoach` và đã có ít nhất một nhật ký canh tác. Sau thu hoạch, không cho sửa/xóa các mốc canh tác trước đó.

## Địa chỉ, giỏ hàng & đơn lẻ

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/addresses` | Customer | Danh sách địa chỉ của chính khách hàng. |
| POST | `/addresses` | Customer | Thêm địa chỉ giao hàng, có thể lưu tọa độ. |
| GET | `/addresses/{address}` | Chủ địa chỉ | Xem địa chỉ của chính mình. |
| PUT/PATCH | `/addresses/{address}` | Chủ địa chỉ | Cập nhật địa chỉ của chính mình. |
| DELETE | `/addresses/{address}` | Chủ địa chỉ | Xóa địa chỉ nếu không bị ràng buộc bởi lịch sử giao dịch. |
| GET | `/cart` | Customer | **Đã triển khai.** Xem giỏ hàng hiện tại. |
| POST | `/cart` | Customer | **Đã triển khai.** Thêm sản phẩm vào giỏ (`product_id`, `so_luong`); cộng số lượng nếu sản phẩm đã có trong giỏ và trả `422` nếu vượt tồn khả dụng. |
| PUT/PATCH | `/cart/{itemId}` | Customer | **Đã triển khai.** Cập nhật số lượng dương; từ chối nếu vượt tồn khả dụng. |
| DELETE | `/cart/{itemId}` | Customer | **Đã triển khai.** Bỏ sản phẩm khỏi giỏ. |
| POST | `/shipping/quotes` | Customer | Tính phí giao hàng từ địa chỉ; tích hợp ship qua service provider. |
| POST | `/orders` | Customer | Tạo đơn lẻ từ giỏ và snapshot người nhận/địa chỉ tại thời điểm đặt. |
| GET | `/orders` | Customer | Chỉ xem đơn của chính mình. |
| GET | `/orders/{order}` | Customer sở hữu đơn | Xem chi tiết đơn và trạng thái. |
| POST | `/orders/{order}/cancel` | Customer sở hữu đơn, khi còn được phép hủy | Gửi yêu cầu hủy đơn. |
| POST | `/orders/{order}/complaints` | Customer sở hữu đơn đã giao trong 24 giờ | Gửi khiếu nại kèm ít nhất một file minh chứng (`multipart/form-data`). |
| GET | `/complaints` | Customer | Chỉ xem khiếu nại của chính mình. |
| GET | `/complaints/{complaint}` | Customer sở hữu khiếu nại | Xem trạng thái xử lý và media minh chứng. |

Khi tạo đơn, kiểm tra giá/trạng thái sản phẩm và tồn khả dụng; không ghi tồn kho vào `products`. Sales duyệt đơn mới kích hoạt trừ tồn FEFO trong transaction có khóa dòng.

## Thanh toán

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/orders/{order}/payments` | Customer sở hữu đơn | Khởi tạo thanh toán cho đơn. |
| GET | `/orders/{order}/payments` | Customer sở hữu đơn, Sales, Admin | Lịch sử giao dịch được phép xem. |
| POST | `/subscriptions/{subscription}/payments` | Customer sở hữu gói | Thanh toán trước gói định kỳ. |
| POST | `/payments/webhooks/{provider}` | Provider, xác thực chữ ký | Nhận callback MoMo/VNPay; không dùng JWT người dùng. |
| POST | `/sales/orders/{order}/refunds` | Sales | Hoàn tiền qua payment service; ghi audit log. |

Các dịch vụ thanh toán phải được gọi qua interface/service, có mock service cho local/test. Mỗi payment gắn chính xác một `order_id` hoặc `subscription_id`.

## Gói định kỳ (Subscription)

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/subscription-plans` | Công khai | Danh sách gói đang mở bán. |
| GET | `/subscription-plans/{plan}` | Công khai | Chi tiết gói. |
| POST | `/subscriptions` | Customer | Đăng ký gói, gồm `plan_id`, sản phẩm/số lượng, địa chỉ và các ngày giao trong tuần. |
| GET | `/subscriptions` | Customer | Danh sách gói của chính mình. |
| GET | `/subscriptions/{subscription}` | Customer sở hữu gói | Chi tiết gói, sản phẩm và lịch giao. |
| PATCH | `/subscriptions/{subscription}` | Customer sở hữu gói, theo trạng thái cho phép | Cập nhật tùy chọn giao/sản phẩm. |
| POST | `/subscriptions/{subscription}/cancel` | Customer sở hữu gói | Hủy gói theo chính sách. |
| GET | `/subscriptions/{subscription}/schedules` | Customer sở hữu gói, Sales | Lịch giao và đơn con đã sinh. |
| POST | `/sales/delivery-schedules/{schedule}/substitutions` | Sales | Đề xuất sản phẩm thay thế khi thiếu hàng, lưu quyết định vào lịch/đơn. |

Laravel Scheduler quét `delivery_schedules` và sinh đơn con trước ngày giao một ngày; unique `(subscription_id, ngay_giao)` ngăn sinh lịch trùng.

## Farm Staff — mùa vụ, lô, nhật ký & hao hụt

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/farm/seasons` | Farm Staff | Danh sách mùa vụ. |
| POST | `/farm/seasons` | Farm Staff | Tạo mùa vụ. |
| GET | `/farm/seasons/{season}` | Farm Staff | Chi tiết mùa vụ. |
| PATCH | `/farm/seasons/{season}` | Farm Staff | Cập nhật mùa vụ. |
| GET | `/farm/batches` | Farm Staff | Danh sách lô phục vụ công việc tại vườn; không trả đơn/khách/doanh thu. |
| POST | `/farm/batches` | Farm Staff | Tạo lô ở trạng thái `dang_canh_tac`. |
| GET | `/farm/batches/{batch}` | Farm Staff | Xem chi tiết lô được phép quản lý. |
| PATCH | `/farm/batches/{batch}` | Farm Staff | Cập nhật thông tin canh tác hợp lệ; không cho sửa tồn bằng thao tác tùy ý. |
| GET | `/farm/batches/{batch}/farming-logs` | Farm Staff | Xem nhật ký của lô. |
| POST | `/farm/batches/{batch}/farming-logs` | Farm Staff | Thêm mốc canh tác; yêu cầu nhân viên đúng role. |
| POST | `/farm/batches/{batch}/harvest` | Farm Staff | Ghi nhận thu hoạch; chỉ cho tạo QR khi có nhật ký. |
| POST | `/farm/batches/{batch}/waste-logs` | Farm Staff | Ghi nhận xuất hủy với `so_luong > 0`, lý do bắt buộc; cập nhật tồn trong transaction. |
| GET | `/farm/batches/{batch}/waste-logs` | Farm Staff | Lịch sử hao hụt của lô. |

Farm Staff không được gọi API đơn hàng hoặc xem thông tin khách; các truy cập này phải trả `403`.

## Sales — duyệt đơn, FEFO, khiếu nại & cảnh báo

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/sales/orders` | Sales, Admin | Danh sách đơn; hỗ trợ lọc trạng thái/ngày. |
| GET | `/sales/orders/{order}` | Sales, Admin | Xem đơn và thông tin cần thiết để xử lý. |
| POST | `/sales/orders/{order}/approve` | Sales | Duyệt đơn và trừ kho FEFO trong transaction `FOR UPDATE`; lưu từng `batch_id` vào `order_details`. |
| PATCH | `/sales/orders/{order}/status` | Sales | Cập nhật tiến trình giao hàng theo state machine. |
| GET | `/sales/batches/expiring` | Sales, Admin | Lô còn hàng sắp hết hạn theo ngưỡng cấu hình (mặc định 2 ngày). |
| GET | `/sales/notifications` | Sales | Danh sách cảnh báo lô cận hạn/thiếu hàng. |
| PATCH | `/sales/notifications/{notification}/read` | Sales | Đánh dấu đã đọc. |
| GET | `/sales/complaints` | Sales | Danh sách khiếu nại cần xử lý. |
| GET | `/sales/complaints/{complaint}` | Sales | Chi tiết khiếu nại và media minh chứng. |
| POST | `/sales/complaints/{complaint}/resolve` | Sales | Xử lý theo hướng `refund` hoặc `replacement`; ghi audit log. |

Sales không được gọi API tạo lô, cập nhật tồn thủ công, sửa nhật ký canh tác hoặc ghi nhận xuất hủy; các yêu cầu này trả `403`.

## Admin — quản trị & báo cáo

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET/POST | `/admin/categories` | Admin | Danh sách/tạo danh mục. |
| GET/PUT/PATCH/DELETE | `/admin/categories/{category}` | Admin | Đọc/cập nhật/ngừng sử dụng danh mục. |
| GET/POST | `/admin/products` | Admin | Danh sách/tạo sản phẩm. |
| GET/PUT/PATCH/DELETE | `/admin/products/{product}` | Admin | Đọc/cập nhật/ngừng bán sản phẩm. |
| GET | `/admin/users` | Admin | Danh sách tài khoản, lọc role/trạng thái. |
| GET | `/admin/users/{user}` | Admin | Chi tiết tài khoản. |
| PATCH | `/admin/users/{user}/role` | Admin | Gán role hợp lệ. |
| PATCH | `/admin/users/{user}/status` | Admin | Khóa/mở tài khoản. |
| GET | `/admin/reports/overview` | Admin | Báo cáo tổng quan bán hàng/kho. |
| GET | `/admin/reports/waste` | Admin | Báo cáo hao hụt theo lô/mùa vụ/thời gian. |
| GET | `/admin/system-settings` | Admin | Xem cấu hình hệ thống. |
| PUT | `/admin/system-settings/{key}` | Admin | Cấu hình, gồm ngưỡng cảnh báo xả hàng. |
| GET | `/admin/audit-logs` | Admin | Tra cứu thao tác nhạy cảm, có phân trang và lọc. |
| GET | `/admin/batches` | Admin | Chỉ đọc thông tin lô; không sửa lịch sử canh tác đã thu hoạch. |

Các thao tác duyệt đơn, xuất hủy, hoàn tiền và thay đổi cấu hình nhạy cảm phải ghi `audit_logs` với người thực hiện, thời gian, đối tượng và chi tiết. Lưu trữ audit log tối thiểu 90 ngày.

## Quy tắc nghiệp vụ áp dụng xuyên API

- **FEFO:** chọn lô `con_hang`, tồn `> 0`, chưa hết hạn, sắp xếp `ngay_het_han ASC, ngay_thu_hoach ASC`; khóa dòng và cập nhật tồn trong cùng transaction. Tồn không âm.
- **Khiếu nại:** Customer chỉ gửi trong 24 giờ từ lúc đơn chuyển `da_giao`; yêu cầu ít nhất một minh chứng. Ảnh JPG/PNG/WEBP tối đa 5 MB; video MP4 tối đa 30 MB. Backend kiểm tra cả phần mở rộng và MIME type.
- **QR:** truy xuất công khai; sinh QR sau thu hoạch khi lô có nhật ký canh tác.
- **Tích hợp ngoài:** payment, tính phí giao hàng và media phải qua interface/service; cung cấp mock service local/test.
- **Lỗi tồn kho:** thao tác giỏ hàng trả `422` nếu yêu cầu vượt tồn khả dụng; duyệt đơn trả `422` với JSON lỗi chuẩn và rollback toàn bộ transaction nếu FEFO không đủ hàng.