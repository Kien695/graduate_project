const { database } = require("../database/database");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const getById = async (id) => {
  const { rows } = await database.query("SELECT id,email,full_name,phone,avatar_url,role,security_level_id,is_locked,is_active,last_login_at,created_at,updated_at FROM users WHERE id=$1", [id]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy người dùng", 404);
  return rows[0];
};
const updateMe = async (id, input) => {
  const { rows } = await database.query("UPDATE users SET full_name=COALESCE($2,full_name),phone=COALESCE($3,phone),avatar_url=COALESCE($4,avatar_url),updated_at=NOW() WHERE id=$1 RETURNING id,email,full_name,phone,avatar_url,role,security_level_id,updated_at", [id, input.fullName || null, input.phone || null, input.avatarUrl || null]);
  return rows[0];
};
const setSecurityLevel = async (id, securityLevelId) => {
  const { rows } = await database.query("UPDATE users SET security_level_id=$2,updated_at=NOW() WHERE id=$1 RETURNING id,email,security_level_id", [id, securityLevelId]);
  if (!rows[0]) throw new ErrorHandler("Không tìm thấy người dùng", 404);
  return rows[0];
};
module.exports = { getById, updateMe, setSecurityLevel };
