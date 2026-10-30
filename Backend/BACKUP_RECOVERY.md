# Sao lưu và phục hồi PostgreSQL bằng công cụ local

Trang `/admin/backups` chỉ dành cho admin. Backend chạy `pg_dump` để tạo file
custom-format (`.dump`) và chạy `pg_restore` khi phục hồi. Trình duyệt không nhận
thông tin đăng nhập database và không trực tiếp chạy các công cụ PostgreSQL.

## Cấu hình Backend/VPS

Cài PostgreSQL client sao cho tài khoản chạy Backend gọi được `pg_dump` và
`pg_restore` từ `PATH`. Phiên bản client nên bằng hoặc mới hơn phiên bản PostgreSQL
server. Nếu công cụ không nằm trong `PATH`, cấu hình đường dẫn tuyệt đối:

```env
PG_DUMP_PATH=/usr/bin/pg_dump
PG_RESTORE_PATH=/usr/bin/pg_restore
```

Thông tin kết nối ưu tiên lấy từ `DATABASE_URL`:

```env
DATABASE_URL=postgresql://app_user:password@127.0.0.1:5432/graduate_project
```

Nếu không có `DATABASE_URL`, Backend dùng các biến hiện có `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD` và `DB_SSL`. Mật khẩu được truyền cho
PostgreSQL client qua `PGPASSWORD`, không nằm trong tham số command line.

File mặc định nằm trong `Backend/backups`. Trên VPS nên cấu hình một thư mục bền
vững, chỉ tài khoản chạy Backend có quyền đọc/ghi và nằm ngoài thư mục release:

```env
BACKUP_DIR=/var/lib/autodealer/backups
```

Nếu deploy bằng container, mount `BACKUP_DIR` vào persistent volume. File trong
filesystem tạm thời sẽ mất khi redeploy.

## Hoạt động

- **Sao lưu ngay** tạo file `autodealer-<thời-gian>.dump` bằng `pg_dump -Fc`.
- Danh sách trên giao diện được đọc từ các file hợp lệ trong `BACKUP_DIR`.
- Lịch tự động và cơ chế chạy bù giữ nguyên. File quá `retention_days` bị xóa.
- Phục hồi dùng `pg_restore --clean --if-exists --no-owner --no-privileges` vào
  đúng database đã cấu hình và đăng xuất admin sau khi hoàn tất.

Phục hồi thay cả dữ liệu lẫn schema và làm mất các thay đổi sau thời điểm backup.
Nên dừng lưu lượng ghi và tạo một bản sao mới trước khi phục hồi. Chức năng này
không sao lưu role/global object của PostgreSQL, ảnh Cloudinary, file upload, biến
môi trường hay secret. Khi database hỏng đến mức không thể đăng nhập giao diện,
chạy `pg_restore` thủ công trên VPS.
