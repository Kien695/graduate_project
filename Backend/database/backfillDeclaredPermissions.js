// Khi thêm bảng employee_feature_permissions (quyền "đã khai báo", tách khỏi
// quyền hiệu lực thật trên Postgres), các nhân viên đã cấu hình từ trước chưa
// có dòng nào trong bảng mới -> menu điều hướng của họ sẽ trống cho tới khi
// admin lưu lại quyền. Script này chạy MỘT LẦN để khởi tạo dữ liệu "đã khai
// báo" ban đầu, giữ nguyên trải nghiệm hiện tại:
//   - Nhân viên đang thuộc 1 nhóm quyền -> lấy đúng theo quyền của nhóm đó.
//   - Nhân viên không thuộc nhóm -> suy ra từ quyền hiệu lực hiện tại trên
//     CHÍNH bảng của từng feature (cách tính cũ trước khi có bảng này).
require("dotenv").config({ quiet: true });
const { systemDatabase: database } = require("./database");
const { FEATURES } = require("../service/databasePermission.service");

const backfill = async () => {
  const { rows: employees } = await database.query(
    `SELECT e.id,u.db_user,e.permission_group_id FROM employees e
     JOIN users u ON u.id=e.user_id WHERE u.db_user IS NOT NULL`,
  );
  let updated = 0;
  for (const employee of employees) {
    let declared = [];
    if (employee.permission_group_id) {
      const { rows } = await database.query(
        "SELECT feature_key,privilege FROM permission_group_features WHERE group_id=$1",
        [employee.permission_group_id],
      );
      declared = rows;
    } else {
      const checks = Object.entries(FEATURES).flatMap(([key, feature]) =>
        feature.operations.map((privilege) => ({ feature_key: key, privilege, tables: feature.tables })),
      );
      for (const check of checks) {
        const { rows } = await database.query(
          `SELECT bool_and(has_table_privilege($1::text, format('%I.%I','public'::text,t)::text, $2::text)) AS ok
           FROM unnest($3::text[]) AS t`,
          [employee.db_user, check.privilege, check.tables],
        );
        if (rows[0]?.ok) declared.push({ feature_key: check.feature_key, privilege: check.privilege });
      }
    }
    await database.query("DELETE FROM employee_feature_permissions WHERE employee_id=$1", [employee.id]);
    if (declared.length)
      await database.query(
        `INSERT INTO employee_feature_permissions(employee_id,feature_key,privilege)
         SELECT $1,feature_key,privilege FROM jsonb_to_recordset($2::jsonb)
           AS x(feature_key text,privilege text)`,
        [employee.id, JSON.stringify(declared)],
      );
    updated += 1;
  }
  console.log(`Đã khởi tạo quyền đã khai báo cho ${updated} nhân viên.`);
};
backfill()
  .catch((error) => {
    console.error("Backfill thất bại:", error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
