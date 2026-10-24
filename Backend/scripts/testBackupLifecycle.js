require("dotenv").config({ quiet: true });
const assert = require("assert");
const neon = require("../service/neonSnapshot.service");
const scheduler = require("../service/backupScheduler.service");

const run = async () => {
  const config = neon.configuration();
  assert.ok(config.apiKey && config.projectId && config.branchId);
  const branch = await neon.resolveBranch();
  assert.ok(branch.id && branch.name);
  assert.ok(Array.isArray(await neon.listSnapshots()));
  const delay = scheduler.millisecondsUntilNextRun(2);
  assert.ok(delay > 0 && delay <= 24 * 60 * 60 * 1000);
  console.log("Neon backup configuration test passed (no snapshot was created or restored)");
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
