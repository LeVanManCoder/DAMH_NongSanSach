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

## 5. Trạng thái dự án đã xác minh (2026-11-25)

Snapshot kiểm tra trên nhánh `develop`, tại commit `91ede1d` (trước cập nhật trạng thái này). Đây là tình trạng mã nguồn hiện tại, không phải xác nhận đã đáp ứng toàn bộ rubric Tuần 6.

### Đã có và đã kiểm tra

- Backend Laravel có 28 migration files; 24 migration nghiệp vụ tạo 24 bảng theo thiết kế. `php artisan migrate:status` báo tất cả migration đã chạy trên database cấu hình hiện tại. Có 24 Eloquent Models.
- JWT HS256, thời hạn 3.600 giây, lưu hash token để thu hồi; đăng nhập, đăng ký Customer, đăng xuất, `/auth/me`, khóa đăng nhập 15 phút sau 5 lần sai và middleware RBAC `401`/`403`.
- Global JSON error handling; API giỏ hàng và đơn hàng; quản lý lô (xem/tạo/sửa/xóa có điều kiện), ghi nhận hao hụt; QR truy xuất công khai; duyệt đơn Sales gọi FEFO trong transaction.
- Swagger UI/OpenAPI và Postman Collection v2.1 đã được thêm. Route Swagger là `/api/documentation`.
- Backend test: `php artisan test` đạt 16 tests / 155 assertions. PHPUnit dùng SQLite `:memory:`; kết quả này không thay thế kiểm thử tích hợp trên MySQL/MariaDB.
- Frontend React/Vite/Tailwind build thành công và `npm run lint` đạt; cấu hình Axios có `VITE_API_BASE_URL`.
- Route API hiện có 27 route first-party (bao gồm health check, alias `/user` và các route hỗ trợ). Các nhóm nghiệp vụ chính đã triển khai là auth, batches/QR/waste, cart, orders và trace.

### Chưa triển khai hoặc chưa nối hoàn chỉnh

- Frontend vẫn là khung: `ProductDetail.jsx` và `BatchWasteDashboard.jsx` là placeholder; chưa có màn hình đăng nhập, danh sách sản phẩm chạy dữ liệu thật, giỏ hàng, checkout, đơn hàng, thanh toán, khiếu nại hay quản trị. Các `productApi.js`/`batchApi.js` chưa được component sử dụng.
- Chưa có API `/products` hoặc `/products/{id}` dù `productApi.js` gọi hai đường dẫn này. `batchApi.getWasteDashboard()` gọi `GET /batches/waste`, route này không tồn tại; backend hiện có danh sách `GET /batches` và ghi hao hụt `POST /batches/{id}/waste`.
- Backend từ chối JWT hết hạn bằng `401`, nhưng chưa có refresh-token endpoint; frontend chưa lưu/đính kèm token, interceptor xử lý `401` hoặc luồng đăng nhập lại.
- Chưa có tính phí giao hàng động/quote: `OrderController` nhận phí tùy chọn từ payload và mặc định `phi_van_chuyen = 0`.
- Chưa có payment controller/provider, callback/webhook IPN, xác thực chữ ký, idempotency hoặc refund flow. Bảng/model `payments` chỉ là nền dữ liệu.
- Chưa có API/kênh upload và xử lý khiếu nại/media; bảng và model complaint hiện chỉ là nền dữ liệu.
- Subscription, delivery scheduling, reviews, product/category CRUD, phần lớn address CRUD, farming-log CRUD/harvest, notification và admin reporting chưa có API nghiệp vụ tương ứng; hiện có schema/model hoặc một số route đọc mẫu.
- `docs/api-contract.md` là hợp đồng mục tiêu và có ghi chú trạng thái triển khai đã cũ. Tên route cart/order trong tài liệu khác route đang chạy; tài liệu quy định thiếu tồn `409` trong khi code/test hiện trả `422`. Ví dụ JSON lỗi tài liệu chưa có `status: "error"` như response thực tế.
- Trong repository không tìm thấy lịch/rubric nghiệm thu Tuần 6; cần đối chiếu với đề cương chính thức của môn trước khi kết luận đạt/chưa đạt theo tuần.

### Ưu tiên cho phiên triển khai kế tiếp

1. **Nối luồng sản phẩm:** tạo Product/Category API và test; sửa `backend/routes/api.php`, bổ sung controller/request, nối `frontend/src/pages/customer/ProductDetail.jsx` với `frontend/src/api/productApi.js`; bỏ hoặc triển khai đúng `GET /batches/waste` trong `frontend/src/api/batchApi.js`.
2. **Hoàn thiện đăng nhập và hết hạn phiên:** thêm trang/route đăng nhập, auth state và lưu token theo quyết định bảo mật; cập nhật `frontend/src/api/axiosClient.js` để gắn Bearer token và xử lý `401` (xóa phiên, thông báo và yêu cầu đăng nhập lại). Chỉ thêm refresh token nếu đặc tả chính thức yêu cầu.
3. **Triển khai báo phí giao hàng:** thêm endpoint quote, interface/provider cùng mock local/test; checkout chỉ gửi địa chỉ/quote hợp lệ, backend tự tính và xác nhận phí trong `backend/app/Http/Controllers/Api/OrderController.php`.
4. **Thanh toán:** thêm payment service/provider, endpoint khởi tạo và webhook/IPN có xác thực chữ ký, idempotency, chuyển trạng thái và test giả lập; không tin trạng thái thanh toán do client gửi.
5. **Khiếu nại có minh chứng:** thêm API/Form Request/policy, kiểm tra MIME + phần mở rộng + giới hạn dung lượng, lưu trữ an toàn, hạn 24 giờ; bổ sung form frontend và feature tests.
6. **Subscription và các màn hình theo vai trò:** scheduler sinh lịch/đơn định kỳ, review, CRUD cần thiết cho Farm Staff/Sales/Admin; ưu tiên theo rubric Tuần 6 sau khi xác nhận đề cương.
7. **Đồng bộ tài liệu:** cập nhật `docs/api-contract.md` theo route, role, mã lỗi và payload thực tế sau từng nhóm API; bổ sung frontend/API integration tests thay vì chỉ dựa vào build.

## Cập nhật sau triển khai Ưu tiên 1 — Sản phẩm & Giỏ hàng (chưa commit)

Những mục dưới đây là trạng thái mới hơn snapshot lịch sử ở trên, trên nhánh `feature/tuan6-tich-hop-fe-be`:

- Backend có endpoint công khai `GET /api/products` (lọc `q`, `category_id`, phân trang) và `GET /api/products/{slug}`. Chỉ sản phẩm đang hoạt động có lô `con_hang`, tồn dương và chưa hết hạn được trả về; payload có mã lô, ngày thu hoạch/hết hạn, tồn khả dụng, mã QR và nhật ký canh tác.
- `POST /api/cart` và cập nhật `PUT/PATCH /api/cart/{itemId}` kiểm tra tồn khả dụng trong transaction, khóa các dòng lô phù hợp và trả lỗi validation `422` nếu số lượng vượt tồn. Giỏ hàng không giữ chỗ tồn kho; Sales vẫn phải qua FEFO khi duyệt đơn.
- Frontend có trang danh sách sản phẩm ở `/` và `/products`, chi tiết theo slug tại `/products/:slug`, timeline nhật ký và QR SVG sắc nét trỏ tới endpoint truy xuất công khai `/api/trace/{qr_code}`. Thao tác thêm giỏ hàng dùng Axios async, spinner và toast; Axios tự gắn JWT từ `localStorage.access_token` nếu có. Chưa có màn hình đăng nhập, do đó khách chưa đăng nhập nhận thông báo yêu cầu đăng nhập.
- Đã thêm `LoadingSpinner`, `ToastNotification`, `cartApi`; `productApi.js` khớp endpoint slug mới và `batchApi.js` chỉ còn các endpoint lô hàng thực tế. OpenAPI được tạo lại tại `backend/storage/api-docs/api-docs.json`, route Swagger UI là `/api/documentation`. `docs/api-contract.md` đã đồng bộ route sản phẩm, giỏ hàng và lỗi tồn kho.
- Kiểm tra: `php artisan test` đạt 19 tests / 179 assertions; `npm run build` và `npm run lint` đạt; Pint đạt trên các file PHP đã thay đổi. Lệnh Pint toàn dự án còn báo một số file migration và `config/cors.php` cũ, không thuộc thay đổi này.
- Chưa triển khai: giao diện đăng nhập/khôi phục phiên, trang giỏ hàng và checkout, tính phí giao hàng động, thanh toán/IPN, khiếu nại kèm ảnh/video, cùng các màn hình/luồng vai trò khác nêu trong roadmap.
- Không chạy `migrate:fresh`, không tạo commit và không push trong cập nhật này.

## Cập nhật sau triển khai Ưu tiên 2 — Đăng nhập, phiên JWT & truy xuất QR (chưa commit)

- Frontend có `AuthProvider`/`useAuth` quản lý phiên và trang `/login` gọi `POST /api/auth/login`; lưu `access_token` cùng user/role vào `localStorage`. Header hiển thị tên, nhãn vai trò và gọi `POST /api/auth/logout` khi đăng xuất.
- Axios tự gắn Bearer token. Khi một request dùng JWT hiện tại bị `401` (ngoại trừ request đăng nhập), token và user cũ được xóa, sau đó hiển thị popup tiếng Việt có nút chuyển tới `/login`. Không có refresh-token endpoint; người dùng đăng nhập lại để tạo phiên mới.
- Có trang công khai `/trace/:qrCode` gọi `GET /api/trace/{qrCode}`, trình bày sản phẩm, mã lô, mùa vụ/vùng trồng, ngày thu hoạch/hết hạn và timeline nhật ký canh tác. QR trong trang chi tiết sản phẩm hiện dẫn tới URL Frontend này; `VITE_APP_URL` được thêm vào `frontend/.env.example` để cấu hình domain dùng khi phát hành.
- Kiểm tra: `npm run build` và `npm run lint` đều đạt. Không có thay đổi backend/database; không chạy migration, không tạo commit và không push.
- Lưu ý bảo mật: JWT hiện lưu trong `localStorage`; cần tiếp tục đánh giá phương án cookie HttpOnly/SameSite nếu threat model hoặc yêu cầu triển khai production đòi hỏi giảm rủi ro XSS.

## Cập nhật sau triển khai Ưu tiên 3 — Checkout, phí ship, thanh toán & quản lý lô (chưa commit)

- Có `POST /api/shipping/calculate` cho Customer, tính phí `5.000đ/km`. Khi có Google Maps key và địa chỉ gốc, server gọi Distance Matrix; nếu không có key, nhận km trực tiếp hoặc dùng Haversine khi có tọa độ; địa chỉ chỉ có text dùng khoảng cách mặc định cấu hình `SHIPPING_FALLBACK_DISTANCE_KM` (mặc định 5 km). Khi có cấu hình Google, địa chỉ giao được gửi tới Google Maps để tính tuyến.
- `POST /api/orders` không nhận phí/khoảng cách từ client; server tính lại từ địa chỉ trước khi lưu `khoang_cach_km`, `phi_van_chuyen`, tổng thanh toán. Thêm `da_thanh_toan` vào enum bằng migration cộng thêm.
- Có `POST /api/payments/create` (Customer) tạo giao dịch MoMo/VNPay mô phỏng và QR payload. `POST /api/payments/ipn` kiểm tra mã giao dịch/số tiền, gọi `FefoService::approveAndAllocateOrder` trong transaction, cập nhật payment thành công và order `da_thanh_toan`; callback trùng lặp không trừ kho lần nữa. IPN hiện là mô phỏng, chưa xác minh chữ ký provider; không dùng như luồng thanh toán production.
- Migration `2026_11_25_230000_add_da_thanh_toan_to_orders_status` đã áp dụng bằng `php artisan migrate` an toàn (không chạy `migrate:fresh`); `migrate:status` xác nhận đã chạy.
- Frontend có `/cart`, `/checkout`: cập nhật/xóa giỏ, tự gọi API tính phí khi nhập địa chỉ, tạo đơn, hiển thị QR mô phỏng và nút xác nhận IPN. `BatchWasteDashboard.jsx` đọc tồn từ `GET /api/batches` và Farm Staff có form ghi nhận hao hụt; làm mới để đối chiếu tồn sau FEFO.
- Swagger đã sinh lại, gồm `/api/shipping/calculate`, `/api/payments/create`, `/api/payments/ipn`. Kiểm tra: `php artisan test` đạt 23 tests / 221 assertions; `npm run build`, `npm run lint` và Pint trên các file backend đã sửa đều đạt.
- Không tạo commit hoặc push trong cập nhật này.

## Cập nhật sau triển khai Ưu tiên 4 — Khiếu nại kèm ảnh minh chứng (chưa commit)

- Thêm `POST /api/orders/{id}/complaints`, chỉ role Customer. Backend giới hạn truy vấn theo `user_id` của JWT (đơn không thuộc về người gửi trả `404`), yêu cầu trạng thái `da_giao` và `ngay_giao_thuc_te` nằm trong 24 giờ gần nhất; mỗi đơn chỉ có một khiếu nại.
- Form Request kiểm tra lý do, mô tả tối đa 2.000 ký tự và ảnh bắt buộc. Chỉ nhận ảnh thật có MIME/đuôi JPG, JPEG hoặc PNG, dung lượng tối đa 5 MB; lưu file vào disk public (`storage/app/public/complaints`) và ghi đường dẫn, MIME, kích thước vào `complaint_media`. Tạo complaint/media nằm trong transaction; nếu ghi DB thất bại file vừa lưu được dọn lại.
- API danh sách `/api/orders` tải kèm khiếu nại/media. Frontend có `/orders` hiển thị lịch sử và chi tiết đơn, phân trang “Tải thêm”, trạng thái và khiếu nại hiện hữu. Header chỉ hiện “Đơn hàng của tôi” cho role Customer.
- Form khiếu nại chỉ hiển thị với đơn `da_giao` chưa quá 24 giờ; trạng thái chỉ `da_thanh_toan` không đủ điều kiện. Form yêu cầu ảnh `.jpg` hoặc `.png`, dung lượng nhỏ hơn 5 MB, kiểm tra ngay trên trình duyệt trước khi gửi `FormData`; lỗi hiện đỏ dưới trường file, có spinner và toast.
- Phạm vi hiện tại chỉ hỗ trợ một ảnh JPG/JPEG/PNG; video, WEBP, nhiều minh chứng, trang xử lý Sales và các endpoint GET khiếu nại chưa được triển khai.

## Cập nhật Sales — Quản lý và xác nhận giao đơn (chưa commit)

- Thêm trang `/staff/orders` dưới `StaffLayout`, đọc `GET /api/orders` với danh sách phân trang, tên khách hàng, mã đơn, tổng tiền và trạng thái. Chỉ Sales/Admin thấy liên kết; trang từ chối hiển thị dữ liệu cho vai trò khác.
- Sales có thể bắt đầu giao với đơn đã thanh toán/đã xác nhận, sau đó xác nhận đã giao với đơn đang giao/đang giao bù. Cập nhật trạng thái dùng `PUT /api/orders/{id}/status`, kèm spinner và toast; PATCH hiện tại vẫn được giữ tương thích.
- Order API eager-load tên khách hàng cho Sales/Admin; phản hồi Customer vẫn giới hạn đơn của chính họ. Đã kiểm thử route PUT và danh sách có tên khách hàng.

## Cập nhật Giai đoạn hoàn thiện — Trang chủ, tìm kiếm và nghiệp vụ nông trại

- Trang `/` là trang chủ mới với banner, danh mục nổi bật và sản phẩm mới nhất; Header có liên kết riêng tới `/` và `/products`. Trang `/products` hỗ trợ tìm theo tên qua `search`, lọc `category_id`, sắp xếp theo tên/mới nhất; API vẫn giữ `q` tương thích ngược.
- Backend công khai `GET /api/categories`; Farm Staff có `GET/POST /api/seasons`, `GET /api/farm/products` để chọn sản phẩm kể cả khi chưa có tồn, và `POST /api/batches` tự sinh mã lô nếu client bỏ trống `ma_lo`.
- Khu vực `/staff/batches` có form tạo lô, gắn sản phẩm/mùa vụ, ngày thu hoạch/hạn dùng/số lượng và form ghi nhật ký theo từng lô. `POST /api/batches/{id}/farming-logs` nhận hành động, ghi chú, thời gian và ảnh tùy chọn; API `/batches` tải kèm nhật ký để cập nhật giao diện.
- Giữ quy tắc truy xuất: không sinh QR khi lô chưa có ngày thu hoạch hoặc nhật ký. Sau khi lô có ngày thu hoạch, nhật ký đầu tiên tự kích hoạt sinh QR; nhật ký hiển thị qua trang `/trace/:qrCode`.
- Feature tests bao phủ tìm kiếm/lọc, danh mục, quyền mùa vụ và luồng Farm Staff tạo mùa vụ → lô → nhật ký → QR/truy xuất. Toàn bộ backend đạt 33 tests / 284 assertions; frontend lint/build đạt. Chưa commit/push.

## Cập nhật Giai đoạn hoàn thiện — Sales xử lý khiếu nại & Customer đánh giá

- Thêm migration mở rộng trạng thái khiếu nại với `chap_nhan` và trường `phan_hoi`; phiên bản SQLite dùng cột string để tương thích test, MySQL/MariaDB nâng enum bằng migration tăng tiến. Sales có thể quyết định một lần trên khiếu nại đang chờ; ghi người xử lý, thời điểm và phản hồi. Từ chối cũng lưu phản hồi vào `ly_do_tu_choi` để giữ tương thích ràng buộc hiện hành.
- `GET /api/complaints` chỉ Sales/Admin, trả dữ liệu phân trang kèm đơn, khách hàng, người xử lý và public URL ảnh. `PUT /api/complaints/{id}` chỉ Sales, nhận `chap_nhan|tu_choi` và ghi chú bắt buộc.
- Ảnh được lưu trên disk `public`; liên kết tĩnh theo chuẩn Laravel `/storage/complaints/...` được tạo bằng `php artisan storage:link`. `public/storage` bị ignore để không đưa symlink máy cá nhân vào Git; cần chạy lệnh này sau deploy nếu chưa có liên kết.
- Thêm `GET /api/products/{id}/reviews` công khai, phân trang và trả điểm trung bình; `POST` chỉ Customer có đơn `da_giao` chứa sản phẩm đó, rating 1–5, bình luận tối đa 500 ký tự và duy nhất mỗi đơn/sản phẩm.
- Frontend có `/staff/complaints` cho Sales/Admin xem/phóng to ảnh, phản hồi và chấp nhận/từ chối. `/orders` hiển thị trạng thái/phản hồi khiếu nại và form đánh giá theo sản phẩm trên đơn đã giao; Product Detail hiển thị điểm trung bình và bình luận.
- Feature tests mới cho quyền, ảnh công khai, chấp nhận/từ chối, feedback bắt buộc, điều kiện đơn đánh giá, rating và chống đánh giá trùng. Toàn bộ backend đạt 39 tests / 319 assertions; frontend lint, build, PHP syntax/Pint và sinh Swagger đều đạt. Đã tạo `backend/public/storage` junction tới `storage/app/public` bằng `php artisan storage:link`. Chưa commit/push; không thêm chữ ký AI vào commit.

## Cập nhật Giai đoạn hoàn thiện — Sổ địa chỉ & gói định kỳ

- Customer có API quản lý địa chỉ `/api/addresses`: GET/POST/PUT/DELETE và PATCH `/{id}/default`. Mỗi địa chỉ gắn với chủ sở hữu; địa chỉ đầu tiên thành mặc định, chọn mặc định sẽ bỏ mặc định cũ, xóa địa chỉ mặc định sẽ chuyển sang địa chỉ còn lại gần nhất. Địa chỉ đang được subscription sử dụng không thể xóa. Latitude/longitude tùy chọn phải gửi theo cặp và được giới hạn trong miền tọa độ hợp lệ.
- Checkout tải sổ địa chỉ, tự điền địa chỉ mặc định, cho chọn nhanh địa chỉ đã lưu hoặc nhập địa chỉ mới. Khi địa chỉ có tọa độ, phí ship preview và server tính lại lúc tạo đơn đều nhận tọa độ để dùng Haversine dự phòng.
- Có GET công khai `/api/subscription-plans`, cùng GET/POST `/api/subscriptions` và PATCH `/api/subscriptions/{id}/status` chỉ cho Customer. Đăng ký lưu gói, địa chỉ thuộc khách, ngày bắt đầu, sản phẩm và số lượng mỗi lần, thứ giao, snapshot đơn giá và tổng giá trị mỗi lần giao.
- Thêm `chu_ky_giao_ngay` trên subscription với giá trị 7 hoặc 14 ngày (tách khỏi thời hạn gói `subscription_plans.chu_ky_ngay`). Gói tạo mới bắt đầu ở `dang_hoat_dong`; chuyển trạng thái hỗ trợ tạm dừng, tiếp tục và hủy; không thể khởi động lại gói đã hủy.
- Frontend có `/profile` để thêm/xóa/đặt mặc định địa chỉ và `/subscriptions` để đăng ký, xem, tạm dừng/tiếp tục/hủy gói. Header Customer có liên kết tới hai trang.
- Giai đoạn này chưa triển khai thu tiền subscription và Scheduler sinh delivery schedules/đơn định kỳ; đăng ký hiện hoạt động trực tiếp để quản lý/demo luồng.
- Migration `2026_11_26_000002_add_delivery_interval_to_subscriptions` đã được áp dụng thành công bằng `php artisan migrate --force` sau khi xác nhận đây là migration duy nhất đang chờ. Toàn bộ backend đạt 43 tests / 359 assertions; frontend lint/build, PHP syntax/Pint và Swagger đạt. Không dùng `migrate:fresh`; không tự commit/push.
