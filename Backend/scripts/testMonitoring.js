require("dotenv").config({ quiet: true });
const assert = require("assert");
const { database } = require("../database/database");
const monitoring = require("../service/monitoring.service");

const run = async () => {
  monitoring.recordRequest(125, 200);
  monitoring.recordRequest(2500, 500);
  const snapshot = await monitoring.status();
  assert.equal(snapshot.requests.requestCount, 2);
  assert.equal(snapshot.requests.errorCount, 1);
  assert.ok(snapshot.requests.p95LatencyMs >= 2500);
  assert.ok(Number.isInteger(snapshot.database.totalConnections));
  assert.ok(Number.isFinite(snapshot.cpu.usagePercent));
  assert.ok(Number.isFinite(snapshot.memory.usagePercent));
  console.log("Runtime monitoring test passed");
  await database.end();
};

run().catch(async (error) => {
  console.error(error);
  await database.end();
  process.exitCode = 1;
});
