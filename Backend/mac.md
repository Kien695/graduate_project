# Báo cáo hiện trạng triển khai MAC

Ngày kiểm tra: 09/11/2026.

Phạm vi kiểm tra gồm schema, migration, middleware, route, controller/service,
truy vấn SQL, cơ chế tạo phiên PostgreSQL theo người dùng, script kiểm tra RLS,
Docker và trạng thái RLS đọc trực tiếp từ cơ sở dữ liệu. Báo cáo này phân biệt
giữa thiết kế trong mã nguồn và những gì đã xác nhận đang tồn tại trên database.

## 1. Tóm tắt kết luận

Dự án **có MAC được PostgreSQL thực thi thật trên bảng `contracts`**, không chỉ
lưu nhãn để hiển thị. Bằng chứng ở database đang chạy:

- `contracts.relrowsecurity = true` và `contracts.relforcerowsecurity = true`;
- có bốn policy `contract_mac_select`, `contract_mac_insert`,
  `contract_mac_update`, `contract_mac_delete`;
- policy dùng `session_user`, hàm `mac_subject_rank()` và rank của
  `contracts.security_level_id` để quyết định cho phép truy cập;
- role nghiệp vụ được kiểm tra thực tế (`giamdoc`) là `NOSUPERUSER`, không có
  `BYPASSRLS`, không phải thành viên `contract_security_admin`.

Tuy nhiên, kết luận chính xác là hệ thống hiện triển khai **MAC lai (hybrid)**:

1. Với staff/customer có `users.db_user` và phiên DB riêng, PostgreSQL nhận diện
   được chủ thể bằng LOGIN role và RLS chặn ở cấp database.
2. Backend vẫn lặp lại nhiều phép so sánh rank trong middleware/service.
3. Admin không có `db_user`, hoặc code cố ý dùng `systemDatabase` /
   `withSystemTransaction`, chạy qua system pool. Các đường này không đại diện
   người dùng cuối bằng `session_user`; chúng dựa vào kiểm tra ứng dụng hoặc
   đường quản trị đặc biệt. Vì vậy không thể nói mọi truy cập hợp đồng đều được
   PostgreSQL phân biệt theo đúng người dùng cuối.

Không tìm thấy `SECURITY LABEL`, SELinux/SE-PostgreSQL hay extension MAC chuyên
dụng. Cơ chế MAC của dự án là mô hình tự xây dựng bằng bảng mức, PostgreSQL role,
RLS, policy, hàm `SECURITY DEFINER`, trigger và GRANT/REVOKE.

## 2. Cấu trúc mức MAC của chủ thể và hợp đồng

### 2.1. Mức MAC của chủ thể

- Bảng `security_levels` lưu bốn mức tuyến tính bằng `name` và `rank`:
  `PUBLIC (0)`, `INTERNAL (1)`, `CONFIDENTIAL (2)`, `RESTRICTED (3)`.
- `users.security_level_id` là khóa ngoại chỉ mức của chủ thể.
- Migration `20260909_mac_four_levels.sql` chuẩn hóa bốn mức, gán chủ thể chưa
  có nhãn về `PUBLIC`, đặt cột `users.security_level_id` là `NOT NULL` và default
  là `PUBLIC`.
- Admin ứng dụng có thể cấp mức chủ thể qua:
  - `PATCH /api/users/:id/security-level`, được bảo vệ bởi `authorize("admin")`;
  - `PATCH /api/employees/:id/security-level`, toàn router employee được bảo vệ
    bởi `auth, authorize("admin")`.
- `user.service.setSecurityLevel()` và `employee.service.setSecurityLevel()`
  cập nhật `users.security_level_id` bằng `withSystemTransaction()` và ghi audit.
  Đây là cấp nhãn qua ứng dụng, không phải quyết định của policy PostgreSQL.

Khi truy cập qua role người dùng cuối, `mac_subject_rank()` ánh xạ
`session_user` sang `users.db_user`, rồi đọc `users.security_level_id` và
`security_levels.rank`. Hàm còn yêu cầu user đang active và không bị khóa.

Ngoài DB, backend cũng lấy user hiện hành từ session/JWT qua
`sessionActivity.touch()`; middleware và service dùng `req.user.id` để đọc lại
rank từ database. JWT có chứa `securityLevelId`, nhưng các kiểm tra hợp đồng đang
đọc nhãn hiện hành từ DB thay vì tin trực tiếp giá trị trong token.

### 2.2. PostgreSQL có xác định được chủ thể thật không?

Có, nhưng chỉ với tài khoản đã có `users.db_user` và request chạy qua pool riêng:

- khi tạo staff/customer, code tạo PostgreSQL LOGIN role với
  `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`;
- `databaseSession.service.createVerifiedPool()` đăng nhập PostgreSQL bằng
  `db_user` và mật khẩu người dùng, rồi xác minh `current_user === dbUser`;
- `auth.middleware` dùng `runWithDatabase()` để chuyển các truy vấn nghiệp vụ
  sang pool của phiên đó;
- policy sử dụng `session_user`, không sử dụng user id do client truyền.

Không phải mọi tài khoản đều đi theo cơ chế này. `auth.middleware` chỉ chuyển
sang subject pool khi user có `db_user` (customer còn phụ thuộc nhóm route).
Tài khoản admin không có `db_user` sẽ dùng system pool. Những đường gọi trực tiếp
`systemDatabase` hoặc `withSystemTransaction` cũng không mang danh tính DB của
người dùng cuối.

### 2.3. Nhãn MAC của hợp đồng

- Nhãn đối tượng nằm ở `contracts.security_level_id`, khóa ngoại tới
  `security_levels`.
- Migration `20260909_mac_four_levels.sql` gán hợp đồng cũ chưa có nhãn thành
  `RESTRICTED` và đặt cột `NOT NULL`.
- Migration `20261109_contract_mac_assignment.sql` định nghĩa default bằng
  `contract_default_security_level_id()`, trả về mức `INTERNAL`.
- `contract.service.create()` không truyền `security_level_id` trong `INSERT`,
  để PostgreSQL áp dụng default.
- `rejectContractCreateClassification` từ chối request tạo có
  `securityLevelId` hoặc `security_level_id`.
- Frontend `ContractManager.jsx` không còn select nhãn khi tạo; chỉ thông báo
  nhãn được tự động gán `INTERNAL`.

Người dùng thông thường không thể đổi nhãn qua API cập nhật hợp đồng:
`contract.service.update()` chỉ cập nhật `terms` và `contract_number`. Endpoint
riêng `PATCH /api/contracts/:id/security-level` yêu cầu
`requireMacSecurityAdmin`, kiểm tra truy cập hiện tại, kiểm tra classification
yêu cầu và bắt buộc lý do.

Quyền quản trị MAC ở ứng dụng được xác định bởi
`users.can_manage_contract_mac` hoặc membership DB role
`contract_security_admin`; không tự suy ra từ chức danh giám đốc. Frontend chỉ
hiện form đổi nhãn khi capability `canManageMac` là true.

## 3. Luồng kiểm tra MAC hiện tại

### 3.1. Xem danh sách và chi tiết

- `contract.service.list()` có điều kiện ứng dụng
  `object rank <= subject rank`; nhân viên còn bị giới hạn `created_by`.
- `enforceContractAccess()` so sánh `users/security_levels.rank >=
  contracts/security_levels.rank` trước các endpoint theo id.
- `contract.service.get()` truy vấn `contracts`; nếu chạy bằng subject pool thì
  RLS tiếp tục lọc hàng. Nhân viên còn phải là người tạo.
- `customerContract.service.list/get()` tự join subject/object level và yêu cầu
  `subject_level.rank >= object_level.rank`, ownership và trạng thái được công bố.
- RLS `contract_mac_select` đồng thời áp dụng quy tắc “không đọc lên” và ownership
  đối với customer khi truy vấn thực sự chạy bằng subject role.

### 3.2. Tạo hợp đồng

- Route yêu cầu nhóm nghiệp vụ `EMPLOYEE`.
- Middleware từ chối nhãn do client gửi.
- Service bỏ cột nhãn khỏi `INSERT`; database default là `INTERNAL` theo migration.
- RLS `contract_mac_insert` có `WITH CHECK`: chủ thể phải thỏa ownership và
  `subject rank <= object rank` (“không ghi xuống”).
- Migration thu hồi table-level INSERT rồi chỉ cấp danh sách cột không chứa
  `security_level_id` cho role nghiệp vụ đã có quyền INSERT.

Lưu ý: phần “default INTERNAL” và trigger lịch sử có bằng chứng trong migration;
script kiểm tra runtime hiện có chỉ xác nhận RLS/policy, chưa truy vấn trực tiếp
default/trigger trong database. Do đó báo cáo không khẳng định riêng hai object
này đã được triển khai thành công trên mọi môi trường.

### 3.3. Sửa nội dung, duyệt, trả lại, từ chối, ký và thanh toán

Các route `PUT`, `submit`, `approve`, `return`, `reject`, `sign`, `payment` đều
đặt `enforceContractAccess` trước controller, nên backend kiểm tra khả năng đọc
theo MAC. Sau đó service thực hiện RBAC/workflow riêng.

Khi chạy bằng subject pool, các câu `UPDATE contracts` còn chịu policy
`contract_mac_update`, với cả `USING` và `WITH CHECK` theo quy tắc không ghi xuống.
Việc duyệt/ký không thay nhãn MAC; MAC là lớp bổ sung cho RBAC/workflow.

`customerContract.service.confirm()` là ngoại lệ đáng chú ý: hàm tự so sánh rank
trong SQL nhưng chạy bằng `withSystemTransaction()`. Tại đây danh tính PostgreSQL
là system account, không phải customer; bảo vệ theo người dùng nằm trong điều
kiện SQL của ứng dụng.

### 3.4. Xóa

Migration có `contract_mac_delete` áp dụng ownership và quy tắc không ghi xuống.
Không tìm thấy endpoint DELETE hợp đồng trong `contract.router.js` hiện tại.
Nếu code khác thực hiện DELETE bằng subject role thì policy sẽ áp dụng; DELETE
bằng system/admin path cần được đánh giá riêng theo quyền của system account.

### 3.5. Đổi nhãn hợp đồng

- `loadMacSecurityAdmin()` đọc cờ `users.can_manage_contract_mac` hoặc kiểm tra
  membership `contract_security_admin` bằng system pool.
- `requireMacSecurityAdmin()` bảo vệ endpoint riêng.
- `enforceRequestedClassification()` hiện còn yêu cầu rank của người đổi không
  thấp hơn rank đích.
- `contract.service.setSecurityLevel()` chạy `withSystemTransaction()`, đặt
  transaction-local settings `app.mac_actor_id` và `app.mac_change_reason`, cập
  nhật nhãn và ghi `audit_logs`.
- Migration định nghĩa trigger `contracts_security_level_audit` và hàm
  `audit_contract_security_level_change()`: chỉ cho session là member
  `contract_security_admin`, bắt actor/lý do và ghi
  `contract_security_level_history`.

## 4. MAC đang được kiểm tra ở ứng dụng hay PostgreSQL?

### 4.1. Kiểm tra ở ứng dụng

Có. Các phép so sánh rõ ràng gồm:

- `mac.middleware.enforceContractAccess()`;
- `mac.middleware.enforceRequestedClassification()`;
- `contract.service.list()`;
- `customerContract.service.list()`, `get()`, `confirm()`;
- `auditLog.service.list()` khi lọc audit log của hợp đồng;
- frontend chỉ ẩn/hiện thao tác theo capability, nhưng frontend không phải ranh
  giới bảo mật vì API/backend vẫn kiểm tra lại.

### 4.2. Thực thi ở PostgreSQL

Có bằng chứng chắc chắn. Migration tạo `ENABLE ROW LEVEL SECURITY`, `FORCE ROW
LEVEL SECURITY`, hàm xác định rank theo `session_user` và bốn policy cho
SELECT/INSERT/UPDATE/DELETE. Kiểm tra database chỉ đọc xác nhận các cờ và policy
này đang tồn tại, với đúng biểu thức so sánh rank.

Tuy nhiên PostgreSQL chỉ phân biệt đúng người dùng cuối khi truy vấn chạy bằng
LOGIN role tương ứng `users.db_user`. System/admin connection hoặc role có
membership `contract_security_admin` đi qua nhánh OR cho phép trong mọi policy.
Do đó RLS có thực thi thật, nhưng không bao phủ theo danh tính người dùng cuối ở
mọi đường code.

## 5. Bằng chứng trong mã nguồn và cấu hình

| Bằng chứng | Vị trí / tên |
|---|---|
| Bốn mức và cột nhãn | `database/schema.sql`; migration `20260909_mac_four_levels.sql` |
| Default hợp đồng INTERNAL | migration `20261109_contract_mac_assignment.sql`, hàm `contract_default_security_level_id()` |
| RLS bắt buộc | migration `20261106_contract_mac_rls.sql` |
| Rank chủ thể theo DB identity | `mac_subject_rank()` dùng `session_user` |
| Ownership customer | `mac_contract_owned_by_subject()` |
| Policy MAC | `contract_mac_select/insert/update/delete` |
| Trigger đổi nhãn | `audit_contract_security_level_change()`, trigger `contracts_security_level_audit` |
| Subject DB pool | `service/databaseSession.service.js`, `createVerifiedPool()` |
| Chuyển pool theo request | `middleware/auth.middleware.js`, `runWithDatabase()` |
| So sánh MAC backend | `middleware/mac.middleware.js`, `enforceContractAccess()` và `enforceRequestedClassification()` |
| Danh sách/chi tiết hợp đồng | `service/contract.service.js`, `list()` và `get()` |
| Customer contract | `service/customerContract.service.js`, `publishedContract`, `list/get/confirm` |
| Đổi nhãn | `service/contract.service.js`, `setSecurityLevel()` |
| Route và thứ tự middleware | `routes/contract.router.js` |
| Cấp mức chủ thể | `routes/user.router.js`, `routes/employee.router.js`, `user.service.setSecurityLevel()`, `employee.service.setSecurityLevel()` |
| GRANT/REVOKE nghiệp vụ | migration `20261106_contract_mac_rls.sql`, `service/databasePermission.service.js` |
| Tạo LOGIN role an toàn | `service/auth.service.js`, `service/employee.service.js` |
| Kiểm tra runtime RLS | `scripts/inspectContractRls.js`, `scripts/testContractRls.js` |
| Kết nối hệ thống | `database/database.js` |
| Docker PostgreSQL | `Dockerfile`, `docker-compose.yml` |

Trạng thái runtime đã xác nhận bằng `scripts/inspectContractRls.js`:

- bảng `contracts` có RLS và FORCE RLS;
- owner bảng là `postgres`;
- bốn policy MAC đang có mặt;
- role `giamdoc` không phải superuser, không có `BYPASSRLS`, `NOINHERIT`, không
  có membership `contract_security_admin`;
- user tương ứng đang có clearance `PUBLIC`.

`docker-compose.yml` dùng image chuẩn `postgres:16`; database khởi tạo bằng
`POSTGRES_USER=postgres`. App đọc system connection từ `.env`/`DATABASE_URL`.
Không tìm thấy cấu hình Docker về extension MAC hoặc `SECURITY LABEL`.

## 6. Các điểm còn thiếu hoặc rủi ro

1. **System pool là đường đặc quyền.** `database.js` mô tả shared pool là
   system/owner connection; migration cấp `contract_security_admin` cho
   `current_user`. Policy lại cho member role này qua trực tiếp. Các hàm dùng
   `systemDatabase`/`withSystemTransaction` vì vậy không được RLS phân biệt theo
   user cuối và phải hoàn toàn tin vào kiểm tra ứng dụng.
2. **Admin không có `db_user` dùng system pool.** `auth.middleware` chỉ dùng
   subject pool khi có `db_user`. Với admin, `contract.service.list()` và
   `enforceContractAccess()` có so sánh rank trong ứng dụng, nhưng PostgreSQL
   không nhận diện admin đó bằng `session_user`.
3. **Customer confirm chạy system transaction.** Hàm có điều kiện ownership/rank
   trong SQL, nhưng đây là application-enforced MAC, không phải RLS theo customer
   session cho thao tác cập nhật đó.
4. **Quyền quản trị MAC có hai nguồn.** `can_manage_contract_mac` là quyền ứng
   dụng; `contract_security_admin` là role PostgreSQL. Cờ ứng dụng không tự biến
   account thành DB role. Việc cập nhật vẫn chạy qua system role đặc quyền.
5. **Policy cho security admin bypass toàn bộ thao tác.** Nhánh
   `pg_has_role(..., 'contract_security_admin', 'MEMBER')` nằm trong cả SELECT,
   INSERT, UPDATE, DELETE, không chỉ UPDATE cột nhãn. Nếu một LOGIN role nghiệp
   vụ được cấp membership này, phạm vi vượt MAC rộng hơn “chỉ đổi nhãn”.
6. **Chưa xác nhận runtime của default/trigger mới.** Source có migration đầy
   đủ nhưng script inspect hiện chỉ kiểm tra RLS/policy. Cần kiểm tra chỉ đọc
   `information_schema.columns`, `pg_trigger` và bảng history trên từng môi
   trường trước khi khẳng định deployment đồng nhất.
7. **Migration có thể bị drift.** `database/migrate.js` chạy tuần tự các file
   SQL nhưng không có bảng version/checksum migration. Nếu một migration trước
   lỗi, các migration MAC phía sau có thể chưa được áp dụng dù file đã có trong
   repository.
8. **Test RLS cần mật khẩu fixture.** `testContractRls.js` kiểm tra đúng bằng
   LOGIN role thật, nhưng yêu cầu `RLS_TEST_DB_PASSWORD`; nếu không cấu hình thì
   test không chạy đến bước xác nhận row bị ẩn.
9. **RLS chỉ ở `contracts` không tự bảo vệ mọi bảng liên quan.** Dữ liệu ở
   payments, workflow history hoặc audit log phụ thuộc quyền bảng, join và kiểm
   tra ứng dụng. Cần tránh endpoint truy vấn trực tiếp các bảng này mà không đi
   qua kiểm tra hợp đồng.
10. **Không tìm thấy cơ chế MAC chuẩn của PostgreSQL.** Không có `SECURITY LABEL`
    hoặc extension MAC trong source; đây là MAC tự xây dựng, chất lượng phụ thuộc
    đúng đắn của role mapping, RLS policy và việc không dùng system pool ngoài
    các đường đặc quyền đã kiểm soát.

## 7. Kết luận cuối

Hiện tại MAC **đã được PostgreSQL thực thi thật đối với bảng `contracts` khi
request chạy bằng PostgreSQL LOGIN role của chủ thể**. Đây không phải chỉ là dữ
liệu trong `security_levels` hay kiểm tra giao diện/backend: database đang bật
`FORCE RLS` và có policy so sánh clearance/classification theo `session_user`.

Tuy vậy, MAC chưa được PostgreSQL áp dụng theo danh tính người dùng cuối một cách
đồng nhất cho mọi luồng. Admin không có `db_user` và các đường system transaction
chạy bằng tài khoản đặc quyền; tại đó bảo vệ phụ thuộc vào điều kiện SQL và
middleware/service của ứng dụng. Vì vậy mô tả đúng nhất là: **PostgreSQL-enforced
MAC cho subject sessions, kết hợp application-enforced MAC cho các đường
system/admin đặc quyền**.
