const jwt = require("jsonwebtoken");
const generateRefreshToken = (userId, sessionId) => jwt.sign(
  { id: userId, sessionId },
  process.env.SECRET_KEY_REFRESH_TOKEN,
  { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" },
);
module.exports = { generateRefreshToken };
