const { database, systemDatabase } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

// RBAC is enforced by routes; MAC always reads current labels from the database.
const enforceContractAccess = catchAsyncError(async (req, res, next) => {
  const { rows } = await database.query(
    `SELECT us.rank >= os.rank AS level_ok
     FROM users u
     JOIN security_levels us ON us.id=u.security_level_id
     CROSS JOIN contracts c
     JOIN security_levels os ON os.id=c.security_level_id
     WHERE u.id=$1 AND c.id=$2`,
    [req.user.id, req.params.id],
  );
  if (!rows[0]?.level_ok)
    return next(new ErrorHandler("MAC policy tu choi truy cap", 403));
  if (req.user.role === "customer") {
    const owner = await database.query(
      `SELECT 1 FROM contracts c JOIN orders o ON o.id=c.order_id
       JOIN customers cu ON cu.id=o.customer_id
       WHERE c.id=$1 AND cu.user_id=$2
         AND UPPER(c.status) IN ('APPROVED','SIGNED','COMPLETED')`,
      [req.params.id, req.user.id],
    );
    if (!owner.rows[0])
      return next(new ErrorHandler("Khong tim thay hop dong", 404));
  }
  next();
});

const loadMacSecurityAdmin = catchAsyncError(async (req, res, next) => {
  const { rows } = await systemDatabase.query(
    `SELECT COALESCE(u.can_manage_contract_mac, FALSE)
       OR ($2::text IS NOT NULL AND pg_has_role($2, 'contract_security_admin', 'MEMBER')) AS allowed
     FROM users u WHERE u.id=$1`,
    [req.user.id, req.user.db_user || null],
  );
  req.macSecurityAdmin = rows[0]?.allowed === true;
  next();
});

const requireMacSecurityAdmin = (req, res, next) => {
  if (!req.macSecurityAdmin)
    return next(new ErrorHandler("Tai khoan khong co quyen quan tri MAC", 403));
  next();
};

const rejectContractCreateClassification = (req, res, next) => {
  if (
    Object.prototype.hasOwnProperty.call(req.body || {}, "securityLevelId") ||
    Object.prototype.hasOwnProperty.call(req.body || {}, "security_level_id")
  )
    return next(new ErrorHandler("Nhan MAC cua hop dong duoc he thong tu dong gan INTERNAL", 400));
  next();
};

const enforceRequestedClassification = catchAsyncError(async (req, res, next) => {
  const subject = await database.query(
    `SELECT u.security_level_id,sl.rank FROM users u
     JOIN security_levels sl ON sl.id=u.security_level_id WHERE u.id=$1`,
    [req.user.id],
  );
  if (!subject.rows[0])
    return next(new ErrorHandler("Nguoi dung chua co nhan MAC hop le", 403));
  const levelId = Number(req.body.securityLevelId ?? req.body.security_level_id);
  if (!Number.isInteger(levelId) || levelId <= 0)
    return next(new ErrorHandler("Nhan bao mat khong hop le", 400));
  const target = await database.query("SELECT rank FROM security_levels WHERE id=$1", [levelId]);
  if (!target.rows[0])
    return next(new ErrorHandler("Nhan bao mat khong hop le", 400));
  if (subject.rows[0].rank < target.rows[0].rank)
    return next(new ErrorHandler("MAC policy tu choi muc bao mat nay", 403));
  req.macClassification = { levelId };
  next();
});

module.exports = {
  enforceContractAccess,
  enforceContractRead: enforceContractAccess,
  loadMacSecurityAdmin,
  requireMacSecurityAdmin,
  enforceContractCreate: rejectContractCreateClassification,
  enforceContractSecurityChange: enforceRequestedClassification,
};
