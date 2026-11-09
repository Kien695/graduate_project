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
và tài khoản PostgreSQL được cấp membership role này mới được đổi classification;
chức danh/nhóm nghiệp vụ (kể cả giám đốc) không tự động có quyền. Việc đổi nhãn chạy qua system/security-admin
transaction và được ghi audit. Người dùng thường bị thu hồi quyền UPDATE cột
`security_level_id` trên cả `users` và `contracts`.

Hợp đồng mới không nhận classification từ client. Default cột tại PostgreSQL gọi
`contract_default_security_level_id()` và trả về mức `INTERNAL`. Quyền INSERT của
tài khoản nghiệp vụ loại trừ cột `security_level_id`. Mỗi lần đổi nhãn bắt buộc có
actor và lý do; trigger ghi vào `contract_security_level_history`. Migration không
cập nhật nhãn của bất kỳ hợp đồng cũ nào.

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
-- Lấy tất cả hợp đồng có cùng hoặc nhỏ hơn mức mac
SELECT session_user, public.mac_subject_rank();
SELECT c.id, sl.name
FROM public.contracts c
JOIN public.security_levels sl ON sl.id = c.security_level_id;


-- lấy hợp đồng cùng hoặc nhỏ hơn mức mac và lấy theo người tạo

SELECT
    c.id,
    c.contract_number,
    c.created_by,
    creator.full_name AS created_by_name,
    sl.name AS security_level,
    sl.rank AS security_rank
FROM public.contracts c
JOIN public.security_levels sl
    ON sl.id = c.security_level_id
JOIN public.users creator
    ON creator.id = c.created_by
WHERE LOWER(creator.db_user) = LOWER(session_user)
  AND sl.rank <= public.mac_subject_rank()
ORDER BY c.created_at DESC;
```

Khi userA ở PUBLIC, kết quả không chứa hợp đồng INTERNAL; truy vấn theo đúng id
của hợp đồng đó trả 0 hàng.
