require("dotenv").config({ quiet: true });
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { systemDatabase: database } = require("../database/database");

const main = async () => {
  const migration = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "20261110_repair_contract_insert_privileges.sql",
    ),
    "utf8",
  );
  await database.query(migration);

  const { rows } = await database.query(`
    SELECT u.email, u.db_user,
           has_column_privilege(u.db_user, 'public.contracts', 'order_id', 'INSERT') AS order_id_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'customer_id', 'INSERT') AS customer_id_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'contract_number', 'INSERT') AS number_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'total_amount', 'INSERT') AS amount_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'status', 'INSERT') AS status_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'terms', 'INSERT') AS terms_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'created_by', 'INSERT') AS creator_insert,
           has_column_privilege(u.db_user, 'public.contracts', 'security_level_id', 'INSERT') AS label_insert,
           has_table_privilege(u.db_user, 'public.audit_logs', 'INSERT') AS audit_insert,
           has_sequence_privilege(u.db_user, 'public.contracts_id_seq', 'USAGE') AS contract_sequence,
           has_sequence_privilege(u.db_user, 'public.audit_logs_id_seq', 'USAGE') AS audit_sequence
      FROM public.employee_feature_permissions efp
      JOIN public.employees e ON e.id = efp.employee_id
      JOIN public.users u ON u.id = e.user_id
     WHERE efp.feature_key = 'contracts'
       AND efp.privilege = 'INSERT'
       AND u.db_user IS NOT NULL
  `);

  assert(rows.length > 0, "Cần ít nhất một nhân viên được khai báo quyền tạo hợp đồng");
  for (const row of rows) {
    for (const column of [
      "order_id_insert",
      "customer_id_insert",
      "number_insert",
      "amount_insert",
      "status_insert",
      "terms_insert",
      "creator_insert",
      "audit_insert",
      "contract_sequence",
      "audit_sequence",
    ]) {
      assert.equal(row[column], true, `${row.email}: thiếu quyền ${column}`);
    }
    assert.equal(
      row.label_insert,
      false,
      `${row.email}: không được phép tự gán security_level_id`,
    );
  }

  console.log(
    `PASS: verified contract-create grants for ${rows.length} employee role(s): ${rows
      .map((row) => `${row.email} (${row.db_user})`)
      .join(", ")}.`,
  );
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
