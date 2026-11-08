const { systemDatabase } = require("../database/database");
const { ErrorHandler } = require("./errorMiddleware");
const { catchAsyncError } = require("./catchAsyncError");

const GROUPS = Object.freeze({ EMPLOYEE: "nhanvien", LEADER: "truongnhom", DIRECTOR: "giamdoc", INSPECTOR: "kiemdinh" });

const loadContractGroup = catchAsyncError(async (req, res, next) => {
  const { rows } = await systemDatabase.query(
    `SELECT LOWER(g.name) permission_group, e.id employee_id
       FROM employees e LEFT JOIN permission_groups g ON g.id=e.permission_group_id
      WHERE e.user_id=$1`, [req.user.id]);
  req.contractActor = { group: rows[0]?.permission_group || null, employeeId: rows[0]?.employee_id || null };
  next();
});

const requireGroup = (...groups) => (req, res, next) => {
  if (!groups.includes(req.contractActor?.group))
    return next(new ErrorHandler("Nhóm quyền không được thực hiện thao tác hợp đồng này", 403));
  next();
};

module.exports = { GROUPS, loadContractGroup, requireGroup };
