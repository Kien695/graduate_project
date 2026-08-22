class ErrorHandler extends Error {
  constructor(message, statusCode = 500, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
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
  if (["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT"].includes(err.code)) {
    statusCode = 400;
    message = "File upload vượt quá giới hạn";
  }
  if (process.env.NODE_ENV !== "production" && statusCode === 500)
    console.error(err);
  return res
    .status(statusCode)
    .json({ success: false, message, errors: err.details || [] });
};
module.exports = { ErrorHandler, ErrorMiddleware };
