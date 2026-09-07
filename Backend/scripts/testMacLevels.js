// Integration verification against a development DB with an existing customer contract.
// Every data change, including signatures and audit entries, is rolled back.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const db = require("../database/database");

async function main() {
  const client = await db.database.connect();
  const originalQuery = db.database.query;
  const originalTransaction = db.withTransaction;
  try {
    await client.query("BEGIN");
    db.database.query = client.query.bind(client);
    db.withTransaction = (callback) => callback(client);
    const customer = require("../service/customerContract.service");
    const internal = require("../service/contract.service");
    const mac = require("../middleware/mac.middleware");
    const runMiddleware = (handler, req) => new Promise((resolve) => handler(req, {}, resolve));
    const levels = (await client.query("SELECT id,name,rank FROM security_levels ORDER BY rank")).rows;
    assert.deepEqual(levels.map(l => l.name), ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]);
    const fixture = (await client.query(`SELECT c.id,cu.user_id FROM contracts c
      JOIN orders o ON o.id=c.order_id JOIN customers cu ON cu.id=o.customer_id
      WHERE cu.user_id IS NOT NULL ORDER BY c.id LIMIT 1`)).rows[0];
    assert.ok(fixture, "Create a customer contract before running this integration test");
    const { id, user_id: userId } = fixture;
    for (const subject of levels) {
      await client.query("UPDATE users SET security_level_id=$2 WHERE id=$1", [userId, subject.id]);
      for (const object of levels) {
        await client.query("UPDATE contracts SET security_level_id=$2,status='approved' WHERE id=$1", [id, object.id]);
        const allowed = subject.rank >= object.rank;
        assert.equal((await customer.list(userId)).some(c => c.id === id), allowed);
        assert.equal((await internal.list({ id: userId })).some(c => c.id === id), allowed);
        const request = { user: { id: userId, role: "customer" }, params: { id }, body: { securityLevelId: object.id } };
        assert.equal(!(await runMiddleware(mac.enforceContractAccess, request)), allowed);
        assert.equal(!(await runMiddleware(mac.enforceContractCreate, request)), allowed);
        if (allowed) {
          assert.equal((await customer.get(id, userId)).id, id);
          await client.query("SAVEPOINT confirmation");
          assert.equal((await customer.confirm(id, userId, "127.0.0.1")).status, "SIGNED");
          await assert.rejects(customer.confirm(id, userId, "127.0.0.1"), e => e.statusCode === 409);
          await client.query("ROLLBACK TO SAVEPOINT confirmation");
        } else {
          await assert.rejects(customer.get(id, userId), e => e.statusCode === 404);
          await assert.rejects(customer.confirm(id, userId, "127.0.0.1"), e => e.statusCode === 404);
        }
      }
    }
    await client.query("UPDATE contracts SET security_level_id=$2,status='approved' WHERE id=$1", [id, levels[0].id]);
    assert.equal((await customer.list(-1)).length, 0);
    await assert.rejects(customer.get(id, -1), e => e.statusCode === 404);
    await assert.rejects(customer.confirm(id, -1, "127.0.0.1"), e => e.statusCode === 404);
    for (const status of ["draft", "cancelled"]) {
      await client.query("UPDATE contracts SET status=$2 WHERE id=$1", [id, status]);
      assert.ok(!(await customer.list(userId)).some(c => c.id === id));
      await assert.rejects(customer.get(id, userId), e => e.statusCode === 404);
      await assert.rejects(customer.confirm(id, userId, "127.0.0.1"), e => e.statusCode === 409);
    }
    const newUser = await client.query(`INSERT INTO users(username,password_hash,role)
      VALUES('mac-rollback-test','not-a-login-hash','CUSTOMER') RETURNING security_level_id`);
    assert.equal(newUser.rows[0].security_level_id, levels[0].id);
    console.log("PASS: all 16 MAC level pairs, customer/internal list, detail, confirmation, classification, ownership, publication and PUBLIC default.");
  } finally {
    await client.query("ROLLBACK");
    db.database.query = originalQuery;
    db.withTransaction = originalTransaction;
    client.release();
    await db.database.end();
    console.log("Verification data rolled back.");
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
