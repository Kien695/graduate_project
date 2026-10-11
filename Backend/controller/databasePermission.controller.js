const service = require("../service/databasePermission.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const get = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy quyền PostgreSQL thành công", await service.read(req.params.id)));
const update = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Cập nhật quyền PostgreSQL thành công", await service.update(req.params.id, req.body?.features)));
module.exports = { get, update };

