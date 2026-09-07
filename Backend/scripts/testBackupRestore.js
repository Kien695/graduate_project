// Uses a newly created, isolated database. Never restores over the configured DB.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const originalName = process.env.DB_NAME;
const name = `backup_test_${Date.now()}`;
const admin = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: originalName });
(async () => {
  let database;
  let record;
  let created = false;
  try {
    assert.match(name, /^backup_test_\d+$/);
    assert.notEqual(name, originalName);
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    process.env.DB_NAME = name;
    database = require("../database/database").database;
    for (const file of ["schema.sql", "migrations/20260909_mac_four_levels.sql", "migrations/20260910_backup_settings.sql"])
      await database.query(fs.readFileSync(path.join(__dirname, "../database", file), "utf8"));
    const actor = (await database.query("INSERT INTO users(username,password_hash,role) VALUES('backup-test','test-only','ADMIN') RETURNING id,role")).rows[0];
    const settings = require("../service/backupSettings.service");
    await assert.rejects(settings.save({enabled:true,hour:24,retention_days:30},actor), e => e.statusCode===400);
    await settings.save({enabled:false,hour:4,retention_days:7},actor);
    assert.equal((await settings.get()).hour,4);
    const scheduler = require("../service/backupScheduler.service");
    await scheduler.start(); assert.equal(scheduler.getNextRun(),null);
    await settings.save({enabled:true,hour:4,retention_days:7},actor);
    await scheduler.start(); assert.ok(scheduler.getNextRun());
    await settings.save({enabled:false,hour:4,retention_days:7},actor);
    await scheduler.start();
    await database.query("CREATE TABLE restore_probe(value TEXT); INSERT INTO restore_probe VALUES('before backup')");
    // Regression: archives made before the four-level cleanup contain SQL CHECK
    // functions that reference mac_categories under pg_restore's empty search_path.
    await database.query(fs.readFileSync(path.join(__dirname, "../database/migrations/20260908_add_mac_categories.sql"), "utf8"));
    const backup = require("../service/backup.service");
    record = await backup.create(actor.id);
    assert.equal(record.status,"completed");
    await database.query("UPDATE restore_probe SET value='after backup'");
    await backup.restore(record.id,actor.id,"127.0.0.1");
    assert.equal((await database.query("SELECT value FROM restore_probe")).rows[0].value,"before backup");
    assert.equal((await backup.get(record.id)).status,"completed");
    assert.equal((await database.query("SELECT 1 FROM pg_constraint WHERE conname IN ('contracts_categories_valid','users_categories_valid','contracts_categories_not_empty')")).rowCount,0);
    assert.ok((await database.query("SELECT 1 FROM audit_logs WHERE action='RESTORE'")).rowCount);
    console.log("PASS: persistent settings, validation, rescheduling, real pg_dump/pg_restore and restore audit on isolated database.");
  } finally {
    if (database) await database.end();
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
    if (record) {
      const target = path.resolve(record.file_path);
      if (path.dirname(target) === path.resolve(__dirname,"../backups")) await fs.promises.unlink(target);
    }
    process.env.DB_NAME = originalName;
  }
})().catch(e => { console.error(e.message); process.exitCode=1; });
