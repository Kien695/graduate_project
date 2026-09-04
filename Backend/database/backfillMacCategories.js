// database/backfillMacCategories.js
//
// Gán categories (ngăn) cho dữ liệu hiện có sau khi chạy migration
// 20260908_add_mac_categories.sql. Theo mẫu database/migrateEncryptedProfiles.js
// đã có trong dự án.
//
// CÁCH DÙNG:
//   node database/backfillMacCategories.js --inspect
//       Liệt kê các employees.department thực tế đang có, kèm số lượng.
//       Dùng để biết cần sửa DEPARTMENT_TO_CATEGORIES bên dưới thế nào.
//
//   node database/backfillMacCategories.js --apply
//       Áp dụng mapping đã sửa: gán users.categories theo employees.department,
//       rồi gán contracts.categories theo categories của người tạo đơn hàng
//       (orders.created_by).
//
// PHẢI sửa DEPARTMENT_TO_CATEGORIES trước khi chạy --apply lần đầu.
const { loadEnv } = require("../config/env");
loadEnv();

const { database } = require("./database");

// -----------------------------------------------------------------------------
// SỬA PHẦN NÀY cho khớp với department thực tế trong bảng employees.
// Key: giá trị department đang lưu trong DB (chạy --inspect để xem chính xác).
// Value: mảng CODE trong bảng mac_categories (xem migration để biết danh sách).
//
// Một nhân viên có thể thuộc nhiều ngăn cùng lúc, ví dụ trưởng phòng vừa quản
// lý bán hàng vừa duyệt hồ sơ pháp lý: ["SALES", "LEGAL"].
// -----------------------------------------------------------------------------
const DEPARTMENT_TO_CATEGORIES = {
  Sales: ["SALES"],
  "Kinh doanh": ["SALES"],
  "Bán hàng": ["SALES"],
  "Kế toán": ["FIN"],
  "Tài chính": ["FIN"],
  "Pháp chế": ["LEGAL"],
  "Kiểm định": ["INSPECT"],
  "Kỹ thuật": ["INSPECT"],
  IT: ["IT"],
  "Công nghệ thông tin": ["IT"],
  // TODO: thêm các department khác sau khi chạy --inspect
};

// Nếu hệ thống chỉ có một cơ sở vật lý, mọi nhân viên đều được gán thêm
// chi nhánh mặc định này để categories không rỗng vì lý do chi nhánh.
// Đổi thành null nếu không muốn dùng khái niệm chi nhánh.
const DEFAULT_BRANCH_CODE = "BR_MAIN";

async function categoryCodeToId() {
  const { rows } = await database.query("SELECT id, code FROM mac_categories");
  const map = new Map(rows.map((r) => [r.code, r.id]));
  return map;
}

async function inspect() {
  console.log("=== Department hiện có trong bảng employees ===");
  const { rows } = await database.query(
    `SELECT COALESCE(department, '(NULL)') AS department, COUNT(*)::int AS total
     FROM employees GROUP BY department ORDER BY total DESC`,
  );
  if (!rows.length) {
    console.log("(không có nhân viên nào)");
  } else {
    for (const row of rows) {
      const mapped = DEPARTMENT_TO_CATEGORIES[row.department]
        ? "→ đã map"
        : "→ CHƯA MAP";
      console.log(
        `  ${String(row.total).padStart(4)}  ${row.department}  ${mapped}`,
      );
    }
  }

  console.log("\n=== users theo role hiện có categories rỗng ===");
  const roleRows = await database.query(
    `SELECT role, COUNT(*)::int AS total FROM users
     WHERE categories = '{}' GROUP BY role ORDER BY total DESC`,
  );
  for (const row of roleRows.rows) {
    console.log(`  ${String(row.total).padStart(4)}  ${row.role}`);
  }

  console.log("\n=== contracts hiện có categories rỗng ===");
  const contractCount = await database.query(
    "SELECT COUNT(*)::int AS total FROM contracts WHERE categories = '{}'",
  );
  console.log(`  ${contractCount.rows[0].total} hợp đồng chưa có ngăn`);

  console.log(
    "\nSửa DEPARTMENT_TO_CATEGORIES trong file này cho các department " +
      "còn 'CHƯA MAP' ở trên, sau đó chạy lại với --apply.",
  );
}

async function apply() {
  const codeToId = await categoryCodeToId();
  const defaultBranchId = DEFAULT_BRANCH_CODE
    ? codeToId.get(DEFAULT_BRANCH_CODE)
    : null;
  if (DEFAULT_BRANCH_CODE && !defaultBranchId) {
    throw new Error(
      `Không tìm thấy category code '${DEFAULT_BRANCH_CODE}' trong mac_categories`,
    );
  }

  // ---- Bước 1: gán categories cho users dựa trên employees.department ----
  const employees = await database.query(
    "SELECT e.user_id, e.department FROM employees e",
  );

  let updatedUsers = 0;
  let unmapped = 0;
  for (const emp of employees.rows) {
    const codes = DEPARTMENT_TO_CATEGORIES[emp.department] || [];
    const ids = codes
      .map((code) => codeToId.get(code))
      .filter((id) => id !== undefined);
    if (defaultBranchId) ids.push(defaultBranchId);

    if (!ids.length) {
      unmapped += 1;
      console.warn(
        `  [BỎ QUA] user_id=${emp.user_id} department='${emp.department}' ` +
          `không map được category nào — sửa DEPARTMENT_TO_CATEGORIES rồi chạy lại`,
      );
      continue;
    }

    const uniqueIds = [...new Set(ids)];
    await database.query(
      "UPDATE users SET categories=$2, updated_at=NOW() WHERE id=$1",
      [emp.user_id, uniqueIds],
    );
    updatedUsers += 1;
  }
  console.log(`\nĐã cập nhật categories cho ${updatedUsers} nhân viên.`);
  if (unmapped)
    console.log(
      `${unmapped} nhân viên chưa map được — xem cảnh báo phía trên.`,
    );

  // ---- Bước 2: admin/manager không có employees record — gán riêng ----
  // Người có role admin/manager nhưng không có bản ghi employees (ví dụ tài
  // khoản khởi tạo bằng createAdmin.js) cần category thủ công vì không có
  // department để suy luận. Mặc định gán toàn quyền chi nhánh + để trống
  // chức năng — BẠN NÊN RÀ LẠI DANH SÁCH NÀY THỦ CÔNG SAU KHI CHẠY XONG.
  const orphanAdmins = await database.query(
    `SELECT u.id, u.role FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     WHERE u.role IN ('admin','manager') AND e.id IS NULL AND u.categories = '{}'`,
  );
  if (orphanAdmins.rows.length) {
    const allCategoryIds = [...codeToId.values()];
    for (const row of orphanAdmins.rows) {
      await database.query(
        "UPDATE users SET categories=$2, updated_at=NOW() WHERE id=$1",
        [row.id, allCategoryIds],
      );
    }
    console.log(
      `\nĐã gán TOÀN BỘ category cho ${orphanAdmins.rows.length} tài khoản ` +
        `admin/manager không có hồ sơ employees (id: ${orphanAdmins.rows
          .map((r) => r.id)
          .join(", ")}). Rà soát lại thủ công nếu không phù hợp.`,
    );
  }

  // ---- Bước 3: gán categories cho contracts theo người tạo order ----
  const result = await database.query(
    `UPDATE contracts c
     SET categories = u.categories, updated_at = NOW()
     FROM orders o
     JOIN users u ON u.id = o.created_by
     WHERE c.order_id = o.id
       AND c.categories = '{}'
       AND u.categories <> '{}'
     RETURNING c.id`,
  );
  console.log(`\nĐã cập nhật categories cho ${result.rowCount} hợp đồng.`);

  const stillEmpty = await database.query(
    "SELECT COUNT(*)::int AS total FROM contracts WHERE categories = '{}'",
  );
  if (stillEmpty.rows[0].total > 0) {
    console.warn(
      `\n[CẢNH BÁO] còn ${stillEmpty.rows[0].total} hợp đồng categories rỗng ` +
        `(order không có created_by, hoặc người tạo chưa có category). ` +
        `Phải xử lý thủ công trước khi VALIDATE CONSTRAINT.`,
    );
  } else {
    console.log(
      "\nTất cả hợp đồng đã có categories. Có thể chạy:\n" +
        "  ALTER TABLE contracts VALIDATE CONSTRAINT contracts_categories_not_empty;",
    );
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === "--inspect") {
    await inspect();
  } else if (mode === "--apply") {
    await apply();
  } else {
    console.log(
      "Dùng: node database/backfillMacCategories.js --inspect | --apply",
    );
    process.exitCode = 1;
  }
  await database.end?.();
}

main().catch((error) => {
  console.error("Backfill thất bại:", error);
  process.exitCode = 1;
});
