# Đo tải bằng k6

Chạy trên **môi trường thử** (Backend và database dùng để thử), không chạy trên dữ liệu thật.

## 1. Chuẩn bị
1. Cài k6: https://k6.io/docs/get-started/installation/
2. Backend đang chạy và nối được database. Tài khoản kết nối database phải có quyền `CREATEROLE`.
3. Nếu dùng PostgreSQL local, kiểm tra `max_connections` (mặc định 100). Mỗi phiên khách giữ tối đa
   `DB_SESSION_POOL_SIZE` (mặc định 3) kết nối; có thể đặt `DB_SESSION_POOL_SIZE=1` khi đo.
4. Tạo tài khoản thử: `COUNT=100 node load-tests/seedUsers.js`

## 2. Đo
- Một mức tải: `TARGET_VUS=50 k6 run load-tests/load-test.js`
- Nhiều mức (10, 25, 50, 100 VU): `bash load-tests/run-all.sh` (kết quả ở `results/tong-hop.csv`)
- Đo đăng nhập dồn dập: `SCENARIO=login TARGET_VUS=50 k6 run load-tests/load-test.js`
- Đo tranh đặt xe: `SCENARIO=order VEHICLE_ID=<id xe còn hàng> TARGET_VUS=20 k6 run load-tests/load-test.js`
  (409 là kết quả đúng khi nhiều người tranh một xe)

Đặt `BASE_URL` nếu Backend không ở `http://localhost:5000/api`. `TARGET_VUS` không được lớn hơn số tài khoản đã tạo.

## 3. Cách đọc kết quả
- `p95_ms` > 2000 hoặc `error_rate` > 5%: hệ thống đã quá ngưỡng.
- `status_5xx` và `login_failures` tăng đột ngột: lỗi hết kết nối database hoặc chạm giới hạn
  `DB_SESSION_MAX_POOLS` (mặc định 100 phiên đồng thời).
- Mở trang Giám sát của quản trị trong lúc đo để thấy CPU, RAM, độ trễ và cảnh báo.
- **Ngưỡng chịu tải** = mức VU lớn nhất mà p95 còn dưới 2 giây và tỷ lệ lỗi dưới 5%.

## 4. Dọn dẹp
`node load-tests/cleanupUsers.js` xóa tài khoản `tai*`, các đơn thử và role PostgreSQL tương ứng.
