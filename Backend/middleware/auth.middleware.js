const jwt = require("jsonwebtoken");
const { database } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

const auth = catchAsyncError(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : req.cookies?.accessToken;
  if (!token) return next(new ErrorHandler("Thiếu access token", 401));
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
  } catch (error) {
    return next(
      new ErrorHandler(
        error.name === "TokenExpiredError"
          ? "Access token đã hết hạn"
          : "Access token không hợp lệ",
        401,
      ),
    );
  }
  if (!decoded.userId || !decoded.sessionId)
    return next(new ErrorHandler("Access token khong gan voi phien dang nhap", 401));
  const { rows } = await database.query(
    `UPDATE user_sessions s SET last_activity_at=NOW()
     FROM users u
     WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL
       AND s.expires_at>NOW() AND u.id=s.user_id
     RETURNING u.id,u.email,u.full_name,u.role,u.security_level_id,
       u.is_locked,u.is_active,s.id session_id,s.device_id,s.device_type`,
    [decoded.sessionId, decoded.userId],
  );
  if (!rows[0])
    return next(new ErrorHandler("Phien dang nhap khong con hieu luc", 401));
  if (!rows[0].is_active || rows[0].is_locked)
    return next(new ErrorHandler("Tai khoan khong kha dung", 401));
  req.user = rows[0];
  req.user.role = req.user.role?.toLowerCase();
  next();
});
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return next(
        new ErrorHandler("Bạn không có quyền thực hiện thao tác này", 403),
      );
    next();
  };
module.exports = { auth, authorize };
