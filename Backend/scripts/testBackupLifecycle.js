const assert = require("assert");
const path = require("path");
require("../config/env").loadEnv();
const postgres = require("../service/postgresBackup.service");

const run = async () => {
  const config = postgres.connection();
  assert.ok(config.host, "Database host is required");
  assert.ok(config.database, "Database name is required");
  assert.ok(config.user, "Database user is required");
  assert.ok(path.isAbsolute(postgres.backupDirectory()), "Backup directory must resolve to an absolute path");
  assert.ok(Array.isArray(await postgres.listFiles()));
  console.log("PostgreSQL backup configuration test passed (no backup was created or restored)");
};
run().catch((error) => { console.error(error); process.exit(1); });
