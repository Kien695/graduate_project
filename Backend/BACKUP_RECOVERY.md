# Sao lưu và phục hồi

Admin mở **Sao lưu & phục hồi** (`/admin/backups`) để bật/tắt lịch hằng ngày,
chọn giờ theo múi giờ máy chủ, số ngày lưu và xem lần chạy tiếp theo.
Cấu hình lưu trong database; có hiệu lực ngay và được tải lại khi Backend khởi động.
Nếu chưa lưu cấu hình, dùng AUTO_BACKUP_ENABLED, BACKUP_HOUR và BACKUP_RETENTION_DAYS
trong môi trường (mặc định bật, 02:00, 30 ngày).

Backend phải chạy vào giờ đã chọn. Lịch trong tiến trình không chạy bù các lần
máy chủ tắt. Bản sao thành công quá hạn được dọn sau lần sao lưu tự động thành công.
Chỉ chạy một tiến trình lập lịch cho cùng database.

## Phục hồi qua trang Admin

1. Dừng thao tác ghi của người dùng; tạo bản sao hiện tại bằng **Sao lưu ngay**.
2. Chọn bản sao thành công, kiểm tra tên và thời điểm tạo.
3. Chọn **Phục hồi**, nhập `PHUC HOI` để xác nhận thay thế dữ liệu hiện tại.
4. Chờ hoàn tất, đăng nhập lại và kiểm tra người dùng, hợp đồng và thanh toán.

Phục hồi dùng một transaction: lỗi SQL sẽ rollback. Không gửi lại yêu cầu nếu mất
kết nối khi đang chạy; kiểm tra trạng thái server trước. Phiên đăng nhập, cấu hình
và nhãn bảo mật cũng trở về thời điểm sao lưu. File backup không chứa ảnh Cloudinary,
file môi trường hoặc các khóa mã hóa; cần sao lưu các tài nguyên đó riêng, bảo vệ
khóa mã hóa và giữ bản sao ngoài máy chủ để phòng hỏng ổ đĩa.

Luồng phục hồi cần cả `pg_restore` và `psql` (có thể cấu hình `PSQL_PATH`). Bản sao
cũ được chuyển thành SQL tạm; ba CHECK constraint category cũ được bỏ trước COPY
để tương thích MAC bốn mức. Bản `.dump` gốc không thay đổi. File SQL tạm được xóa
sau khi hoàn tất hoặc có lỗi. Với bản sao cũ chứa các CHECK này, ưu tiên luồng
phục hồi trong ứng dụng; lệnh pg_restore trực tiếp bên dưới có thể gặp lỗi category.

## Khi Backend hoặc database không hoạt động

Trang quản trị cần database để đăng nhập nên không thay thế quy trình phục hồi ngoài
ứng dụng. Quản trị viên cần khởi động PostgreSQL, tạo database đích nếu đã mất,
và chạy công cụ PostgreSQL bằng tài khoản có quyền phù hợp. Chọn đúng host, port,
tài khoản và database đích; giữ Backend dừng trong lúc phục hồi.

Ví dụ trong terminal có `pg_restore` trong PATH (thay các giá trị trong dấu ngoặc):

```text
pg_restore --host=<host> --port=<port> --username=<user> --dbname=<database> --clean --if-exists --no-owner --single-transaction --exit-on-error <backup.dump>
```

Dùng cơ chế nhập mật khẩu hoặc cấu hình bí mật của PostgreSQL, không ghi mật khẩu
vào lệnh. Khôi phục cấu hình và khóa mã hóa đúng thời điểm, chạy migration nếu bản
sao cũ hơn phiên bản ứng dụng, rồi khởi động Backend và kiểm tra dữ liệu.

## Kiểm chứng

`node scripts/testBackupRestore.js` tạo database tạm có tên `backup_test_<timestamp>`,
kiểm tra cấu hình/lịch và sao lưu–phục hồi bằng pg_dump/pg_restore thật, sau đó xóa
database tạm. Tài khoản kiểm thử cần quyền tạo database. Không phục hồi vào database
đang dùng. Thời gian phục hồi thực tế phụ thuộc kích thước dữ liệu và cần đo định kỳ;
lịch mỗi ngày có thể mất tối đa khoảng một ngày dữ liệu nếu các lần chạy đều thành công.
