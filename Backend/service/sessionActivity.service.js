const { withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const IDLE_TIMEOUT_MINUTES = Math.max(
  1,
  Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES || 30),
);

const touch = async ({ sessionId, userId, refreshTokenHash }) => {
  let idleExpired = false;
  const user = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT u.id,u.email,u.full_name,u.role,u.security_level_id,
         u.is_locked,u.is_active,s.id session_id,s.device_id,s.device_type,
         s.refresh_token_hash,s.last_activity_at,s.created_at,s.expires_at,s.revoked_at
       FROM user_sessions s JOIN users u ON u.id=s.user_id
       WHERE s.id=$1 AND s.user_id=$2
       FOR UPDATE OF s`,
      [sessionId, userId],
    );
    const session = rows[0];
    if (
      !session ||
      session.revoked_at ||
      new Date(session.expires_at) <= new Date()
    )
      return null;
    if (refreshTokenHash && session.refresh_token_hash !== refreshTokenHash)
      return null;
    const lastActivity = new Date(
      session.last_activity_at || session.created_at,
    );
    if (
      Date.now() - lastActivity.getTime() >
      IDLE_TIMEOUT_MINUTES * 60 * 1000
    ) {
      await client.query(
        "UPDATE user_sessions SET revoked_at=NOW() WHERE id=$1 AND revoked_at IS NULL",
        [sessionId],
      );
      idleExpired = true;
      return null;
    }
    await client.query(
      "UPDATE user_sessions SET last_activity_at=NOW() WHERE id=$1",
      [sessionId],
    );
    return session;
  });
  if (idleExpired)
    throw new ErrorHandler(
      "Phien dang nhap da het han do khong hoat dong",
      401,
    );
  return user;
};

module.exports = { IDLE_TIMEOUT_MINUTES, touch };
