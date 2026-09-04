const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const list = async (userId) => {
  const { rows } = await database.query(
    "SELECT id,device_id,device_type,user_agent,ip_address,expires_at,revoked_at,created_at FROM user_sessions WHERE user_id=$1 ORDER BY created_at DESC",
    [userId],
  );
  return rows;
};
const remove = async (id, userId) => {
  const { rows } = await database.query(
    "UPDATE user_sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id",
    [id, userId],
  );
  if (!rows[0])
    throw new ErrorHandler("Không tìm thấy thiết bị đang đăng nhập", 404);
  return rows[0];
};
const check = async (user) => {
  const { rows } = await database.query(
    `SELECT device_type,COUNT(*)::int active_devices
     FROM user_sessions
     WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW()
     GROUP BY device_type`,
    [user.id],
  );
  const byType = Object.fromEntries(
    rows.map((row) => [
      String(row.device_type).toUpperCase(),
      row.active_devices,
    ]),
  );
  const activeDevices = rows.reduce(
    (total, row) => total + row.active_devices,
    0,
  );
  return {
    activeDevices,
    activeByType: byType,
    policy: user.role === "customer" ? { PC: 1, MOBILE: 1 } : { TOTAL: 1 },
  };
};
module.exports = { list, remove, check };
