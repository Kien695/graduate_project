require("dotenv").config({ quiet: true });
const { systemDatabase } = require("../database/database");

const main = async () => {
  const { rows: actors } = await systemDatabase.query(`
    SELECT u.id user_id,u.username,u.db_user,e.id employee_id,
           g.name permission_group
    FROM users u
    JOIN employees e ON e.user_id=u.id
    JOIN permission_groups g ON g.id=e.permission_group_id
    WHERE LOWER(g.name)='kiemdinh'
    ORDER BY u.id
  `);
  if (!actors.length) throw new Error("Khong co tai khoan thuoc nhom kiemdinh");

  const checks = [];
  for (const actor of actors) {
    const { rows } = await systemDatabase.query(`
      SELECT
        has_table_privilege($1,'public.inspections','INSERT') inspections_insert,
        has_sequence_privilege($1,pg_get_serial_sequence('public.inspections','id'),'USAGE') inspections_sequence,
        has_table_privilege($1,'public.notifications','INSERT') notifications_insert,
        has_sequence_privilege($1,pg_get_serial_sequence('public.notifications','id'),'USAGE') notifications_sequence,
        has_table_privilege($1,'public.vehicles','SELECT') vehicles_select,
        has_table_privilege($1,'public.orders','SELECT') orders_select,
        has_table_privilege($1,'public.contracts','SELECT') contracts_select,
        has_table_privilege($1,'public.customers','SELECT') customers_select
    `, [actor.db_user]);
    checks.push({ ...actor, ...rows[0] });
  }
  console.dir(checks, { depth: null });

  const missing = checks.flatMap((row) =>
    Object.entries(row)
      .filter(([key, value]) => key.includes("_") && typeof value === "boolean" && !value)
      .map(([key]) => `${row.db_user}: ${key}`),
  );
  if (missing.length) throw new Error(`Thieu quyen: ${missing.join(", ")}`);

  const actor = checks[0];
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(actor.db_user))
    throw new Error("Database role khong hop le");
  const { rows: fixtures } = await systemDatabase.query(`
    SELECT c.id contract_id,o.id order_id,v.id vehicle_id,o.customer_id
    FROM contracts c
    JOIN orders o ON o.id=c.order_id
    JOIN vehicles v ON v.id=o.vehicle_id
    WHERE LOWER(c.status)='signed' AND LOWER(o.status)='confirmed'
    ORDER BY c.id DESC LIMIT 1
  `);
  if (!fixtures[0]) throw new Error("Khong co hop dong signed/order confirmed de test");

  const client = await systemDatabase.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET SESSION AUTHORIZATION "${actor.db_user}"`);
    await client.query("SELECT id FROM vehicles WHERE id=$1", [fixtures[0].vehicle_id]);
    const relation = await client.query(
      `SELECT c.id contract_id,o.id order_id,v.id vehicle_id,o.customer_id
       FROM contracts c
       JOIN orders o ON o.id=c.order_id
       JOIN vehicles v ON v.id=o.vehicle_id
       WHERE c.id=$1 AND o.id=$2 AND v.id=$3
         AND LOWER(o.status)='confirmed' AND LOWER(c.status)='signed'`,
      [fixtures[0].contract_id, fixtures[0].order_id, fixtures[0].vehicle_id],
    );
    if (!relation.rows[0]) throw new Error("RLS an hop dong signed khoi inspector");
    await client.query(
      `INSERT INTO inspections(vehicle_id,order_id,contract_id,inspector_id,status,checklist,notes,result,note)
       VALUES($1,$2,$3,$4,'pending','[]'::jsonb,NULL,'WAITING',NULL)`,
      [fixtures[0].vehicle_id, fixtures[0].order_id, fixtures[0].contract_id, actor.user_id],
    );
    const customer = await client.query("SELECT user_id FROM customers WHERE id=$1", [fixtures[0].customer_id]);
    if (customer.rows[0]?.user_id)
      await client.query(
        `INSERT INTO notifications(user_id,title,message,type,reference_id)
         VALUES($1,'Permission test','Rolled back','INSPECTION',$2)`,
        [customer.rows[0].user_id, fixtures[0].order_id],
      );
    await client.query("RESET SESSION AUTHORIZATION");
    await client.query("ROLLBACK");
  } catch (error) {
    try { await client.query("RESET SESSION AUTHORIZATION"); } catch {}
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
  console.log("Inspector create end-to-end database test passed (rolled back)");
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => systemDatabase.end());
