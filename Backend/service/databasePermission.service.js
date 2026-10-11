const { systemDatabase, withSystemTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const FEATURES = Object.freeze({
  dashboard: {
    label: "Dashboard",
    tables: ["dashboard_overview"],
    operations: ["SELECT"],
  },
  vehicles: { label: "Xe", tables: ["vehicles"], operations: PRIVILEGES },
  accessories: { label: "Phụ kiện", tables: ["accessories"], operations: PRIVILEGES },
  orders: {
    label: "Đơn đặt hàng",
    tables: ["orders"],
    // order.service.list joins vehicles/customers and reads the latest inspection.
    readTables: ["customers", "vehicles", "inspections"],
    operations: PRIVILEGES,
  },
  contracts: {
    label: "Hợp đồng",
    tables: ["contracts", "payments"],
    // Contract list/detail resolves its order, customer, vehicle, MAC label and
    // payment creator. These remain read-only supporting tables.
    readTables: ["orders", "customers", "vehicles", "security_levels", "users"],
    operations: PRIVILEGES,
  },
  inspections: { label: "Kiểm định xe", tables: ["inspections", "inspection_images"], readTables: ["vehicles", "orders", "contracts"], operations: PRIVILEGES },
  customers: { label: "Khách hàng", tables: ["customers", "customer_storage"], operations: PRIVILEGES },
  accessoryOrders: { label: "Đơn phụ kiện", tables: ["accessory_orders", "accessory_order_items"], readTables: ["customers", "accessories"], operations: PRIVILEGES },
});

const quoteIdentifier = (value) => {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value))
    throw new ErrorHandler("Tên role PostgreSQL không hợp lệ", 400);
  return `"${value}"`;
};
const getEmployee = async (employeeId, client = systemDatabase) => {
  const { rows } = await client.query(
    `SELECT e.id,e.user_id,u.db_user FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=$1`,
    [employeeId],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy nhân viên", 404);
  if (!rows[0].db_user)
    throw new ErrorHandler("Nhân viên chưa được liên kết role PostgreSQL; hãy đặt lại mật khẩu để tạo role", 409);
  return rows[0];
};
const existingFeatures = async (client) => {
  const names = [...new Set(Object.values(FEATURES).flatMap((f) => [...f.tables, ...(f.readTables || [])]))];
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])",
    [names],
  );
  const found = new Set(rows.map((r) => r.table_name));
  return Object.fromEntries(Object.entries(FEATURES).filter(([, f]) => f.tables.every((t) => found.has(t))));
};
const readWithClient = async (employeeId, client) => {
  const employee = await getEmployee(employeeId, client);
  const features = await existingFeatures(client);
  const checks = Object.entries(features).flatMap(([featureKey, feature]) =>
    feature.operations.flatMap((privilege) =>
      feature.tables.map((tableName) => ({
        feature_key: featureKey,
        table_name: tableName,
        privilege,
      })),
    ),
  );
  const { rows } = await client.query(
    `SELECT x.feature_key,x.table_name,x.privilege,
       has_table_privilege(
         $1::text,
         format('%I.%I','public'::text,x.table_name)::text,
         x.privilege
       ) AS effective,
       EXISTS (
         SELECT 1 FROM information_schema.role_table_grants g
         WHERE g.grantee=$1::text AND g.table_schema='public'
           AND g.table_name=x.table_name AND g.privilege_type=x.privilege
       ) AS direct
     FROM jsonb_to_recordset($2::jsonb)
       AS x(feature_key text,table_name text,privilege text)`,
    [employee.db_user, JSON.stringify(checks)],
  );
  const result = Object.entries(features).map(([key, feature]) => {
    const permissions = {};
    const external = {};
    for (const privilege of feature.operations) {
      const matches = rows.filter(
        (row) => row.feature_key === key && row.privilege === privilege,
      );
      permissions[privilege] = matches.every((row) => row.effective);
      external[privilege] = matches.some(
        (row) => row.effective && !row.direct,
      );
    }
    return { key, label: feature.label, operations: feature.operations, permissions, external };
  });
  return { dbUser: employee.db_user, features: result };
};
const read = (employeeId) => readWithClient(employeeId, systemDatabase);
const readForUser = async (userId) => {
  const { rows } = await systemDatabase.query(
    "SELECT id FROM employees WHERE user_id=$1",
    [userId],
  );
  if (!rows[0])
    throw new ErrorHandler("Không tìm thấy hồ sơ nhân viên của tài khoản", 404);
  return read(rows[0].id);
};
const update = async (employeeId, requested = {}) => withSystemTransaction(async (client) => {
  const employee = await getEmployee(employeeId, client);
  const features = await existingFeatures(client);
  const role = quoteIdentifier(employee.db_user);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);

  // Multiple features can share a table (Dashboard and the detail screens).
  // Build the final desired ACL first so a later feature cannot accidentally
  // revoke a privilege selected by an earlier feature.
  const managedTables = new Set();
  const insertTables = new Set();
  const desired = new Map();
  const want = (table, privilege) => {
    managedTables.add(table);
    if (!desired.has(table)) desired.set(table, new Set());
    desired.get(table).add(privilege);
  };
  for (const [key, feature] of Object.entries(features)) {
    const selection = requested[key] || {};
    for (const table of feature.tables) {
      managedTables.add(table);
      if (feature.operations.includes("INSERT")) insertTables.add(table);
    }
    for (const table of feature.readTables || []) managedTables.add(table);
    for (const privilege of feature.operations)
      if (selection[privilege] === true)
        for (const table of feature.tables) want(table, privilege);
    if (feature.operations.some((privilege) => selection[privilege] === true))
      for (const table of feature.readTables || []) want(table, "SELECT");
  }
  const allTables = [...managedTables];
  for (const privilege of PRIVILEGES) {
    const granted = allTables.filter(
      (table) => desired.get(table)?.has(privilege) === true,
    );
    const revoked = allTables.filter(
      (table) => desired.get(table)?.has(privilege) !== true,
    );
    if (granted.length)
      await client.query(
        `GRANT ${privilege} ON TABLE ${granted.map((table) => `public.${quoteIdentifier(table)}`).join(",")} TO ${role}`,
      );
    if (revoked.length)
      await client.query(
        `REVOKE ${privilege} ON TABLE ${revoked.map((table) => `public.${quoteIdentifier(table)}`).join(",")} FROM ${role}`,
      );
  }
  const { rows: sequenceRows } = await client.query(
    `SELECT table_name,
       pg_get_serial_sequence(
         format('%I.%I','public'::text,table_name)::text,
         'id'::text
       ) sequence_name
     FROM unnest($1::text[]) AS source(table_name)`,
    [[...insertTables]],
  );
  const grantedSequences = sequenceRows.filter(
    (row) => row.sequence_name && desired.get(row.table_name)?.has("INSERT"),
  );
  const revokedSequences = sequenceRows.filter(
    (row) => row.sequence_name && !desired.get(row.table_name)?.has("INSERT"),
  );
  if (grantedSequences.length)
    await client.query(
      `GRANT USAGE,SELECT ON SEQUENCE ${grantedSequences.map((row) => row.sequence_name).join(",")} TO ${role}`,
    );
  if (revokedSequences.length)
    await client.query(
      `REVOKE USAGE,SELECT ON SEQUENCE ${revokedSequences.map((row) => row.sequence_name).join(",")} FROM ${role}`,
    );
  const current = await readWithClient(employeeId, client);
  const blocked = current.features.flatMap((f) =>
    f.operations
      .filter((p) =>
        requested[f.key]?.[p] !== true &&
        f.permissions[p] &&
        f.external[p],
      )
      .map((p) => `${f.label}: ${p}`),
  );
  if (blocked.length)
    throw new ErrorHandler("Không thể thu quyền vì role vẫn nhận quyền từ PUBLIC, role kế thừa hoặc quyền sở hữu", 409, blocked.map((message) => ({ message })));
  return current;
});

module.exports = { FEATURES, PRIVILEGES, quoteIdentifier, read, readForUser, update };

