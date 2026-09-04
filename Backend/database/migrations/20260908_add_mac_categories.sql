-- =============================================================================
-- 20260908_add_mac_categories.sql
--
-- Bổ sung NGĂN (category / compartment) cho mô hình MAC.
-- Trước migration này, security_levels chỉ có MỨC tuyến tính (rank 0-3),
-- nên hai người dùng cùng mức vẫn thấy dữ liệu của nhau bất kể phòng ban.
-- Sau migration này, quan hệ chi phối (dominance) trở thành:
--
--     level(chủ thể) >= level(đối tượng)  AND  cats(chủ thể) ⊇ cats(đối tượng)
--
-- QUYẾT ĐỊNH THIẾT KẾ: ngăn được ánh xạ theo PHÒNG BAN CHỨC NĂNG
-- (employees.department đã có sẵn trong schema), không phải theo chi nhánh.
-- Nếu hệ thống thực sự vận hành nhiều chi nhánh, dùng thêm nhóm BR_*;
-- nếu chỉ một cơ sở, bỏ qua nhóm BR_* và chỉ dùng nhóm chức năng bên dưới.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Từ điển ngăn
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mac_categories (
    id       SMALLINT PRIMARY KEY,
    code     VARCHAR(30) NOT NULL UNIQUE,
    name     VARCHAR(100) NOT NULL,
    kind     VARCHAR(20) NOT NULL CHECK (kind IN ('BRANCH', 'FUNCTION')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nhóm phòng ban chức năng — dùng ngay, ánh xạ từ employees.department
INSERT INTO mac_categories (id, code, name, kind) VALUES
    (10, 'SALES',   'Kinh doanh - Bán hàng',      'FUNCTION'),
    (11, 'FIN',      'Tài chính - Kế toán',        'FUNCTION'),
    (12, 'LEGAL',    'Pháp chế',                   'FUNCTION'),
    (13, 'INSPECT',  'Kiểm định kỹ thuật',         'FUNCTION'),
    (14, 'IT',       'Công nghệ thông tin',        'FUNCTION')
ON CONFLICT (id) DO NOTHING;

-- Nhóm chi nhánh — chỉ dùng nếu hệ thống thật sự đa chi nhánh.
-- Nếu không, để trống hoặc gán tất cả nhân viên vào BR_MAIN cho đủ điều kiện
-- "categories không rỗng" mà không cần phân biệt vị trí địa lý.
INSERT INTO mac_categories (id, code, name, kind) VALUES
    (1, 'BR_MAIN', 'Trụ sở chính', 'BRANCH'),
    (2, 'BR_HCM',  'Chi nhánh Hồ Chí Minh', 'BRANCH'),
    (3, 'BR_HN',   'Chi nhánh Hà Nội', 'BRANCH'),
    (4, 'BR_DN',   'Chi nhánh Đà Nẵng', 'BRANCH')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Hàm kiểm tra một mảng category có hợp lệ (tồn tại trong từ điển) không
--
-- Lưu ý kỹ thuật: CHECK constraint gọi hàm truy vấn bảng khác là hợp lệ trong
-- PostgreSQL (không bắt buộc IMMUTABLE), nhưng không có gì đảm bảo tuyệt đối
-- nếu một category bị xóa ngay sau khi constraint đã pass. Với category hiếm
-- khi bị xóa, đây là đánh đổi chấp nhận được và nên nêu rõ trong báo cáo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mac_categories_are_valid(p_cats SMALLINT[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT p_cats IS NOT NULL
       AND NOT EXISTS (
             SELECT 1 FROM unnest(p_cats) AS c(id)
             WHERE c.id NOT IN (SELECT id FROM mac_categories)
           );
$$;

-- Quan hệ chi phối theo chiều ngăn: chủ thể phải bao hàm toàn bộ ngăn của đối tượng
CREATE OR REPLACE FUNCTION mac_categories_dominate(p_subject_cats SMALLINT[], p_object_cats SMALLINT[])
RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
    SELECT COALESCE(p_subject_cats, '{}') @> COALESCE(p_object_cats, '{}');
$$;

-- -----------------------------------------------------------------------------
-- 3. Thêm cột categories vào users (chủ thể)
--
-- Mặc định rỗng '{}'. Với khách hàng, để rỗng là hợp lý (họ không thuộc
-- phòng ban nào). Với nhân viên, categories rỗng nghĩa là KHÔNG CHI PHỐI được
-- bất kỳ đối tượng nào có ngăn — cần backfill trước khi đưa vào production.
-- -----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS categories SMALLINT[] NOT NULL DEFAULT '{}';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_categories_valid;
ALTER TABLE users ADD CONSTRAINT users_categories_valid
    CHECK (mac_categories_are_valid(categories));

CREATE INDEX IF NOT EXISTS users_categories_gin_idx ON users USING gin (categories);

-- -----------------------------------------------------------------------------
-- 4. Thêm cột categories vào contracts (đối tượng)
--
-- Khác với users, mọi hợp đồng BẮT BUỘC có ít nhất một ngăn — một hợp đồng
-- không thuộc phòng ban nào là dữ liệu vô nghĩa về mặt nghiệp vụ. Nhưng dữ liệu
-- cũ đang có categories rỗng (giá trị mặc định), nên ràng buộc "not empty" phải
-- thêm dạng NOT VALID trước, backfill xong mới VALIDATE — theo đúng mẫu migration
-- 20260827_require_inspection_relations.sql đã dùng trong dự án.
-- -----------------------------------------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS categories SMALLINT[] NOT NULL DEFAULT '{}';

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_categories_valid;
ALTER TABLE contracts ADD CONSTRAINT contracts_categories_valid
    CHECK (mac_categories_are_valid(categories));

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_categories_not_empty;
ALTER TABLE contracts ADD CONSTRAINT contracts_categories_not_empty
    CHECK (cardinality(categories) > 0) NOT VALID;

CREATE INDEX IF NOT EXISTS contracts_categories_gin_idx ON contracts USING gin (categories);

COMMIT;

-- =============================================================================
-- BƯỚC TIẾP THEO (không chạy tự động, làm thủ công theo thứ tự):
--
-- 1. node database/backfillMacCategories.js --inspect
--      Xem department thực tế đang có trong bảng employees.
--
-- 2. Sửa DEPARTMENT_TO_CATEGORIES trong database/backfillMacCategories.js
--    cho khớp với các department đã thấy ở bước 1.
--
-- 3. node database/backfillMacCategories.js --apply
--      Gán categories cho users (theo employees.department) và cho contracts
--      (theo orders.created_by).
--
-- 4. Chạy lại, kiểm tra không còn nhân viên/hợp đồng nào categories rỗng:
--      SELECT e.department, count(*) FROM employees e
--      JOIN users u ON u.id=e.user_id WHERE u.categories='{}' GROUP BY 1;
--
-- 5. Validate ràng buộc đã hoãn:
--      ALTER TABLE contracts VALIDATE CONSTRAINT contracts_categories_not_empty;
-- =============================================================================        