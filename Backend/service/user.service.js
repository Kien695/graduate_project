const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const {
  encryptProfileValue,
  decryptProfileValue,
} = require("../utils/profileEncryption");

const getById = async (id) => {
  const { rows } = await database.query(
    `SELECT id,email,email_encrypted,full_name,phone,phone_encrypted,
       avatar_url,role,security_level_id,is_locked,is_active,last_login_at,
       created_at,updated_at FROM users WHERE id=$1`,
    [id],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay nguoi dung", 404);
  const user = rows[0];
  if (String(user.role).toLowerCase() === "customer") {
    user.email = decryptProfileValue(user.email_encrypted) || user.email;
    user.phone = decryptProfileValue(user.phone_encrypted) || user.phone;
  }
  delete user.email_encrypted;
  delete user.phone_encrypted;
  return user;
};

const updateMe = async (id, input) => {
  const current = await database.query("SELECT role FROM users WHERE id=$1", [id]);
  if (!current.rows[0]) throw new ErrorHandler("Khong tim thay nguoi dung", 404);
  const customer = String(current.rows[0].role).toLowerCase() === "customer";
  const encryptedPhone =
    customer && input.phone !== undefined
      ? encryptProfileValue(input.phone)
      : null;
  await database.query(
    `UPDATE users SET full_name=COALESCE($2,full_name),
       phone=CASE WHEN $5 THEN NULL ELSE COALESCE($3,phone) END,
       phone_encrypted=CASE WHEN $5 THEN COALESCE($4,phone_encrypted) ELSE phone_encrypted END,
       avatar_url=COALESCE($6,avatar_url),updated_at=NOW() WHERE id=$1`,
    [id,input.fullName || null,input.phone || null,encryptedPhone,customer,input.avatarUrl || null],
  );
  if (customer && input.phone !== undefined)
    await database.query(
      "UPDATE customers SET phone=NULL,phone_encrypted=$2,updated_at=NOW() WHERE user_id=$1",
      [id, encryptedPhone],
    );
  return getById(id);
};

const setSecurityLevel = async (id, securityLevelId) => {
  const { rows } = await database.query(
    "UPDATE users SET security_level_id=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,security_level_id",
    [id, securityLevelId],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay nguoi dung", 404);
  return rows[0];
};

module.exports = { getById, updateMe, setSecurityLevel };
