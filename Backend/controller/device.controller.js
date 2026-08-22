const s = require("../service/device.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy thiết bị thành công",
    await s.list(req.user.id),
  ),
);
const remove = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đăng xuất thiết bị thành công",
    await s.remove(req.params.id, req.user.id),
  ),
);
const check = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Kiểm tra thiết bị thành công",
    await s.check(req.user),
  ),
);
module.exports = { list, remove, check };
