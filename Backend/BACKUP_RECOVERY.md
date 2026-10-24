# Sao lưu và phục hồi bằng Neon Snapshot

Trang `/admin/backups` chỉ dành cho admin. Nút **Sao lưu ngay** gọi Neon API từ
Backend để tạo snapshot của branch được cấu hình. API key không bao giờ được gửi
cho trình duyệt. Snapshot được đặt thời điểm hết hạn theo `retention_days`.

## Cấu hình phía Backend

```env
NEON_API_KEY=your_project_scoped_api_key
NEON_PROJECT_ID=your-project-id
NEON_BRANCH_ID=br-your-current-branch-id
NEON_BRANCH_NAME=main
NEON_API_TIMEOUT_MS=30000
NEON_OPERATION_TIMEOUT_MS=120000
NEON_MAX_APP_SNAPSHOTS=9
```

`NEON_BRANCH_NAME` được khuyến nghị. Backend tra ID hiện tại theo tên trước mỗi
thao tác vì ID phía sau branch có thể thay đổi sau restore. `NEON_BRANCH_ID` là
giá trị dự phòng khi không khai báo tên.

Nên dùng project-scoped API key có quyền trên đúng project. Không ghi key vào
frontend, source control hoặc log. Snapshot cần gói Neon hỗ trợ tính năng này.
Ứng dụng giữ tối đa `NEON_MAX_APP_SNAPSHOTS` snapshot có tiền tố `autodealer-`.
Khi chạm giới hạn, snapshot cũ nhất do ứng dụng tạo sẽ bị xóa trước; snapshot tạo
thủ công trong Neon Console không bị ứng dụng tự xóa.

## Phục hồi

Danh sách được đọc trực tiếp từ Neon, không đọc file `.dump`. Khi admin chọn một
snapshot, giao diện hiển thị tên/ID branch đích và yêu cầu nhập `PHUC HOI`.
Backend chỉ cho phép ghi đè root branch, gọi restore với `finalize_restore=true`
và chờ các operation của Neon hoàn tất. Backend không gửi lại tên branch đích làm
tên branch trung gian; Neon tự sinh tên duy nhất để tránh xung đột. Người dùng bị
đăng xuất sau thành công.

Restore thay cả dữ liệu lẫn schema và làm mất các thay đổi sau thời điểm snapshot.
Nó không phục hồi ảnh Cloudinary, biến môi trường hay secret. Nếu database đang
không hoạt động khiến admin không thể đăng nhập, thực hiện restore trong Neon
Console. Không gửi lại yêu cầu tạo/restore khi gặp timeout: POST có thể đã tới
Neon; trước tiên hãy tải lại danh sách hoặc kiểm tra Neon Console.

Lịch tự động vẫn do tiến trình Backend chạy. Backend phải hoạt động đúng giờ; nếu
không có snapshot do ứng dụng tạo trong 24 giờ, cơ chế catch-up sẽ tạo một bản.
