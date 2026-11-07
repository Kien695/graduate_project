# Chính sách MAC của hợp đồng

## Nhãn và thứ tự

Nguồn duy nhất là `security_levels.rank`:

`PUBLIC (0) < INTERNAL (1) < CONFIDENTIAL (2) < RESTRICTED (3)`.

Clearance của chủ thể nằm ở `users.security_level_id`; classification của hợp
đồng nằm ở `contracts.security_level_id`. User thiếu nhãn được gán PUBLIC; hợp
đồng cũ thiếu nhãn được gán RESTRICTED để không vô tình công bố dữ liệu.

## Thực thi trong PostgreSQL

Migration `20261106_contract_mac_rls.sql` bật và `FORCE ROW LEVEL SECURITY` trên
`contracts`. PostgreSQL nhận diện chủ thể bằng `session_user`, ánh xạ tới
`users.db_user`; user id hay clearance do client gửi không được policy tin cậy.

- SELECT: không đọc lên (`subject.rank >= object.rank`). Customer còn phải sở hữu hợp đồng.
- INSERT: không ghi xuống (`object.rank >= subject.rank`).
- UPDATE: nhãn hàng cũ và mới đều phải tuân thủ không ghi xuống.
- DELETE: hàng bị xóa phải tuân thủ không ghi xuống.

Role nghiệp vụ là LOGIN role `NOSUPERUSER NOBYPASSRLS`, không sở hữu bảng.
`contract_security_admin` là NOLOGIN role riêng cho đường quản lý nhãn. Chỉ API
ADMIN được đổi classification; việc đổi nhãn chạy qua system/security-admin
transaction và được ghi audit. Người dùng thường bị thu hồi quyền UPDATE cột
`security_level_id` trên cả `users` và `contracts`.

Các hàm trong policy là `SECURITY DEFINER`, cố định `search_path` thành
`pg_catalog, public`, thu hồi EXECUTE khỏi PUBLIC và chỉ cấp cho từng DB login.
`FORCE RLS` không chặn PostgreSQL superuser; không dùng superuser/BYPASSRLS làm
tài khoản truy vấn nghiệp vụ.

## Migration và kiểm tra

Từ thư mục `Backend`, chạy migration trên môi trường đích đã chọn rõ ràng:

```powershell
npm.cmd run db:migrate
```

Không tự động chạy lệnh này lên production. Migration giữ nguyên bảng và dữ liệu.

```powershell
$env:RLS_TEST_DB_PASSWORD = '<password-của-role-thử-nghiệm>'
npm.cmd run test:contract-rls
```

Hoặc đăng nhập trực tiếp bằng role của userA rồi chạy:

```sql
SELECT session_user, public.mac_subject_rank();
SELECT c.id, sl.name
FROM public.contracts c
JOIN public.security_levels sl ON sl.id = c.security_level_id;
```

Khi userA ở PUBLIC, kết quả không chứa hợp đồng INTERNAL; truy vấn theo đúng id
của hợp đồng đó trả 0 hàng.
