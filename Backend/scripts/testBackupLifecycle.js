require("dotenv").config({ quiet: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { database } = require("../database/database");
const backup = require("../service/backup.service");
const scheduler = require("../service/backupScheduler.service");

const run = async () => {
  let record;
  try {
    record = await backup.create(null);
    assert.equal(record.status, "completed");
    assert.ok(fs.existsSync(record.file_path));
    const history = await database.query(
      "SELECT * FROM backup_history WHERE backup_record_id=$1",
      [record.id],
    );
    assert.equal(history.rows[0].status, "completed");
    assert.ok(Number(history.rows[0].size) > 0);
    const delay = scheduler.millisecondsUntilNextRun(2);
    assert.ok(delay > 0 && delay <= 24 * 60 * 60 * 1000);
    console.log("Backup lifecycle integration test passed");
  } finally {
    if (record) {
      const resolved = path.resolve(record.file_path);
      const backupDir = path.resolve(__dirname, "../backups");
      if (path.dirname(resolved) === backupDir && fs.existsSync(resolved))
        await fs.promises.unlink(resolved);
      await database.query("DELETE FROM backup_records WHERE id=$1", [record.id]);
      await database.query("DELETE FROM backup_history WHERE backup_record_id IS NULL AND file_name=$1", [record.file_name]);
    }
    await database.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
