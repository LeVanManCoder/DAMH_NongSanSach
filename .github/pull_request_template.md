## Mô tả

<!-- Tóm tắt thay đổi và liên kết issue liên quan (nếu có). -->

## Checklist trước khi merge vào `develop`

- [ ] Pull Request có phạm vi rõ ràng và không chứa thay đổi ngoài mục tiêu.
- [ ] Đã tự review mã nguồn và xử lý các góp ý.
- [ ] Backend: `php artisan test` chạy thành công (nếu có thay đổi backend).
- [ ] Frontend: `npm run build` chạy thành công (nếu có thay đổi frontend).
- [ ] Đã kiểm tra thủ công các luồng bị ảnh hưởng.
- [ ] Đã cập nhật tài liệu/API contract/database schema nếu cần.
- [ ] Không đưa `.env`, thông tin bí mật, `vendor/` hoặc `node_modules/` vào commit.
- [ ] Đã xác nhận nhánh đích là `develop`.

## Ảnh chụp màn hình (nếu có)

<!-- Đính kèm ảnh trước/sau cho thay đổi giao diện. -->
