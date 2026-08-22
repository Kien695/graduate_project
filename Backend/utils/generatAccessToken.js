const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => jwt.sign(
  { id: user.id, role: user.role, securityLevelId: user.security_level_id },
  process.env.SECRET_KEY_ACCESS_TOKEN,
  { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" },
);
module.exports = { generateAccessToken };
