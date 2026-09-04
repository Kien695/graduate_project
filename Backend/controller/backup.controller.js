const s = require("../service/backup.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const list = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy danh sách backup thành công", await s.list()),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy backup thành công",
    await s.get(req.params.id),
  ),
);
const history = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy lịch sử backup thành công", await s.history()),
);
const create = catchAsyncError(async (req, res) =>
  successResponse(res, 201, "Backup thành công", await s.create(req.user.id)),
);
const restore = catchAsyncError(async (req, res) => {
  if (req.body.confirm !== true)
    throw new ErrorHandler("Phải xác nhận restore bằng confirm=true", 400);
  return successResponse(
    res,
    200,
    "Restore thành công",
    await s.restore(req.params.id, req.user.id, req.ip),
  );
});
const retention = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Áp dụng retention thành công",
    await s.enforceRetention(),
  ),
);
module.exports = { list, history, get, create, restore, retention };
