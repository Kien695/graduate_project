# Sao lưu và phục hồi PostgreSQL có mã hóa

Trang `/admin/backups` chỉ dành cho admin. Backend dùng `pg_dump -Fc` và
`pg_restore`; thông tin kết nối và khóa mã hóa không được gửi tới trình duyệt.

## Cấu hình máy chủ

Cài PostgreSQL client cùng hoặc mới hơn phiên bản server. Có thể chỉ định:

```env
PG_DUMP_PATH=/usr/bin/pg_dump
PG_RESTORE_PATH=/usr/bin/pg_restore
BACKUP_DIR=/var/lib/autodealer/backups
```

Tạo khóa ngẫu nhiên đúng 32 byte và biểu diễn dưới dạng Base64:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Đặt kết quả vào `Backend/.env` hoặc secret manager của máy chủ:

```env
BACKUP_ENCRYPTION_KEY=<base64-của-32-byte-ngẫu-nhiên>
```

Không commit khóa thật, không đặt khóa trong frontend. Sao lưu khóa ở secret
manager an toàn; mất khóa đồng nghĩa không thể phục hồi các backup đã mã hóa.
Khởi động lại Backend và scheduler sau khi cấu hình hoặc thay khóa.

Thông tin database ưu tiên `DATABASE_URL`; nếu không có, Backend dùng `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`. Mật khẩu chỉ được truyền
cho PostgreSQL client qua `PGPASSWORD`, không nằm trong command line hoặc log.

## Định dạng và quy trình

Backup mới có tên `autodealer-<thời-gian>.dump.enc`. Cả nút **Sao lưu ngay** và
scheduler đều gọi cùng `backup.service.create()`/`postgresBackup.createDump()`:

1. Kiểm tra `BACKUP_ENCRYPTION_KEY` trước khi gọi `pg_dump`.
2. Tạo custom dump trong file tạm.
3. Mã hóa streaming bằng AES-256-GCM với IV ngẫu nhiên 12 byte.
4. Lưu magic định dạng, phiên bản, IV, ciphertext và authentication tag 16 byte.
5. Xóa file dump tạm chưa mã hóa trong `finally`, kể cả khi có lỗi.

Nếu khóa thiếu hoặc không phải Base64 của đúng 32 byte, tác vụ thất bại rõ ràng;
không có fallback tạo backup plaintext.

Khi phục hồi, Backend nhận diện magic/version, xác thực và giải mã vào file tạm,
sau đó mới gọi `pg_restore --clean --if-exists --no-owner --no-privileges`.
File tạm được xóa trong `finally` dù thành công hay lỗi. Người dùng vẫn nhập
`PHUC HOI` trên giao diện để xác nhận ghi đè; đây không phải khóa mã hóa và không
cần nhập `BACKUP_ENCRYPTION_KEY` mỗi lần.

## Backup `.dump` cũ

File `.dump` cũ không có magic mã hóa được đánh dấu `legacy_unencrypted`, không
bị nhận nhầm là file mã hóa và không bị retention tự động xóa. Hệ thống vẫn cho
phục hồi để tương thích, nhưng giao diện hiển thị cảnh báo và API yêu cầu cờ xác
nhận legacy riêng ngoài bước `confirm=true`. Không đổi tên `.dump` thành
`.dump.enc`; việc đó không mã hóa nội dung.

Phục hồi thay cả dữ liệu và schema, làm mất thay đổi sau thời điểm backup. Nên
dừng lưu lượng ghi và tạo một backup mới trước khi phục hồi. Backup database không
bao gồm PostgreSQL role/global objects, file upload, Cloudinary hoặc secret môi
trường.
