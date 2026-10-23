# Hướng dẫn chạy dự án (Auto Dealer Management System)

Dự án gồm 4 phần: `Backend` (API, đã deploy sẵn trên Render — **không cần tự chạy**), `Frontend` (web quản trị cho admin/nhân viên), `WebClient` (web cho khách hàng), `Mobile` (app React Native/Expo cho khách hàng).

## 1. Điều kiện cần trước khi bắt đầu

- Đã `git clone`/`git pull` code mới nhất từ nhánh `main`.
- Đã cài Node.js (bản LTS mới nhất) và npm.
- Xin **file `.env`** của từng app (`Backend/.env`, `Frontend/.env`, `WebClient/.env`, `Mobile/.env`) từ người quản lý dự án qua kênh riêng tư (Zalo/Telegram cá nhân...). **Tuyệt đối không commit các file này lên Git** — chúng chứa secret thật (JWT key, mật khẩu database, Cloudinary key...) và đã bị gitignore sẵn.

Danh sách biến môi trường mỗi file cần có (chỉ liệt kê tên, giá trị thật xin riêng):

**`Backend/.env`**
```
PORT, NODE_ENV
SECRET_KEY_ACCESS_TOKEN, SECRET_KEY_REFRESH_TOKEN, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN
MAX_FAILED_LOGIN_ATTEMPTS, PROFILE_ENCRYPTION_KEY
CLOUD_NAME, CLOUD_KEY, CLOUD_SECRET
DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_SSL
PG_DUMP_PATH, PG_RESTORE_PATH
ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME
FRONTEND_URL, WEB_CLIENT_URL, MOBILE_URL
```

**`Frontend/.env`**
```
VITE_API_URL=https://graduate-project-cvlt.onrender.com/api
```

**`WebClient/.env`**
```
VITE_API_URL=https://graduate-project-cvlt.onrender.com/api
```

**`Mobile/.env`**
```
EXPO_PUBLIC_API_URL=https://graduate-project-cvlt.onrender.com/api
```

## 2. Chạy từng app

Backend đã chạy sẵn trên Render (`https://graduate-project-cvlt.onrender.com`), **không cần tự chạy Backend local** trừ khi bạn đang sửa code Backend.

**Frontend (web quản trị — admin/nhân viên):**
```
cd Frontend
npm install
npm run dev
```
Mở `http://localhost:5173`.

**WebClient (web khách hàng):**
```
cd WebClient
npm install
npm run dev
```
Mở `http://localhost:5174` (hoặc cổng hiện ra trong terminal).

**Mobile:**
```
cd Mobile
npm install
npx expo start --tunnel
```
Dùng `--tunnel` nếu điện thoại test không cùng mạng WiFi với máy chạy lệnh; dùng `npx expo start` (không `--tunnel`) nếu cùng mạng, tốc độ nhanh hơn.
Quét mã QR hiện ra bằng app Expo Go trên điện thoại.

Lưu ý: lần gọi API đầu tiên có thể chậm ~30-50 giây do Render (gói Free) "ngủ" khi không có ai dùng — đợi là được, không phải lỗi.

## 3. Tài khoản test

Xin tài khoản admin và nhân viên mẫu từ người quản lý dự án (không ghi sẵn trong file này vì là thông tin nhạy cảm).

## 4. Quy trình Git của team

- Không push thẳng lên `main`.
- Luôn tạo nhánh mới từ `main`: `git switch main && git pull && git switch -c fix/ten-nhanh`
- Code xong → `git add` từng file cụ thể (không dùng `git add -A`/`.` tràn lan) → commit → push → tạo Pull Request trên GitHub → chờ review/merge.
- Nếu sửa code trong `Backend/`, sau khi merge vào `main`, Render sẽ **tự động build và deploy lại** (không cần thao tác thủ công). Theo dõi tab **Deploys** trên Render dashboard để chắc chắn deploy thành công.
- Nếu đổi schema database (`Backend/database/schema.sql`), nhớ chạy `npm run db:migrate` từ máy local để áp dụng lên Neon — Render không tự chạy migration.
- Nếu thêm biến môi trường mới cho Backend, nhớ vào Render dashboard → **Environment** → thêm biến đó thủ công (Render không tự đọc `.env` trong repo).
