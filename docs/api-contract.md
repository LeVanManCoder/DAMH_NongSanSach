# Hợp đồng RESTful API — Nông Lành

> **Trạng thái:** Tài liệu gồm cả API đã triển khai và API mục tiêu. `GET /api/categories`, `GET /api/products`, `GET /api/products/{slug}`, nhóm giỏ hàng `/api/cart`, và các API mùa vụ/nhật ký canh tác được đánh dấu theo phần mô tả bên dưới; các phần còn lại cần đối chiếu mã nguồn trước khi coi là cam kết đã hoàn thành. Báo cáo Chương 3 không cung cấp danh sách endpoint cụ thể; danh sách này ánh xạ các use case UC01–UC05 và quyền RBAC thành API nhất quán.

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
| GET | `/categories` | Công khai | **Đã triển khai.** Danh sách danh mục đang hoạt động. |
| GET | `/products` | Công khai | **Đã triển khai.** Danh sách sản phẩm đang hoạt động có ít nhất một lô còn hạn, còn tồn; lọc theo `search` (tên), `category_id`, `per_page`, `sort=name|newest` (mặc định 20, tối đa 100), có phân trang. Tham số cũ `q` vẫn được hỗ trợ tương thích ngược. |
| GET | `/products/{slug}` | Công khai | **Đã triển khai.** Chi tiết theo slug, gồm danh mục, lô đang mở bán, tồn khả dụng, mã QR và nhật ký canh tác công khai. |
| GET | `/products/{product}/reviews` | Công khai | Đánh giá đã công bố. |
| GET | `/trace/{qr_code}` | Công khai | Truy xuất nguồn gốc lô: sản phẩm, mùa vụ, ngày thu hoạch, chứng nhận nếu có và timeline canh tác. |
| GET | `/batches/{batch}/trace` | Customer, Sales, Admin; Farm Staff chỉ lô thuộc nghiệp vụ được cấp | Tra cứu timeline nội bộ theo mã lô. |
| GET | `/products/{id}/reviews` | Công khai | **Đã triển khai.** Danh sách đánh giá phân trang, tên người đánh giá, điểm trung bình và tổng số đánh giá. |
| POST | `/products/{id}/reviews` | Customer | **Đã triển khai.** Đánh giá 1–5 sao, bình luận tùy chọn; yêu cầu đơn của chính khách ở trạng thái `da_giao` và có sản phẩm, mỗi cặp đơn/sản phẩm chỉ đánh giá một lần. |

QR chỉ được tạo sau khi lô chuyển sang `da_thu_hoach` và đã có ít nhất một nhật ký canh tác. Sau thu hoạch, không cho sửa/xóa các mốc canh tác trước đó.

## Địa chỉ, giỏ hàng & đơn lẻ

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/addresses` | Customer | **Đã triển khai.** Danh sách địa chỉ của chính khách hàng, mặc định đứng đầu. |
| POST | `/addresses` | Customer | **Đã triển khai.** Thêm địa chỉ giao hàng, tùy chọn cặp tọa độ; địa chỉ đầu tiên tự thành mặc định. |
| PUT | `/addresses/{id}` | Customer sở hữu địa chỉ | **Đã triển khai.** Cập nhật tên người nhận, điện thoại, địa chỉ và tọa độ. |
| PATCH | `/addresses/{id}/default` | Customer sở hữu địa chỉ | **Đã triển khai.** Chọn một địa chỉ mặc định trong sổ địa chỉ của chính khách hàng. |
| DELETE | `/addresses/{id}` | Customer sở hữu địa chỉ | **Đã triển khai.** Xóa địa chỉ; nếu xóa địa chỉ mặc định thì chọn địa chỉ gần nhất còn lại. Không xóa địa chỉ đang được gắn với subscription. |
| GET | `/cart` | Customer | **Đã triển khai.** Xem giỏ hàng hiện tại. |
| POST | `/cart` | Customer | **Đã triển khai.** Thêm sản phẩm vào giỏ (`product_id`, `so_luong`); cộng số lượng nếu sản phẩm đã có trong giỏ và trả `422` nếu vượt tồn khả dụng. |
| PUT/PATCH | `/cart/{itemId}` | Customer | **Đã triển khai.** Cập nhật số lượng dương; từ chối nếu vượt tồn khả dụng. |
| DELETE | `/cart/{itemId}` | Customer | **Đã triển khai.** Bỏ sản phẩm khỏi giỏ. |
| POST | `/shipping/calculate` | Customer | **Đã triển khai.** Tính phí `5.000đ/km` từ địa chỉ, khoảng cách hoặc Haversine khi có tọa độ; không có Google Maps key thì dùng khoảng cách dự phòng cấu hình (mặc định 5 km). |
| POST | `/orders` | Customer | Tạo đơn lẻ từ giỏ; backend tự tính lại khoảng cách/phí theo địa chỉ và không nhận phí ship do client gửi. |
| GET | `/orders` | Customer; Sales/Admin | Customer chỉ xem đơn của mình; Sales/Admin xem toàn bộ đơn (kèm tên khách hàng). |
| GET | `/orders/{order}` | Customer sở hữu đơn | Xem chi tiết đơn và trạng thái. |
| POST | `/orders/{order}/cancel` | Customer sở hữu đơn, khi còn được phép hủy | Gửi yêu cầu hủy đơn. |
| POST | `/orders/{id}/complaints` | Customer sở hữu đơn đã giao trong 24 giờ | **Đã triển khai.** Gửi một khiếu nại cho đơn bằng `multipart/form-data`, bắt buộc có ảnh JPG/JPEG/PNG tối đa 5 MB. |
| PUT/PATCH | `/orders/{id}/status` | Customer; Sales/Admin | Cập nhật trạng thái theo state machine; Sales/Admin dùng PUT để cập nhật tiến trình giao hàng. |
| GET | `/complaints` | Sales, Admin | **Đã triển khai.** Danh sách phân trang kèm đơn hàng, khách hàng, người xử lý và URL ảnh minh chứng công khai. |
| PUT | `/complaints/{id}` | Sales | **Đã triển khai.** Xử lý khiếu nại đang chờ với `trang_thai` là `chap_nhan` hoặc `tu_choi`, bắt buộc ghi `phan_hoi`; lưu Sales xử lý và thời điểm xử lý. |

Khi tạo đơn, kiểm tra giá/trạng thái sản phẩm và tồn khả dụng; không ghi tồn kho vào `products`. Sales duyệt đơn mới kích hoạt trừ tồn FEFO trong transaction có khóa dòng.

## Thanh toán

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/payments/create` | Customer sở hữu đơn | Tạo giao dịch `momo`, `vietqr`, `payos` hoặc `vnpay`. VietQR trả `qr_image_url`, `payment_url` và `transfer`; PayOS trả `checkoutUrl` dưới dạng `payment_url` cùng QR payload; VNPay Sandbox trả URL ký HMAC-SHA512. PayOS thiếu key sẽ fallback sang VietQR; VNPay thiếu key giữ mô phỏng cũ. |
| POST | `/payments/ipn` | Callback mô phỏng (chỉ local/testing) | Giữ nguyên payload cũ (`ma_giao_dich`, `so_tien`, `trang_thai`) cho demo/tests; production không cho dùng IPN mô phỏng để tự xác nhận thanh toán. |
| POST | `/payments/payos/webhook` | PayOS, chữ ký HMAC-SHA256 | Xác minh chữ ký, `orderCode` và số tiền; callback thành công cập nhật `da_thanh_toan`, phân bổ FEFO trong transaction và có tính idempotent. |
| GET/POST | `/payments/vnpay/ipn` | VNPay, chữ ký HMAC-SHA512 | Xác minh chữ ký, merchant, `vnp_TxnRef`, số tiền (đơn vị callback chia 100) và mã kết quả; trả payload `RspCode`/`Message` theo chuẩn VNPay. |
| POST | `/orders/{order}/payments` | Customer sở hữu đơn | Endpoint mục tiêu nếu tích hợp cổng thanh toán thật. |
| GET | `/orders/{order}/payments` | Customer sở hữu đơn, Sales, Admin | Lịch sử giao dịch được phép xem. |
| POST | `/subscriptions/{subscription}/payments` | Customer sở hữu gói | Thanh toán trước gói định kỳ. |
| POST | `/payments/webhooks/{provider}` | Provider, xác thực chữ ký | Nhận callback MoMo/VNPay; không dùng JWT người dùng. |
| POST | `/sales/orders/{order}/refunds` | Sales | Hoàn tiền qua payment service; ghi audit log. |

VietQR cần `VIETQR_BANK_ID` và `VIETQR_ACCOUNT_NO`; callback ngân hàng không tự có từ URL QR nên không tự xác nhận giao dịch nếu chưa nối dịch vụ đối soát. PayOS cần đủ `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`; VNPay Sandbox cần `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`. Cấu hình callback public `/api/payments/payos/webhook` và `/api/payments/vnpay/ipn` ở cổng tương ứng. Không đưa API secret/checksum key vào frontend. IPN cũ chỉ bật ở local/testing. Mỗi payment gắn chính xác một `order_id` hoặc `subscription_id`.

Ảnh khiếu nại và nhật ký canh tác đi qua `ImageStorageService`. Cấu hình đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` để lưu ảnh lên Cloudinary theo thư mục `nong-lanh/complaints`, `nong-lanh/farming-logs` hoặc `nong-lanh/products`; nếu chưa cấu hình, ảnh được lưu vào disk `public` và phục vụ qua `/storage/...`. Môi trường testing luôn dùng disk local.

### Payload thanh toán ngoài

Tạo giao dịch vẫn dùng body tương thích cũ:

```json
{"order_id": 123, "phuong_thuc": "vietqr"}
```

`phuong_thuc` hỗ trợ `momo`, `vnpay`, `vietqr`, `payos`. Response tiếp tục trả `data.payment` và `data.qr_payload`; trường bổ sung tùy provider gồm `payment_url`, `qr_image_url`, `transfer` (`bank_id`, `account_no`, `account_name`, `amount`, `transfer_content`) và cờ `can_simulate`.

PayOS gửi callback tại `/api/payments/payos/webhook` dạng `{"success":true,"data":{"orderCode":123,"amount":70000,"code":"00",...},"signature":"<HMAC-SHA256>"}`. VNPay gửi các trường `vnp_TxnRef` (payment ID), `vnp_Amount` (số tiền nhân 100), `vnp_ResponseCode`, `vnp_TmnCode` và `vnp_SecureHash`; cả hai phương thức GET/POST đều nhận được tại `/api/payments/vnpay/ipn`.

## Gói định kỳ (Subscription)

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/subscription-plans` | Công khai | **Đã triển khai.** Danh sách gói đang hoạt động. |
| GET | `/subscription-plans/{plan}` | Công khai | Chi tiết gói. |
| POST | `/subscriptions` | Customer | **Đã triển khai.** Đăng ký gói với `plan_id`, địa chỉ, ngày bắt đầu, sản phẩm/số lượng mỗi lần giao, `chu_ky_giao_ngay` 7 hoặc 14 và ngày giao trong tuần (mặc định là thứ trong ngày bắt đầu). |
| GET | `/subscriptions` | Customer | **Đã triển khai.** Danh sách gói của chính mình, kèm sản phẩm, địa chỉ, chu kỳ giao và ngày giao. |
| GET | `/subscriptions/{subscription}` | Customer sở hữu gói | Chi tiết gói, sản phẩm và lịch giao. |
| PATCH | `/subscriptions/{id}/status` | Customer sở hữu gói | **Đã triển khai.** Tạm dừng, tiếp tục hoặc hủy theo chuyển trạng thái hợp lệ. |
| POST | `/subscriptions/{subscription}/cancel` | Customer sở hữu gói | Hủy gói theo chính sách. |
| GET | `/subscriptions/{subscription}/schedules` | Customer sở hữu gói, Sales | Lịch giao và đơn con đã sinh. |
| POST | `/sales/delivery-schedules/{schedule}/substitutions` | Sales | Đề xuất sản phẩm thay thế khi thiếu hàng, lưu quyết định vào lịch/đơn. |

Laravel Scheduler quét `delivery_schedules` và sinh đơn con trước ngày giao một ngày; unique `(subscription_id, ngay_giao)` ngăn sinh lịch trùng.

## Farm Staff — mùa vụ, lô, nhật ký & hao hụt

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/farm/seasons` | Farm Staff | Danh sách mùa vụ. |
| GET | `/seasons` | Farm Staff | **Đã triển khai.** Danh sách mùa vụ để gắn vào lô mới. |
| POST | `/seasons` | Farm Staff | **Đã triển khai.** Tạo mùa vụ, tự gắn nhân viên tạo. |
| GET | `/farm/products` | Farm Staff | **Đã triển khai.** Danh sách sản phẩm hoạt động, kể cả sản phẩm chưa có tồn, để tạo lô. |
| POST | `/batches` | Farm Staff | **Đã triển khai.** Tạo lô mới; nếu không gửi `ma_lo`, backend tự sinh mã lô. QR được tự sinh sau khi lô có ngày thu hoạch và nhật ký đầu tiên. |
| POST | `/batches/{id}/farming-logs` | Farm Staff | **Đã triển khai.** Tạo nhật ký canh tác có hành động, ghi chú, thời gian và ảnh minh chứng tùy chọn. |
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
| GET | `/complaints` | Sales, Admin | **Đã triển khai.** Danh sách khiếu nại cùng thông tin đơn, khách hàng và ảnh minh chứng. |
| PUT | `/complaints/{id}` | Sales | **Đã triển khai.** Chấp nhận/từ chối khiếu nại đang chờ, kèm phản hồi gửi khách hàng. |

Sales không được gọi API tạo lô, cập nhật tồn thủ công, sửa nhật ký canh tác hoặc ghi nhận xuất hủy; các yêu cầu này trả `403`.

## Admin — quản trị & báo cáo

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET/POST | `/admin/categories` | Admin | Danh sách/tạo danh mục. |
| GET/PUT/PATCH/DELETE | `/admin/categories/{category}` | Admin | Đọc/cập nhật/ngừng sử dụng danh mục. |
| GET/POST | `/admin/products` | Admin | Danh sách/tạo sản phẩm. |
| GET/PUT/PATCH/DELETE | `/admin/products/{product}` | Admin | Đọc/cập nhật/ngừng bán sản phẩm. |
| GET | `/admin/dashboard` | Admin | **Đã triển khai.** Tổng doanh thu đơn đã thanh toán/đã giao, đơn theo trạng thái, khách hàng, lô cận hạn và hao hụt. |
| GET | `/admin/users` | Admin | Danh sách tài khoản, lọc role/trạng thái. |
| GET | `/admin/users/{user}` | Admin | Chi tiết tài khoản. |
| PATCH | `/admin/users/{user}/role` | Admin | Gán role hợp lệ. |
| PATCH | `/admin/users/{id}/status` | Admin | **Đã triển khai.** Khóa/mở tài khoản; không cho tự khóa, ghi audit log và vô hiệu hóa JWT đang hoạt động của tài khoản bị khóa. |
| GET | `/admin/reports/overview` | Admin | Báo cáo tổng quan bán hàng/kho. |
| GET | `/admin/reports/waste` | Admin | Báo cáo hao hụt theo lô/mùa vụ/thời gian. |
| GET | `/admin/system-settings` | Admin | Xem cấu hình hệ thống. |
| PUT | `/admin/system-settings/{key}` | Admin | Cấu hình, gồm ngưỡng cảnh báo xả hàng. |
| GET | `/admin/audit-logs` | Admin | **Đã triển khai.** Tra cứu có phân trang, lọc theo hành động/bảng và thông tin người thao tác. |
| GET | `/admin/batches` | Admin | Chỉ đọc thông tin lô; không sửa lịch sử canh tác đã thu hoạch. |

Thay đổi trạng thái tài khoản qua Admin hiện ghi `audit_logs` với người thực hiện, thời gian, đối tượng, IP và dữ liệu trước/sau. Audit log cho duyệt đơn, xuất hủy, hoàn tiền và thay đổi cấu hình nhạy cảm vẫn cần được triển khai; lưu trữ audit log tối thiểu 90 ngày.

## Quy tắc nghiệp vụ áp dụng xuyên API

- **FEFO:** chọn lô `con_hang`, tồn `> 0`, chưa hết hạn, sắp xếp `ngay_het_han ASC, ngay_thu_hoach ASC`; khóa dòng và cập nhật tồn trong cùng transaction. Tồn không âm.
- **IPN mô phỏng:** không thay thế xác minh chữ ký MoMo/VNPay. Trước khi phát hành thật, phải xác minh chữ ký callback, merchant/order reference và idempotency theo tài liệu provider.
- **Khiếu nại:** Endpoint hiện triển khai chỉ nhận một ảnh minh chứng JPG/JPEG/PNG (kiểm tra phần mở rộng và MIME type, tối đa 5 MB), chỉ chủ đơn được gửi và chỉ trong 24 giờ từ `ngay_giao_thuc_te` của đơn `da_giao`. Hỗ trợ WEBP/video và các API xem/xử lý khiếu nại vẫn là mục tiêu chưa triển khai.
- **QR:** truy xuất công khai; sinh QR sau thu hoạch khi lô có nhật ký canh tác.
- **Tích hợp ngoài:** payment, tính phí giao hàng và media phải qua interface/service; cung cấp mock service local/test.
- **Lỗi tồn kho:** thao tác giỏ hàng trả `422` nếu yêu cầu vượt tồn khả dụng; duyệt đơn trả `422` với JSON lỗi chuẩn và rollback toàn bộ transaction nếu FEFO không đủ hàng.