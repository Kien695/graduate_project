const fs = require("fs");
const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");
const postgres = require("./postgresBackup.service");

const settings = () => require("./backupSettings.service").get();
const safeTarget = (config) => ({ database: config.database, host: config.host, port: config.port });
const removeExpiredFiles = async (retentionDays) => {
  const cutoff = Date.now() - retentionDays * 86400000;
  const expired = (await postgres.listFiles()).filter((file) =>
    (file.stat.birthtimeMs > 0 ? file.stat.birthtimeMs : file.stat.mtimeMs) < cutoff);
  for (const file of expired) await fs.promises.unlink(file.filePath);
  return expired.length;
};
const mapFile = (file, retentionDays, config) => {
  const createdAt = file.stat.birthtimeMs > 0 ? file.stat.birthtime : file.stat.mtime;
  return { id: file.name, snapshot_id: file.name, file_name: file.name, created_at: createdAt.toISOString(),
    expires_at: new Date(createdAt.getTime() + retentionDays * 86400000).toISOString(), source_branch_id: null,
    target_branch_id: config.database, target_branch_name: `${config.database}@${config.host}`,
    status: "completed", size_bytes: file.stat.size, provider: "postgresql_local" };
};
const list = async () => {
  const retentionDays = Math.max(1, (await settings()).retention_days); const config = postgres.connection();
  return (await postgres.listFiles()).map((file) => mapFile(file, retentionDays, config))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};
const history = async () => (await database.query("SELECT * FROM public.backup_history ORDER BY created_at DESC")).rows;
const get = async (id) => {
  const record = (await list()).find((item) => item.id === id);
  if (!record) throw new ErrorHandler("Không tìm thấy bản sao lưu", 404);
  return record;
};
const create = async (userId, ipAddress) => {
  const name = `autodealer-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  try {
    const result = await postgres.createDump(name);
    const local = await database.query(
      "INSERT INTO public.backup_records(file_name,file_path,status,size_bytes,created_by) VALUES($1,$2,'completed',$3,$4) RETURNING id",
      [name, result.filePath, result.stat.size, userId]);
    await database.query(
      "INSERT INTO public.backup_history(backup_record_id,file_name,size,status,completed_at) VALUES($1,$2,$3,'completed',NOW())",
      [local.rows[0].id, name, result.stat.size]);
    await audit.record(null, { userId, action: "POSTGRES_BACKUP_CREATE", entityType: "backup", entityId: name,
      newValues: { fileName: name, sizeBytes: result.stat.size, target: safeTarget(result.config) }, ipAddress }).catch(() => {});
    const retentionDays = Math.max(1, (await settings()).retention_days);
    await removeExpiredFiles(retentionDays);
    return mapFile({ name, filePath: result.filePath, stat: result.stat }, retentionDays, result.config);
  } catch (error) {
    await database.query("INSERT INTO public.backup_history(file_name,status,completed_at) VALUES($1,'failed',NOW())", [name]).catch(() => {});
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler(`Sao lưu PostgreSQL thất bại: ${error.message}`, 500);
  }
};
const restore = async (id, userId, ipAddress) => {
  const backup = await get(id);
  await audit.record(null, { userId, action: "POSTGRES_RESTORE_REQUESTED", entityType: "backup", entityId: id,
    newValues: { fileName: backup.file_name }, ipAddress });
  try {
    const config = await postgres.restoreDump(id);
    await audit.record(null, { userId, action: "POSTGRES_RESTORE", entityType: "backup", entityId: id,
      newValues: { fileName: backup.file_name, target: safeTarget(config), restoredAt: new Date().toISOString() }, ipAddress }).catch(() => {});
    return { restored: true, snapshotId: id, targetBranchId: config.database,
      targetBranchName: `${config.database}@${config.host}` };
  } catch (error) {
    await audit.record(null, { userId, action: "POSTGRES_RESTORE_FAILED", entityType: "backup", entityId: id,
      newValues: { error: error.message }, ipAddress }).catch(() => {});
    throw error;
  }
};
const enforceRetention = async () => {
  const retentionDays = Math.max(1, (await settings()).retention_days);
  return { retentionDays, removed: await removeExpiredFiles(retentionDays) };
};
let busy = false;
const exclusive = (operation) => async (...args) => {
  if (busy) throw new ErrorHandler("Đang có tác vụ sao lưu/phục hồi, vui lòng đợi hoàn tất", 409);
  busy = true; try { return await operation(...args); } finally { busy = false; }
};
module.exports = { list, history, get, create: exclusive(create), restore: exclusive(restore),
  enforceRetention: exclusive(enforceRetention) };
