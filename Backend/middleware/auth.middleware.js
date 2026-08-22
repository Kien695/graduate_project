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
  const { rows } = await database.query(
    "SELECT id,email,full_name,role,security_level_id,is_locked,is_active FROM users WHERE id=$1",
    [decoded.id],
  );
  if (!rows[0] || !rows[0].is_active || rows[0].is_locked)
    return next(new ErrorHandler("Tài khoản không khả dụng", 401));
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
