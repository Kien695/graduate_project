const employeeService = require("../service/employee.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const actor = (req) => ({ userId: req.user.id, ipAddress: req.ip });
const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy danh sách nhân viên thành công",
    await employeeService.list(req.query),
  ),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy thông tin nhân viên thành công",
    await employeeService.getById(req.params.id),
  ),
);
const create = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    201,
    "Tạo nhân viên và tài khoản thành công",
    await employeeService.create(req.body, actor(req)),
  ),
);
const update = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật nhân viên thành công",
    await employeeService.update(req.params.id, req.body, actor(req)),
  ),
);
const remove = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã vô hiệu hóa tài khoản nhân viên",
    await employeeService.deactivate(req.params.id, actor(req)),
  ),
);
const updateSecurityLevel = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Gán nhãn bảo mật thành công",
    await employeeService.setSecurityLevel(
      req.params.id,
      req.body.securityLevelId ?? req.body.security_level_id,
      actor(req),
    ),
  ),
);

module.exports = { list, get, create, update, remove, updateSecurityLevel };
