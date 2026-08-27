const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { execFile } = require("child_process");
const run = promisify(execFile);
const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");
const dir = path.resolve(__dirname, "../backups");
const resolvePostgresTool = (configured, executable) => {
  if (configured && configured !== executable && fs.existsSync(configured))
    return configured;
  if (process.platform === "win32") {
    const root = "C:\\Program Files\\PostgreSQL";
    if (fs.existsSync(root)) {
      const versions = fs.readdirSync(root).sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true }),
      );
      for (const version of versions) {
        const candidate = path.join(root, version, "bin", `${executable}.exe`);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return configured || executable;
};
const list = async () => {
  const { rows } = await database.query(
    "SELECT * FROM backup_records ORDER BY created_at DESC",
  );
  return rows;
};
const history = async () => {
  const { rows } = await database.query(
    "SELECT * FROM backup_history ORDER BY created_at DESC",
  );
  return rows;
};
const get = async (id) => {
  const { rows } = await database.query(
    "SELECT * FROM backup_records WHERE id=$1",
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy bản backup", 404);
  return rows[0];
};
const create = async (userId) => {
  await fs.promises.mkdir(dir, { recursive: true });
  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const filePath = path.join(dir, fileName);
  const inserted = await database.query(
    "INSERT INTO backup_records(file_name,file_path,status,created_by) VALUES($1,$2,'processing',$3) RETURNING *",
    [fileName, filePath, userId],
  );
  const historyRecord = await database.query(
    `INSERT INTO backup_history(backup_record_id,file_name,status)
     VALUES($1,$2,'processing') RETURNING id`,
    [inserted.rows[0].id, fileName],
  );
  try {
    await run(
      resolvePostgresTool(process.env.PG_DUMP_PATH, "pg_dump"),
      [
        "--format=custom",
        "--no-owner",
        "--file",
        filePath,
        process.env.DB_NAME,
      ],
      {
        env: {
          ...process.env,
          PGHOST: process.env.DB_HOST,
          PGPORT: process.env.DB_PORT,
          PGUSER: process.env.DB_USER,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
      },
    );
    const stat = await fs.promises.stat(filePath);
    const { rows } = await database.query(
      "UPDATE backup_records SET status='completed',size_bytes=$2 WHERE id=$1 RETURNING *",
      [inserted.rows[0].id, stat.size],
    );
    await database.query(
      `UPDATE backup_history SET status='completed',size=$2,completed_at=NOW()
       WHERE id=$1`,
      [historyRecord.rows[0].id, stat.size],
    );
    return rows[0];
  } catch (error) {
    await database.query(
      "UPDATE backup_records SET status='failed' WHERE id=$1",
      [inserted.rows[0].id],
    );
    await database.query(
      "UPDATE backup_history SET status='failed',completed_at=NOW() WHERE id=$1",
      [historyRecord.rows[0].id],
    );
    throw new ErrorHandler(`Backup thất bại: ${error.message}`, 500);
  }
};
const restore = async (id, userId, ipAddress) => {
  const backup = await get(id);
  const resolved = path.resolve(backup.file_path);
  if (
    path.dirname(resolved) !== dir ||
    backup.status !== "completed" ||
    !fs.existsSync(resolved)
  )
    throw new ErrorHandler("File backup không hợp lệ", 400);
  try {
    await run(
      resolvePostgresTool(process.env.PG_RESTORE_PATH, "pg_restore"),
      [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--dbname",
        process.env.DB_NAME,
        resolved,
      ],
      {
        env: {
          ...process.env,
          PGHOST: process.env.DB_HOST,
          PGPORT: process.env.DB_PORT,
          PGUSER: process.env.DB_USER,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
      },
    );
    await audit.record(null, {
      userId,
      action: "RESTORE",
      entityType: "backup",
      entityId: id,
      newValues: { fileName: backup.file_name, restoredAt: new Date().toISOString() },
      ipAddress,
    });
    return { restored: true, backupId: id };
  } catch (error) {
    throw new ErrorHandler(`Restore thất bại: ${error.message}`, 500);
  }
};
const enforceRetention = async () => {
  const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 30));
  const { rows } = await database.query(
    `SELECT * FROM backup_records
     WHERE status='completed' AND created_at<NOW()-($1*INTERVAL '1 day')`,
    [retentionDays],
  );
  let removed = 0;
  for (const record of rows) {
    const resolved = path.resolve(record.file_path);
    if (path.dirname(resolved) !== dir) continue;
    if (fs.existsSync(resolved)) await fs.promises.unlink(resolved);
    await database.query(
      "UPDATE backup_history SET status='expired' WHERE backup_record_id=$1",
      [record.id],
    );
    await database.query("DELETE FROM backup_records WHERE id=$1", [record.id]);
    removed += 1;
  }
  return { retentionDays, removed };
};

module.exports = { list, history, get, create, restore, enforceRetention };
