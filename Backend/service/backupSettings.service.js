const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");
const defaults = () => ({
  enabled:
    String(process.env.AUTO_BACKUP_ENABLED || "true").toLowerCase() !== "false",
  hour: Number(process.env.BACKUP_HOUR || 2),
  retention_days: Number(process.env.BACKUP_RETENTION_DAYS || 30),
});
const get = async () => {
  const { rows } = await database.query(
    "SELECT enabled,hour,retention_days FROM backup_settings WHERE id=1",
  );
  return {
    ...(rows[0] || defaults()),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};
const save = async (input, actor, ipAddress) => {
  const { enabled, hour, retention_days: days } = input;
  if (
    typeof enabled !== "boolean" ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 3650
  )
    throw new ErrorHandler(
      "Lịch không hợp lệ: giờ 0–23, số ngày lưu 1–3650",
      400,
    );
  await withTransaction(async (client) => {
    const old = await client.query(
      "SELECT * FROM backup_settings WHERE id=1 FOR UPDATE",
    );
    await client.query(
      `INSERT INTO backup_settings(id,enabled,hour,retention_days) VALUES(1,$1,$2,$3)
      ON CONFLICT(id) DO UPDATE SET enabled=$1,hour=$2,retention_days=$3,updated_at=NOW()`,
      [enabled, hour, days],
    );
    await audit.record(client, {
      userId: actor.id,
      action: "BACKUP_SETTINGS",
      entityType: "backup_settings",
      entityId: 1,
      oldValues: old.rows[0] || defaults(),
      newValues: { enabled, hour, retention_days: days },
      ipAddress,
    });
  });
  return get();
};
module.exports = { get, save };
