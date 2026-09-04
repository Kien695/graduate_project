const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { database, withTransaction } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { verifyPassword, hashPassword } = require("../utils/password");
const { hashToken } = require("../utils/token");
const { generateAccessToken } = require("../utils/generatAccessToken");
const { generateRefreshToken } = require("../utils/generateRefreshToken");
const sessionActivity = require("./sessionActivity.service");
const {
  encryptProfileValue,
  decryptProfileValue,
  emailLookupHash,
} = require("../utils/profileEncryption");
const MAX_FAILURES = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);

const normalizeDeviceType = (deviceType, userAgent = "") => {
  const requested = String(deviceType || "")
    .trim()
    .toUpperCase();
  if (["PC", "MOBILE"].includes(requested)) return requested;
  return /android|iphone|ipad|mobile/i.test(userAgent) ? "MOBILE" : "PC";
};

const registerCustomer = async (input) => {
  try {
    return await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM users
         WHERE email_lookup_hash=$1 OR LOWER(email)=LOWER($2) LIMIT 1`,
        [emailLookupHash(input.email), input.email],
      );
      if (existing.rows[0])
        throw new ErrorHandler("Email đã tồn tại", 409, [
          { field: "email", message: "Email này đã được sử dụng" },
        ]);

      const passwordHash = await hashPassword(input.password);
      const encryptedEmail = encryptProfileValue(input.email);
      const encryptedPhone = encryptProfileValue(input.phone);
      const lookupHash = emailLookupHash(input.email);
      const { rows } = await client.query(
        `INSERT INTO users(
           username,password_hash,role,email,phone,email_encrypted,phone_encrypted,
           email_lookup_hash,full_name,status,is_active,is_locked,failed_login_attempts
         ) VALUES($1,$2,'CUSTOMER',NULL,NULL,$3,$4,$5,$6,'ACTIVE',TRUE,FALSE,0)
         RETURNING id`,
        [
          `customer-${crypto.randomUUID()}`,
          passwordHash,
          encryptedEmail,
          encryptedPhone,
          lookupHash,
          input.name,
        ],
      );
      const customer = await client.query(
        `INSERT INTO customers(
           user_id,full_name,email,phone,email_encrypted,phone_encrypted,is_active
         ) VALUES($1,$2,NULL,NULL,$3,$4,TRUE) RETURNING id`,
        [rows[0].id, input.name, encryptedEmail, encryptedPhone],
      );
      await client.query(
        `INSERT INTO customer_storage(customer_id,quota_mb,used_mb)
         VALUES($1,$2,0) ON CONFLICT(customer_id) DO NOTHING`,
        [
          customer.rows[0].id,
          Number(process.env.CUSTOMER_STORAGE_QUOTA_MB || 500),
        ],
      );
    });
  } catch (error) {
    if (error.code === "23505")
      throw new ErrorHandler("Email đã tồn tại", 409, [
        { field: "email", message: "Email này đã được sử dụng" },
      ]);
    throw error;
  }
};

const login = (input) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM users
       WHERE email_lookup_hash=$1 OR LOWER(email)=LOWER($2)
       FOR UPDATE`,
      [emailLookupHash(input.email), input.email],
    );
    const user = result.rows[0];
    if (!user || !user.is_active)
      throw new ErrorHandler("Email hoặc mật khẩu không đúng", 401);
    user.role = user.role?.toLowerCase();
    if (
      user.is_locked &&
      user.locked_until &&
      new Date(user.locked_until) <= new Date()
    ) {
      await client.query(
        `UPDATE users SET is_locked=FALSE,failed_login_attempts=0,
           failed_login_count=0,locked_until=NULL,updated_at=NOW()
         WHERE id=$1`,
        [user.id],
      );
      user.is_locked = false;
      user.failed_login_attempts = 0;
      user.failed_login_count = 0;
      user.locked_until = null;
    }
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
    if (user.role === "customer") {
      const profileResult = await client.query(
        `SELECT * FROM customers WHERE user_id=$1 FOR UPDATE`,
        [user.id],
      );
      const profile = profileResult.rows[0];
      const email =
        decryptProfileValue(user.email_encrypted) || user.email || input.email;
      const phone =
        decryptProfileValue(user.phone_encrypted) ||
        user.phone ||
        profile?.phone ||
        null;
      const encryptedEmail =
        user.email_encrypted ||
        profile?.email_encrypted ||
        encryptProfileValue(email);
      const encryptedPhone =
        user.phone_encrypted ||
        profile?.phone_encrypted ||
        encryptProfileValue(phone);
      await client.query(
        `UPDATE users SET username=$2,email=NULL,phone=NULL,email_encrypted=$3,
           phone_encrypted=$4,email_lookup_hash=$5,updated_at=NOW()
         WHERE id=$1`,
        [
          user.id,
          String(user.username || "").startsWith("customer-")
            ? user.username
            : `customer-${crypto.randomUUID()}`,
          encryptedEmail,
          encryptedPhone,
          emailLookupHash(email),
        ],
      );
      if (profile) {
        await client.query(
          `UPDATE customers SET email=NULL,phone=NULL,address=NULL,
             email_encrypted=$2,phone_encrypted=$3,
             address_encrypted=COALESCE(address_encrypted,$4),
             cccd_encrypted=COALESCE(cccd_encrypted,$5),updated_at=NOW()
           WHERE id=$1`,
          [
            profile.id,
            profile.email_encrypted || encryptedEmail,
            profile.phone_encrypted || encryptedPhone,
            encryptProfileValue(profile.address),
            encryptProfileValue(profile.cccd_encrypt),
          ],
        );
      }
      user.email = email;
      user.phone = phone;
    }
    await client.query(
      "UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=$1",
      [user.id],
    );
    const deviceType = normalizeDeviceType(input.deviceType, input.userAgent);
    if (user.role === "customer") {
      await client.query(
        `UPDATE user_sessions SET revoked_at=NOW()
         WHERE user_id=$1 AND device_type=$2
           AND revoked_at IS NULL AND expires_at>NOW()`,
        [user.id, deviceType],
      );
    } else {
      await client.query(
        `UPDATE user_sessions SET revoked_at=NOW()
         WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW()`,
        [user.id],
      );
    }
    const session = await client.query(
      `INSERT INTO user_sessions(
         user_id,device_id,device_type,user_agent,ip_address,last_activity_at,expires_at
       ) VALUES($1,$2,$3,$4,$5,NOW(),NOW()+INTERVAL '7 days') RETURNING id`,
      [
        user.id,
        input.deviceId || null,
        deviceType,
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
    delete user.email_encrypted;
    delete user.phone_encrypted;
    delete user.email_lookup_hash;
    return {
      user,
      accessToken: generateAccessToken(user, session.rows[0].id),
      refreshToken,
    };
  });
const refresh = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
  } catch (_) {
    throw new ErrorHandler("Refresh token không hợp lệ hoặc đã hết hạn", 401);
  }
  const user = await sessionActivity.touch({
    sessionId: payload.sessionId,
    userId: payload.id,
    refreshTokenHash: hashToken(token),
  });
  if (!user || user.is_locked || !user.is_active)
    throw new ErrorHandler("Phiên đăng nhập không còn hiệu lực", 401);
  return { accessToken: generateAccessToken(user, payload.sessionId) };
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
    if (await verifyPassword(newPassword, rows[0].password_hash))
      throw new ErrorHandler("Mật khẩu mới phải khác mật khẩu hiện tại", 400);
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
module.exports = {
  registerCustomer,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  setLock,
};
