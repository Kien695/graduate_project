const jwt = require("jsonwebtoken");
const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { verifyPassword, hashPassword } = require("../utils/password");
const { hashToken } = require("../utils/token");
const { generateAccessToken } = require("../utils/generatAccessToken");
const { generateRefreshToken } = require("../utils/generateRefreshToken");
const MAX_FAILURES = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);

const login = (input) =>
  withTransaction(async (client) => {
    const result = await client.query(
      "SELECT * FROM users WHERE LOWER(email)=LOWER($1) FOR UPDATE",
      [input.email],
    );
    const user = result.rows[0];
    if (!user || !user.is_active)
      throw new ErrorHandler("Email hoặc mật khẩu không đúng", 401);
    user.role = user.role?.toLowerCase();
    if (
      user.is_locked ||
      (user.locked_until && new Date(user.locked_until) > new Date())
    )
      throw new ErrorHandler("Tài khoản đang bị khóa", 423);
    if (!(await verifyPassword(input.password, user.password_hash))) {
      const failures = user.failed_login_attempts + 1;
      const locked = failures >= MAX_FAILURES;
      await client.query(
        "UPDATE users SET failed_login_attempts=$2,is_locked=$3,locked_until=CASE WHEN $3 THEN NOW()+INTERVAL '30 minutes' ELSE NULL END WHERE id=$1",
        [user.id, failures, locked],
      );
      const loginError = new ErrorHandler(
        locked
          ? "Tài khoản đã bị khóa do đăng nhập sai nhiều lần"
          : "Email hoặc mật khẩu không đúng",
        locked ? 423 : 401,
      );
      loginError.commitTransaction = true;
      throw loginError;
    }
    await client.query(
      "UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=$1",
      [user.id],
    );
    const maxDevices = user.role === "customer" ? 2 : 1;
    const active = await client.query(
      "SELECT id FROM user_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW() ORDER BY created_at",
      [user.id],
    );
    const count = Math.max(0, active.rowCount - maxDevices + 1);
    if (count)
      await client.query(
        "UPDATE user_sessions SET revoked_at=NOW() WHERE id=ANY($1::int[])",
        [active.rows.slice(0, count).map((row) => row.id)],
      );
    const session = await client.query(
      "INSERT INTO user_sessions(user_id,device_id,device_type,user_agent,ip_address,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '7 days') RETURNING id",
      [
        user.id,
        input.deviceId || null,
        input.deviceType || "unknown",
        input.userAgent || null,
        input.ipAddress || null,
      ],
    );
    const refreshToken = generateRefreshToken(user.id, session.rows[0].id);
    await client.query(
      "UPDATE user_sessions SET refresh_token_hash=$2 WHERE id=$1",
      [session.rows[0].id, hashToken(refreshToken)],
    );
    delete user.password_hash;
    return { user, accessToken: generateAccessToken(user), refreshToken };
  });
const refresh = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
  } catch (_) {
    throw new ErrorHandler("Refresh token không hợp lệ hoặc đã hết hạn", 401);
  }
  const { rows } = await database.query(
    "SELECT u.* FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.refresh_token_hash=$3 AND s.revoked_at IS NULL AND s.expires_at>NOW()",
    [payload.sessionId, payload.id, hashToken(token)],
  );
  if (!rows[0] || rows[0].is_locked || !rows[0].is_active)
    throw new ErrorHandler("Phiên đăng nhập không còn hiệu lực", 401);
  return { accessToken: generateAccessToken(rows[0]) };
};
const logout = async (token) => {
  if (token)
    await database.query(
      "UPDATE user_sessions SET revoked_at=NOW() WHERE refresh_token_hash=$1 AND revoked_at IS NULL",
      [hashToken(token)],
    );
};
const logoutAll = async (userId) =>
  database.query(
    "UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",
    [userId],
  );
const changePassword = (userId, currentPassword, newPassword) =>
  withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
      [userId],
    );
    if (
      !rows[0] ||
      !(await verifyPassword(currentPassword, rows[0].password_hash))
    )
      throw new ErrorHandler("Mật khẩu hiện tại không đúng", 400);
    await client.query(
      "UPDATE users SET password_hash=$2,password_changed_at=NOW(),updated_at=NOW() WHERE id=$1",
      [userId, await hashPassword(newPassword)],
    );
    await client.query(
      "UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",
      [userId],
    );
  });
const setLock = async (userId, locked) => {
  const { rows } = await database.query(
    "UPDATE users SET is_locked=$2,failed_login_attempts=0,locked_until=NULL,updated_at=NOW() WHERE id=$1 RETURNING id,email,is_locked",
    [userId, locked],
  );
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy người dùng", 404);
  if (locked) await logoutAll(userId);
  return rows[0];
};
module.exports = { login, refresh, logout, logoutAll, changePassword, setLock };
