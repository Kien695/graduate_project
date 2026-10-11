class ErrorHandler extends Error {
  constructor(message, statusCode = 500, details = [], extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.extra = extra;
  }
}
const ErrorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  if (err.code === "23505") {
    statusCode = 409;
    message = "Dữ liệu đã tồn tại";
  }
  if (err.code === "23503") {
    statusCode = 409;
    message = "Dữ liệu đang được tham chiếu hoặc không tồn tại";
  }
  if (err.code === "22P02") {
    statusCode = 400;
    message = "Định dạng dữ liệu không hợp lệ";
  }
  if (err.code === "42501") {
    statusCode = 403;
    message = "Bạn không có quyền thực hiện thao tác này";
  }
  if (/password.*(weak|strength|complex|must|at least)/i.test(String(err.message || ""))) {
    statusCode = 400;
    message = "Mật khẩu PostgreSQL quá yếu, vui lòng đặt mật khẩu mạnh hơn";
  }
  if (err.code === "42710") {
    statusCode = 409;
    message = "Tên role PostgreSQL đã tồn tại";
  }
  if (["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT"].includes(err.code)) {
    statusCode = 400;
    message = "File upload vượt quá giới hạn";
  }
  if (process.env.NODE_ENV !== "production" && statusCode === 500)
    console.error(err);
  return res
    .status(statusCode)
    .json({
      success: false,
      message,
      errors: err.details || [],
      ...(err.extra || {}),
    });
};
module.exports = { ErrorHandler, ErrorMiddleware };
