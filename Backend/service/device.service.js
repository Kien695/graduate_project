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
    "SELECT COUNT(*)::int active_devices FROM user_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW()",
    [user.id],
  );
  const limit = user.role === "customer" ? 2 : 1;
  return {
    activeDevices: rows[0].active_devices,
    limit,
    canLogin: rows[0].active_devices < limit,
  };
};
module.exports = { list, remove, check };
