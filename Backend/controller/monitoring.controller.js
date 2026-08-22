const s = require("../service/monitoring.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");
const wrap = (message, fn) =>
  catchAsyncError(async (req, res) => successResponse(res, 200, message, fn()));
const configure = catchAsyncError(async (req, res) => {
  for (const k of ["cpuThreshold", "memoryThreshold", "loadThreshold"])
    if (!Number.isFinite(Number(req.body[k])) || Number(req.body[k]) < 0)
      throw new ErrorHandler(`${k} không hợp lệ`, 400);
  return successResponse(
    res,
    200,
    "Cấu hình cảnh báo thành công",
    await s.configure(req.body, req.user.id),
  );
});
module.exports = {
  status: wrap("Lấy trạng thái server thành công", s.status),
  cpu: wrap("Lấy CPU thành công", s.cpu),
  memory: wrap("Lấy memory thành công", s.memory),
  load: wrap("Lấy server load thành công", s.load),
  configure,
};
