const s = require("../service/inspection.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy kiểm định thành công", await s.list()),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy kiểm định thành công",
    await s.get(req.params.id),
  ),
);
const create = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    201,
    "Tạo kiểm định thành công",
    await s.create(req.body, req.user),
  ),
);
const update = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật kiểm định thành công",
    await s.update(req.params.id, req.body),
  ),
);
const action = (x) =>
  catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Cập nhật kết quả thành công",
      await s.setStatus(req.params.id, x, req.user, req.ip),
    ),
  );
const images = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    201,
    "Upload ảnh thành công",
    await s.addImages(req.params.id, req.files),
  ),
);
module.exports = {
  list,
  get,
  create,
  update,
  pass: action("passed"),
  fail: action("failed"),
  images,
};
