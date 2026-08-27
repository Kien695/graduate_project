require("dotenv").config({ quiet: true });
const assert = require("assert");
const { database } = require("../database/database");
const quota = require("../service/storageQuota.service");

const run = async () => {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const customer = await client.query(
      `SELECT c.id customer_id,c.user_id
       FROM customers c JOIN users u ON u.id=c.user_id
       WHERE c.is_active=TRUE LIMIT 1`,
    );
    if (!customer.rows[0]) throw new Error("Can it nhat mot customer de test quota");
    const { customer_id: customerId, user_id: userId } = customer.rows[0];
    await quota.ensureForCustomer(customerId, client);
    const before = await client.query(
      "SELECT used_mb FROM customer_storage WHERE customer_id=$1",
      [customerId],
    );
    const reservation = await quota.reserveForUser(
      { id: userId, role: "customer" },
      1024 * 1024,
      client,
    );
    assert.equal(reservation.customerId, customerId);
    const afterReserve = await client.query(
      "SELECT used_mb FROM customer_storage WHERE customer_id=$1",
      [customerId],
    );
    assert.equal(Number(afterReserve.rows[0].used_mb), Number(before.rows[0].used_mb) + 1);
    await quota.releaseReservation(reservation, client);
    const afterRelease = await client.query(
      "SELECT used_mb FROM customer_storage WHERE customer_id=$1",
      [customerId],
    );
    assert.equal(Number(afterRelease.rows[0].used_mb), Number(before.rows[0].used_mb));
    assert.equal(await quota.reserveForUser({ id: userId, role: "admin" }, 1024, client), null);
    await client.query("ROLLBACK");
    console.log("Storage quota integration test passed (transaction rolled back)");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await database.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
