const { database } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

const enforceContractRead = catchAsyncError(async (req, res, next) => {
  if (req.user.role === "admin") return next();
  const { rows } = await database.query(
    `SELECT us.rank user_rank,os.rank object_rank FROM users u
    LEFT JOIN security_levels us ON us.id=u.security_level_id CROSS JOIN contracts c
    LEFT JOIN security_levels os ON os.id=c.security_level_id WHERE u.id=$1 AND c.id=$2`,
    [req.user.id, req.params.id],
  );
  if (!rows[0]) return next(new ErrorHandler("Không tìm thấy hợp đồng", 404));
  if ((rows[0].user_rank ?? 0) < (rows[0].object_rank ?? 0))
    return next(new ErrorHandler("MAC policy từ chối truy cập", 403));
  if (req.user.role === "customer") {
    const owner = await database.query(
      "SELECT 1 FROM contracts ct JOIN orders o ON o.id=ct.order_id JOIN customers c ON c.id=o.customer_id WHERE ct.id=$1 AND c.user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!owner.rows[0])
      return next(
        new ErrorHandler("Bạn không có quyền truy cập hợp đồng này", 403),
      );
  }
  next();
});
module.exports = { enforceContractRead };
