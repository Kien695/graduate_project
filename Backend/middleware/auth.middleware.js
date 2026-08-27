const jwt = require("jsonwebtoken");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");
const sessionActivity = require("../service/sessionActivity.service");

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
  const user = await sessionActivity.touch({
    sessionId: decoded.sessionId,
    userId: decoded.userId,
  });
  if (!user)
    return next(new ErrorHandler("Phien dang nhap khong con hieu luc", 401));
  if (!user.is_active || user.is_locked)
    return next(new ErrorHandler("Tai khoan khong kha dung", 401));
  req.user = user;
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
