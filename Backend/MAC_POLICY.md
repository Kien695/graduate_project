# Chính sách MAC của hợp đồng

Nhãn bắt buộc trên `users.security_level_id` và `contracts.security_level_id`:
PUBLIC (0) < INTERNAL (1) < CONFIDENTIAL (2) < RESTRICTED (3).
Backend đọc nhãn hiện tại từ database; quyền không được lấy từ nhãn cũ trong token.
Thiếu nhãn hợp lệ bị từ chối. Category cũ chỉ là dữ liệu lưu lại, không tham gia phân quyền.

## Quyền truy cập

Điều kiện MAC: rank người dùng >= rank hợp đồng. API danh sách lọc theo cùng điều
kiện với chi tiết. Khách còn phải sở hữu hợp đồng qua orders.customer_id và
customers.user_id; chỉ thấy APPROVED, SIGNED, COMPLETED. Hợp đồng không được phép
truy cập trả 404 ở API khách hàng để không tiết lộ sự tồn tại.

| Thao tác | Vai trò / điều kiện bổ sung |
| --- | --- |
| Tạo hợp đồng | ADMIN, MANAGER, STAFF; nhãn mới không vượt mức người tạo |
| Sửa nội dung, ghi nhận thanh toán | ADMIN, MANAGER, STAFF; đạt MAC và điều kiện trạng thái nghiệp vụ |
| Duyệt | ADMIN, MANAGER; đạt MAC; DRAFT -> APPROVED |
| Khách xác nhận | Đúng chủ, đạt MAC; APPROVED -> SIGNED |
| Đổi nhãn hợp đồng | ADMIN; đạt MAC với cả nhãn cũ và mới; lưu nhật ký trước/sau |
| Đổi nhãn người dùng | ADMIN; nhãn hợp lệ; lưu nhật ký trước/sau |

Admin là người quản trị nhãn tin cậy. Việc hạ nhãn là quyết định công bố dữ liệu
được ghi audit; không tự hạ nhãn khi duyệt hoặc thanh toán. Khách PUBLIC mất quyền
ngay ở yêu cầu API tiếp theo khi hợp đồng được nâng lên INTERNAL; dữ liệu đã xem
trước đó không thể bị thu hồi khỏi thiết bị.

Đây là chính sách MAC theo mức kết hợp RBAC và quyền sở hữu cho nghiệp vụ.
Không tuyên bố triển khai đầy đủ Bell–LaPadula/no-write-down: việc ghi nghiệp vụ
được cho phép theo vai trò và điều kiện MAC nêu trên.

## Migration và kiểm tra

`npm run db:migrate` chạy schema rồi migration `20260909_mac_four_levels.sql`.
Nhãn SECRET/TOP_SECRET cũ được chuyển sang CONFIDENTIAL/RESTRICTED.
Người dùng chưa có nhãn nhận PUBLIC; hợp đồng chưa có nhãn nhận RESTRICTED
để tránh vô tình công bố. Đăng ký khách mới luôn gán PUBLIC ở phía server.
Không chạy lại migration category cũ hoặc backfill category cho mô hình này.

Chạy `node scripts/testMacLevels.js` trên database phát triển có ít nhất một hợp
đồng khách hàng. Kiểm tra 16 cặp mức, quyền sở hữu, trạng thái và xác nhận; tất cả
thay đổi kiểm tra được rollback. Chạy `npm run check` để kiểm tra cú pháp Backend.
