const { withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const audit = require("./auditLog.service");

const unlock = (customerId, actor, ipAddress) => withTransaction(async (client) => {
  if (String(actor?.role).toLowerCase() !== "admin")
    throw new ErrorHandler("Chỉ Admin được mở khóa tài khoản", 403);
  const id = Number(customerId);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHandler("Mã khách hàng không hợp lệ", 400);
  const { rows } = await client.query(
    `SELECT u.id,u.is_locked,u.locked_until,u.failed_login_attempts,u.failed_login_count
     FROM customers c JOIN users u ON u.id=c.user_id
     WHERE c.id=$1 AND UPPER(u.role)='CUSTOMER' FOR UPDATE OF u`, [id],
  );
  if (!rows[0]) throw new ErrorHandler("Khách hàng chưa có tài khoản hợp lệ", 404);
  const old = rows[0];
  await client.query(`UPDATE users SET is_locked=FALSE,locked_until=NULL,
    failed_login_attempts=0,failed_login_count=0,updated_at=NOW() WHERE id=$1`, [old.id]);
  await audit.record(client, {
    userId: actor.id, action: "UNLOCK", entityType: "user", entityId: old.id,
    oldValues: old,
    newValues: { is_locked: false, locked_until: null, failed_login_attempts: 0, failed_login_count: 0 },
    ipAddress,
  });
  return { customer_id: id, user_id: old.id, is_locked: false };
});
module.exports = { unlock };
