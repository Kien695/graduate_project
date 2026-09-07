const s = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const all = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy audit log thành công",
    await s.list(req.query, req.user),
  ),
);
const contracts = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy audit hợp đồng thành công",
    await s.list({
      ...req.query,
      entityType: "contract",
      entityId: req.params.id,
    }, req.user),
  ),
);
const users = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy hoạt động người dùng thành công",
    await s.list({ ...req.query, userId: req.params.id }, req.user),
  ),
);
module.exports = { all, contracts, users };
