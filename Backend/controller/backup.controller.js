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
  const result = await s.restore(req.params.id, req.user.id, req.ip);
  await require("../service/backupScheduler.service").start();
  return successResponse(
    res,
    200,
    "Restore thành công",
    result,
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
const settings = catchAsyncError(async (req, res) => successResponse(res, 200, "Lịch sao lưu", {
  ...await require("../service/backupSettings.service").get(),
  next_run: require("../service/backupScheduler.service").getNextRun(),
}));
const saveSettings = catchAsyncError(async (req, res) => {
  const config = await require("../service/backupSettings.service").save(req.body, req.user, req.ip);
  const scheduler = require("../service/backupScheduler.service");
  await scheduler.start();
  return successResponse(res, 200, "Đã lưu lịch sao lưu", { ...config, next_run: scheduler.getNextRun() });
});
module.exports = { list, history, get, create, restore, retention, settings, saveSettings };
