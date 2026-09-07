require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const db = require("../database/database");
(async () => {
  const client = await db.database.connect();
  const query = db.database.query;
  try {
    await client.query("BEGIN");
    db.database.query = client.query.bind(client);
    db.withTransaction = callback => callback(client);
    const accounts = require("../service/customerAccount.service");
    const crud = require("../service/crud.service");
    const customer = (await client.query(`SELECT c.id,c.user_id FROM customers c
      JOIN users u ON u.id=c.user_id WHERE UPPER(u.role)='CUSTOMER' LIMIT 1`)).rows[0];
    const admin = (await client.query("SELECT id,role FROM users WHERE UPPER(role)='ADMIN' LIMIT 1")).rows[0];
    assert.ok(customer && admin, "Requires an admin and customer fixture");
    await client.query(`UPDATE users SET is_locked=TRUE,locked_until=NOW()+INTERVAL '30 minutes',
      failed_login_attempts=5,failed_login_count=5 WHERE id=$1`, [customer.user_id]);
    assert.ok((await crud.list("customers", { locked: "true", limit: 100 })).items.some(c => c.id === customer.id));
    for (const role of ["staff", "manager", "customer"]) {
      await assert.rejects(accounts.unlock(customer.id, { ...admin, role }), e => e.statusCode === 403);
    }
    await accounts.unlock(customer.id, admin, "127.0.0.1");
    const user = (await client.query("SELECT is_locked,locked_until,failed_login_attempts,failed_login_count FROM users WHERE id=$1", [customer.user_id])).rows[0];
    assert.deepEqual(user, { is_locked: false, locked_until: null, failed_login_attempts: 0, failed_login_count: 0 });
    assert.ok(!(await crud.list("customers", { locked: "true", limit: 100 })).items.some(c => c.id === customer.id));
    assert.ok((await client.query("SELECT 1 FROM audit_logs WHERE action='UNLOCK' AND entity_id=$1 AND user_id=$2", [String(customer.user_id), admin.id])).rowCount);
    await client.query("UPDATE users SET is_locked=TRUE,locked_until=NULL WHERE id=$1", [customer.user_id]);
    await accounts.unlock(customer.id, admin, "127.0.0.1");
    await assert.rejects(accounts.unlock(-1, admin), e => e.statusCode === 400);
    console.log("PASS: locked list, admin-only unlock, timed/manual locks, counters reset and audit.");
  } finally {
    await client.query("ROLLBACK");
    db.database.query = query;
    client.release();
    await db.database.end();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
