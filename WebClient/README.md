# Auto Car WebClient

Ứng dụng web React dành riêng cho khách hàng, tương ứng với các luồng trong ứng dụng `Mobile`.

## Công nghệ

- React + Vite (JavaScript/JSX)
- React Router DOM
- Tailwind CSS
- Redux Toolkit + React Redux
- Axios và React Toastify

## Cài đặt và chạy

Yêu cầu Node.js tương thích Vite 8 và backend đang chạy ở cổng `5000`.

```bash
cd WebClient
npm install
copy .env.example .env
npm run dev
```

Mặc định web chạy tại `http://localhost:5174`. Vite proxy `/api` tới `http://localhost:5000`, nên cấu hình mặc định hoạt động trong môi trường phát triển.

Nếu frontend và API được triển khai ở hai origin khác nhau, đặt:

```env
VITE_API_URL=https://api.example.com/api
```

Đồng thời đặt `WEB_CLIENT_URL` trong môi trường backend bằng origin chính xác của web (ví dụ `https://shop.example.com`). Backend cần HTTPS và thiết lập cookie phù hợp khi chạy cross-site (`COOKIE_SAME_SITE=none`). Không đặt khóa bí mật hoặc mật khẩu trong `.env` của WebClient.

## Lệnh kiểm tra

```bash
npm run lint
npm run build
npm run preview
```

## Chức năng

- Đăng ký, đăng nhập/đăng xuất, khôi phục phiên và tự refresh access token bằng HttpOnly refresh cookie.
- Xem/tìm kiếm xe và phụ kiện, xem chi tiết và đặt hàng.
- Theo dõi chung đơn xe và đơn phụ kiện; xem kiểm định xe; hủy đơn phụ kiện khi còn `PENDING`.
- Xem và xác nhận hợp đồng ở trạng thái `APPROVED`.
- Xem/đánh dấu đã đọc thông báo và mở nội dung liên quan.
- Cập nhật hồ sơ, tải ảnh đại diện từ trình duyệt và đổi mật khẩu.
- Giao diện responsive, dark mode, trạng thái loading/empty/error và thông báo thao tác.

## Cấu trúc chính

```text
src/
  api/          API client và service theo nhóm nghiệp vụ
  components/   Component dùng chung và protected route
  Layout/       Layout khách hàng responsive
  page/         Trang auth và trang khách hàng
  redux/        Store và slices dùng chung
  router/       Khai báo route
  utils/        Định dạng dữ liệu và quản lý phiên local
```

API không cung cấp endpoint hủy đơn xe, yêu thích, quên mật khẩu hoặc thanh toán trực tuyến nên WebClient không tạo thao tác giả cho các chức năng này.
