const s = require("../service/backup.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
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
const create = catchAsyncError(async (req, res) =>
  successResponse(res, 201, "Backup thành công", await s.create(req.user.id)),
);
const restore = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Restore thành công",
    await s.restore(req.params.id),
  ),
);
module.exports = { list, get, create, restore };
