const service = require("../service/notification.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy danh sách thông báo thành công",
    await service.list(req.user.id),
  ),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy thông báo thành công",
    await service.get(req.params.id, req.user.id),
  ),
);
const markRead = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã đánh dấu thông báo đã đọc",
    await service.markRead(req.params.id, req.user.id),
  ),
);

module.exports = { list, get, markRead };
