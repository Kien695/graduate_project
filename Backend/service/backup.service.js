const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");
const neon = require("./neonSnapshot.service");

const snapshotId = (s) => s.id || s.snapshot_id;
const snapshotDate = (s) => s.created_at || s.timestamp || s.createdAt;
const applicationSnapshots = (snapshots) => snapshots
  .filter((snapshot) => snapshot.name?.startsWith("autodealer-"))
  .sort((a, b) => new Date(snapshotDate(a)) - new Date(snapshotDate(b)));
const mapSnapshot = (s, branch) => ({
  id: snapshotId(s), snapshot_id: snapshotId(s), file_name: s.name || snapshotId(s),
  created_at: snapshotDate(s), expires_at: s.expires_at || null,
  source_branch_id: s.source_branch_id || s.branch_id || null,
  target_branch_id: branch.id, target_branch_name: branch.name,
  status: ["creating", "pending", "processing"].includes(s.status) ? "processing" : "completed",
  size_bytes: null, provider: "neon_snapshot",
});
const list = async () => {
  const [snapshots, branch] = await Promise.all([neon.listSnapshots(), neon.resolveBranch()]);
  return snapshots.map((s) => mapSnapshot(s, branch)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};
const history = async () => (await database.query("SELECT * FROM public.backup_history ORDER BY created_at DESC")).rows;
const get = async (id) => {
  const record = (await list()).find((item) => item.id === id);
  if (!record) throw new ErrorHandler("Không tìm thấy Neon snapshot", 404);
  return record;
};
const create = async (userId, ipAddress) => {
  const branch = await neon.resolveBranch();
  const retentionDays = Math.max(1, (await require("./backupSettings.service").get()).retention_days);
  const now = new Date();
  const name = `autodealer-${branch.name}-${now.toISOString().replace(/[:.]/g, "-")}`.slice(0, 255);
  const expiresAt = new Date(now.getTime() + retentionDays * 86400000).toISOString();
  try {
    const maxAppSnapshots = Math.max(1, Number(process.env.NEON_MAX_APP_SNAPSHOTS) || 9);
    const existing = applicationSnapshots(await neon.listSnapshots());
    while (existing.length >= maxAppSnapshots)
      await neon.deleteSnapshot(snapshotId(existing.shift()));

    let result;
    try {
      result = await neon.createSnapshot({ branchId: branch.id, name, expiresAt });
    } catch (error) {
      if (!/snapshots? limit exceeded/i.test(error.message)) throw error;
      const oldest = applicationSnapshots(await neon.listSnapshots())[0];
      if (!oldest)
        throw new ErrorHandler(
          "Project Neon đã đạt giới hạn snapshot. Không có snapshot do ứng dụng tạo để tự dọn; hãy xóa snapshot cũ trong Neon Console hoặc nâng gói",
          409,
        );
      await neon.deleteSnapshot(snapshotId(oldest));
      result = await neon.createSnapshot({ branchId: branch.id, name, expiresAt });
    }
    const snapshot = result.snapshot || (await neon.listSnapshots()).find((item) => item.name === name);
    if (!snapshot) throw new ErrorHandler("Neon đã nhận yêu cầu nhưng chưa trả về snapshot; hãy tải lại danh sách", 502);
    const id = snapshotId(snapshot);
    const local = await database.query(
      "INSERT INTO public.backup_records(file_name,file_path,status,created_by) VALUES($1,$2,'completed',$3) RETURNING id",
      [name, `neon://snapshot/${id}`, userId],
    );
    await database.query(
      "INSERT INTO public.backup_history(backup_record_id,file_name,status,completed_at) VALUES($1,$2,'completed',NOW())",
      [local.rows[0].id, name],
    );
    await audit.record(null, { userId, action: "NEON_SNAPSHOT_CREATE", entityType: "backup", entityId: id,
      newValues: { snapshotName: name, branchId: branch.id, branchName: branch.name, expiresAt }, ipAddress }).catch(() => {});
    return mapSnapshot(snapshot, branch);
  } catch (error) {
    await database.query(
      "INSERT INTO public.backup_history(file_name,status,completed_at) VALUES($1,'failed',NOW())",
      [name],
    ).catch(() => {});
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler(`Sao lưu Neon thất bại: ${error.message}`, 500);
  }
};
const restore = async (id, userId, ipAddress) => {
  const [snapshot, branch] = await Promise.all([get(id), neon.resolveBranch()]);
  if (branch.parent_id) throw new ErrorHandler("Chỉ cho phép ghi đè root branch. Branch hiện tại là branch con nên không thể phục hồi từ giao diện này", 409);
  await audit.record(null, { userId, action: "NEON_SNAPSHOT_RESTORE_REQUESTED", entityType: "backup", entityId: id,
    newValues: { snapshotName: snapshot.file_name, targetBranchId: branch.id, targetBranchName: branch.name }, ipAddress });
  try {
    // Do not pass the existing target name: `name` belongs to a newly restored
    // branch and Neon generates a collision-free name when it is omitted.
    const result = await neon.restoreSnapshot({
      snapshotId: id,
      targetBranchId: branch.id,
    });
    await audit.record(null, { userId, action: "NEON_SNAPSHOT_RESTORE", entityType: "backup", entityId: id,
      newValues: { snapshotName: snapshot.file_name, targetBranchId: branch.id, targetBranchName: branch.name,
        operationIds: result.operationIds, restoredAt: new Date().toISOString() }, ipAddress }).catch(() => {});
    return { restored: true, snapshotId: id, targetBranchId: branch.id, targetBranchName: branch.name };
  } catch (error) {
    await audit.record(null, { userId, action: "NEON_SNAPSHOT_RESTORE_FAILED", entityType: "backup", entityId: id,
      newValues: { targetBranchId: branch.id, error: error.message }, ipAddress }).catch(() => {});
    throw error;
  }
};
const enforceRetention = async () => {
  const retentionDays = Math.max(1, (await require("./backupSettings.service").get()).retention_days);
  const cutoff = Date.now() - retentionDays * 86400000;
  const expired = (await neon.listSnapshots()).filter((s) => s.name?.startsWith("autodealer-") && new Date(snapshotDate(s)).getTime() < cutoff);
  for (const s of expired) await neon.deleteSnapshot(snapshotId(s));
  return { retentionDays, removed: expired.length };
};
let busy = false;
const exclusive = (operation) => async (...args) => {
  if (busy) throw new ErrorHandler("Đang có tác vụ sao lưu/phục hồi, vui lòng đợi hoàn tất", 409);
  busy = true;
  try { return await operation(...args); } finally { busy = false; }
};
module.exports = { list, history, get, create: exclusive(create), restore: exclusive(restore), enforceRetention: exclusive(enforceRetention) };
