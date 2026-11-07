const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
require("../config/env").loadEnv();
const postgres = require("../service/postgresBackup.service");
const encryption = require("../service/backupEncryption.service");

const run = async () => {
  const config = postgres.connection();
  assert.ok(config.host, "Database host is required");
  assert.ok(config.database, "Database name is required");
  assert.ok(config.user, "Database user is required");
  assert.ok(path.isAbsolute(postgres.backupDirectory()), "Backup directory must resolve to an absolute path");
  assert.ok(Array.isArray(await postgres.listFiles()));
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "autodealer-backup-test-"));
  const source = path.join(temporaryDirectory, "source.dump");
  const encrypted = path.join(temporaryDirectory, "source.dump.enc");
  const restored = path.join(temporaryDirectory, "restored.dump");
  const previousKey = process.env.BACKUP_ENCRYPTION_KEY;
  try {
    process.env.BACKUP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    const fixture = crypto.randomBytes(4096);
    await fs.promises.writeFile(source, fixture);
    await encryption.encryptFile(source, encrypted);
    assert.equal((await encryption.inspectFile(encrypted)).encrypted, true);
    await encryption.decryptFile(encrypted, restored);
    assert.deepEqual(await fs.promises.readFile(restored), fixture);
  } finally {
    if (previousKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
    else process.env.BACKUP_ENCRYPTION_KEY = previousKey;
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.log("PostgreSQL backup configuration test passed (no backup was created or restored)");
};
run().catch((error) => { console.error(error); process.exit(1); });
