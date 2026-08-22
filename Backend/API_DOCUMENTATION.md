# Auto Dealer Management System — Backend API

## 1. Tổng quan

- Base URL mặc định: `http://localhost:5000/api`
- Content-Type thông thường: `application/json`
- Upload ảnh: `multipart/form-data`
- Authentication: JWT Bearer Token hoặc cookie `accessToken`
- Access token mặc định hết hạn sau `15m`
- Refresh token mặc định hết hạn sau `7d`

Header xác thực:

```http
Authorization: Bearer <access_token>
```

Response thành công:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Response lỗi:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

Các role đang sử dụng: `admin`, `manager`, `staff`, `customer`.

## 2. Authentication và User

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Đăng nhập |
| POST | `/api/auth/refresh-token` | Public | Cấp access token mới |
| POST | `/api/auth/logout` | Public | Thu hồi refresh token hiện tại |
| POST | `/api/auth/logout-all` | Đã đăng nhập | Đăng xuất tất cả thiết bị |
| POST | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu và thu hồi các phiên |
| POST | `/api/auth/unlock-account` | Admin | Mở khóa tài khoản |
| GET | `/api/users/me` | Đã đăng nhập | Thông tin tài khoản hiện tại |
| PUT | `/api/users/me` | Đã đăng nhập | Cập nhật thông tin cá nhân |
| PATCH | `/api/users/:id/security-level` | Admin | Gán nhãn bảo mật |
| PATCH | `/api/users/:id/lock` | Admin | Khóa tài khoản |

Payload đăng nhập:

```json
{
  "email": "admin@autodealer.com",
  "password": "Admin@123456",
  "deviceId": "browser-device-id",
  "deviceType": "desktop"
}
```

Payload refresh token:

```json
{
  "refreshToken": "<refresh_token>"
}
```

Refresh token cũng có thể được gửi bằng cookie HTTP-only `refreshToken`.

Payload đổi mật khẩu:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

Payload mở khóa:

```json
{
  "userId": 1
}
```

## 3. Customer

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/customers` | Admin/Manager/Staff | Danh sách khách hàng |
| GET | `/api/customers/:id` | Admin/Manager/Staff | Chi tiết khách hàng |
| POST | `/api/customers` | Admin/Manager/Staff | Tạo khách hàng |
| PUT | `/api/customers/:id` | Admin/Manager/Staff | Cập nhật khách hàng |
| DELETE | `/api/customers/:id` | Admin/Manager | Vô hiệu hóa khách hàng |
| GET | `/api/customers/:id/orders` | Đã đăng nhập | Lịch sử đơn hàng |
| GET | `/api/customers/:id/contracts` | Đã đăng nhập | Hợp đồng khách hàng |
| POST | `/api/customers/:id/encrypt-profile` | Admin/Manager | Mã hóa hồ sơ |
| GET | `/api/customers/:id/encrypted-profile` | Admin/Manager | Giải mã và truy xuất hồ sơ |

Các trường Customer hỗ trợ:

```json
{
  "user_id": 1,
  "full_name": "Nguyen Van A",
  "email": "customer@example.com",
  "phone": "0900000000",
  "address": "Ho Chi Minh City",
  "is_active": true
}
```

Mã hóa hồ sơ yêu cầu `PROFILE_ENCRYPTION_KEY` trong `.env`:

```json
{
  "profile": {
    "citizenId": "012345678901",
    "privateNote": "Sensitive information"
  }
}
```

## 4. Vehicle

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/vehicles` | Public | Danh sách xe |
| GET | `/api/vehicles/available` | Public | Xe đang khả dụng |
| GET | `/api/vehicles/:id` | Public | Chi tiết xe |
| POST | `/api/vehicles` | Admin/Manager/Staff | Thêm xe |
| PUT | `/api/vehicles/:id` | Admin/Manager/Staff | Cập nhật xe |
| PATCH | `/api/vehicles/:id/status` | Admin/Manager/Staff | Cập nhật trạng thái |
| DELETE | `/api/vehicles/:id` | Admin/Manager | Xóa xe |

Các trạng thái được sử dụng: `available`, `reserved`, `sold`, `maintenance`, `inactive`.

```json
{
  "vin": "VIN000000000001",
  "brand": "Toyota",
  "model": "Camry",
  "manufacture_year": 2026,
  "color": "Black",
  "price": 1200000000,
  "status": "available",
  "description": "Vehicle description"
}
```

Danh sách hỗ trợ query `page`, `limit`, `search` và `status`.

## 5. Accessory

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/accessories` | Public | Danh sách phụ kiện |
| GET | `/api/accessories/:id` | Public | Chi tiết phụ kiện |
| POST | `/api/accessories` | Admin/Manager/Staff | Thêm phụ kiện |
| PUT | `/api/accessories/:id` | Admin/Manager/Staff | Cập nhật phụ kiện |
| DELETE | `/api/accessories/:id` | Admin/Manager | Vô hiệu hóa phụ kiện |

```json
{
  "name": "Dash camera",
  "sku": "CAM-001",
  "price": 2500000,
  "stock": 10,
  "is_active": true
}
```

## 6. Order

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/orders` | Đã đăng nhập | Đặt xe |
| GET | `/api/orders` | Admin/Manager/Staff | Danh sách đơn |
| GET | `/api/orders/my-orders` | Đã đăng nhập | Đơn hàng của người dùng |
| GET | `/api/orders/:id` | Đã đăng nhập | Chi tiết đơn |
| PUT | `/api/orders/:id` | Admin/Manager/Staff | Cập nhật ghi chú |
| POST | `/api/orders/:id/confirm` | Admin/Manager/Staff | Xác nhận đơn |
| POST | `/api/orders/:id/cancel` | Đã đăng nhập | Hủy đơn |
| POST | `/api/orders/:id/complete` | Admin/Manager/Staff | Hoàn tất đơn |

```json
{
  "customer_id": 1,
  "vehicle_id": 1,
  "note": "Customer note"
}
```

Khi tạo đơn, service khóa bản ghi xe trong transaction. Xe phải có trạng thái `available`; sau khi đặt sẽ chuyển sang `reserved`. Hủy đơn trả xe về `available`; hoàn tất chuyển xe sang `sold`.

## 7. Contract

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/contracts` | Admin/Manager/Staff | Danh sách hợp đồng theo MAC |
| GET | `/api/contracts/:id` | Đã đăng nhập + MAC | Chi tiết hợp đồng |
| POST | `/api/contracts` | Admin/Manager/Staff | Tạo hợp đồng |
| PUT | `/api/contracts/:id` | Admin/Manager/Staff + MAC | Cập nhật hợp đồng |
| DELETE | `/api/contracts/:id` | Admin/Manager | Hủy hợp đồng |
| POST | `/api/contracts/:id/approve` | Admin/Manager | Duyệt hợp đồng |
| POST | `/api/contracts/:id/sign` | Đã đăng nhập + MAC | Ký hợp đồng |
| POST | `/api/contracts/:id/payment` | Admin/Manager/Staff + MAC | Thanh toán |
| GET | `/api/contracts/:id/audit-logs` | Đã đăng nhập + MAC | Lịch sử hợp đồng |
| PATCH | `/api/contracts/:id/security-level` | Admin | Gán nhãn bảo mật |

Tạo hợp đồng:

```json
{
  "order_id": 1,
  "contract_number": "HD-2026-0001",
  "terms": "Contract terms",
  "security_level_id": 2
}
```

Thanh toán:

```json
{
  "amount": 500000000,
  "method": "bank_transfer",
  "reference": "PAYMENT-REFERENCE"
}
```

Đơn hàng phải ở trạng thái `confirmed` trước khi tạo hợp đồng. Tổng thanh toán không được vượt giá trị đơn hàng.

## 8. Inspection

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/inspections` | Admin/Manager/Staff | Danh sách kiểm định |
| GET | `/api/inspections/:id` | Admin/Manager/Staff | Chi tiết kiểm định |
| POST | `/api/inspections` | Admin/Manager/Staff | Tạo kiểm định |
| PUT | `/api/inspections/:id` | Admin/Manager/Staff | Cập nhật ghi chú |
| POST | `/api/inspections/:id/pass` | Admin/Manager/Staff | Đánh dấu đạt |
| POST | `/api/inspections/:id/fail` | Admin/Manager/Staff | Đánh dấu không đạt |
| POST | `/api/inspections/:id/images` | Admin/Manager/Staff | Upload ảnh Cloudinary |

Tạo phiếu:

```json
{
  "vehicle_id": 1,
  "notes": "Initial inspection"
}
```

Upload ảnh dùng `multipart/form-data`, field name là `images`. Tối đa 10 file, mỗi file tối đa 5 MB; định dạng JPEG, PNG hoặc WEBP.

## 9. Device và Session

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/sessions` | Đã đăng nhập | Danh sách phiên của tài khoản |
| GET | `/api/devices` | Đã đăng nhập | Danh sách thiết bị/phiên |
| DELETE | `/api/devices/:id` | Đã đăng nhập | Đăng xuất thiết bị |
| POST | `/api/devices/check-login` | Đã đăng nhập | Kiểm tra giới hạn thiết bị |

- Nhân viên: tối đa 1 phiên hoạt động.
- Khách hàng: tối đa 2 phiên hoạt động.
- Khi vượt giới hạn, phiên cũ nhất được thu hồi.

## 10. Audit Log và MAC

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/audit-logs` | Admin/Manager | Toàn bộ log |
| GET | `/api/audit-logs/contracts/:id` | Admin/Manager | Log hợp đồng |
| GET | `/api/audit-logs/users/:id` | Admin/Manager | Hoạt động người dùng |
| GET | `/api/security-levels` | Đã đăng nhập | Danh sách nhãn MAC |

Các cấp mặc định theo thứ tự tăng dần:

1. `PUBLIC`
2. `INTERNAL`
3. `CONFIDENTIAL`
4. `RESTRICTED`

Người dùng không được đọc hợp đồng có `rank` cao hơn cấp bảo mật của mình. Admin được bỏ qua kiểm tra MAC. Customer còn phải là chủ sở hữu hợp đồng.

## 11. Backup và Restore

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/backups` | Admin | Danh sách backup |
| POST | `/api/backups` | Admin | Tạo backup |
| GET | `/api/backups/:id` | Admin | Chi tiết backup |
| POST | `/api/backups/:id/restore` | Admin | Phục hồi backup |

Máy chủ phải có `pg_dump` và `pg_restore`. Cấu hình đường dẫn bằng `PG_DUMP_PATH` và `PG_RESTORE_PATH` nếu các lệnh không nằm trong `PATH`.

Restore là thao tác có thể thay đổi toàn bộ dữ liệu. Endpoint chỉ chấp nhận file thuộc thư mục backup của backend và đã có trạng thái `completed` trong `backup_records`.

## 12. Monitoring

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/monitoring/server/status` | Admin/Manager | Tổng quan server |
| GET | `/api/monitoring/server/cpu` | Admin/Manager | CPU usage |
| GET | `/api/monitoring/server/memory` | Admin/Manager | Memory usage |
| GET | `/api/monitoring/server/load` | Admin/Manager | Load average |
| POST | `/api/monitoring/alerts/config` | Admin | Cấu hình ngưỡng cảnh báo |

```json
{
  "cpuThreshold": 85,
  "memoryThreshold": 85,
  "loadThreshold": 5
}
```

## 13. HTTP status code

| Code | Ý nghĩa |
|---|---|
| 200 | Thành công |
| 201 | Tạo dữ liệu thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Thiếu, sai hoặc hết hạn token |
| 403 | Không đủ role hoặc bị MAC từ chối |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột dữ liệu hoặc trạng thái nghiệp vụ |
| 423 | Tài khoản bị khóa |
| 500 | Lỗi server hoặc cấu hình hạ tầng |

## 14. Cài đặt và vận hành

Tạo `.env` từ `.env.example`, sau đó chạy:

```powershell
cd Backend
npm.cmd install
npm.cmd run db:validate
npm.cmd run db:migrate
npm.cmd run db:create-admin
npm.cmd run dev
```

Các lệnh hỗ trợ:

```powershell
npm.cmd run check           # Kiểm tra cú pháp toàn bộ backend
npm.cmd run db:inspect      # Xem metadata schema hiện tại
npm.cmd run db:validate     # Chạy thử schema rồi rollback
npm.cmd run db:migrate      # Áp dụng migration thật
npm.cmd run db:create-admin # Tạo/cập nhật admin từ biến môi trường
npm.cmd run dev             # Chạy bằng nodemon
npm.cmd start               # Chạy bằng Node.js
```

## 15. Biến môi trường quan trọng

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SECRET_KEY_ACCESS_TOKEN`, `SECRET_KEY_REFRESH_TOKEN`
- `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
- `MAX_FAILED_LOGIN_ATTEMPTS`
- `PROFILE_ENCRYPTION_KEY`
- `CLOUD_NAME`, `CLOUD_KEY`, `CLOUD_SECRET`
- `PG_DUMP_PATH`, `PG_RESTORE_PATH`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`

Không commit file `.env` lên Git. Chỉ commit `.env.example` và không đặt secret thật trong tài liệu này.

## 16. Ghi chú tích hợp Frontend

Frontend nên cấu hình:

```env
VITE_API_URL=http://localhost:5000/api
```

Các route API đã có prefix `/api`; không nối thành `/api/api`. Với request cần JWT, gửi header `Authorization: Bearer <access_token>`. Nếu dùng refresh token qua cookie ở môi trường khác origin, frontend phải bật `credentials` và backend cần cấu hình CORS/cookie phù hợp trước khi deploy.


