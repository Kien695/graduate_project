const { database } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

const getSubjectRank = async (userId) => {
  const { rows } = await database.query(
    `SELECT COALESCE(sl.rank,0) rank FROM users u
     LEFT JOIN security_levels sl ON sl.id=u.security_level_id WHERE u.id=$1`,
    [userId],
  );
  if (!rows[0]) throw new ErrorHandler("Khong tim thay subject MAC", 401);
  return Number(rows[0].rank);
};

const enforceContractAccess = catchAsyncError(async (req, res, next) => {
  const { rows } = await database.query(
    `SELECT COALESCE(us.rank,0) user_rank,COALESCE(os.rank,0) object_rank
     FROM users u
     LEFT JOIN security_levels us ON us.id=u.security_level_id
     CROSS JOIN contracts c
     LEFT JOIN security_levels os ON os.id=c.security_level_id
     WHERE u.id=$1 AND c.id=$2`,
    [req.user.id, req.params.id],
  );
  if (!rows[0]) return next(new ErrorHandler("Khong tim thay hop dong", 404));
  if (Number(rows[0].user_rank) < Number(rows[0].object_rank))
    return next(new ErrorHandler("MAC policy tu choi truy cap", 403));
  if (req.user.role === "customer") {
    const owner = await database.query(
      `SELECT 1 FROM contracts ct JOIN orders o ON o.id=ct.order_id
       JOIN customers c ON c.id=o.customer_id
       WHERE ct.id=$1 AND c.user_id=$2`,
      [req.params.id, req.user.id],
    );
    if (!owner.rows[0])
      return next(new ErrorHandler("Khong co quyen truy cap hop dong nay", 403));
  }
  next();
});

const enforceRequestedLevel = (readLevel) =>
  catchAsyncError(async (req, res, next) => {
    const levelId = readLevel(req) || req.user.security_level_id;
    if (!levelId)
      return next(new ErrorHandler("Nhan bao mat la bat buoc", 400));
    const [{ rows }, subjectRank] = await Promise.all([
      database.query("SELECT rank FROM security_levels WHERE id=$1", [levelId]),
      getSubjectRank(req.user.id),
    ]);
    if (!rows[0]) return next(new ErrorHandler("Nhan bao mat khong hop le", 400));
    if (subjectRank < Number(rows[0].rank))
      return next(new ErrorHandler("MAC policy tu choi classification nay", 403));
    next();
  });

const enforceContractCreate = enforceRequestedLevel(
  (req) => req.body.security_level_id ?? req.body.securityLevelId,
);
const enforceContractSecurityChange = enforceRequestedLevel(
  (req) => req.body.securityLevelId ?? req.body.security_level_id,
);

module.exports = {
  enforceContractAccess,
  enforceContractRead: enforceContractAccess,
  enforceContractCreate,
  enforceContractSecurityChange,
};
