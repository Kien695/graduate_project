const s = require("../service/inspection.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const { ErrorHandler } = require("../middleware/errorMiddleware");
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
const start = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Bắt đầu kiểm định thành công",
    await s.start(req.params.id, req.user, req.ip),
  ),
);
const checklist = catchAsyncError(async (req, res) => {
  if (!Array.isArray(req.body.checklist))
    throw new ErrorHandler("Checklist phải là một danh sách", 400);
  const normalized = req.body.checklist.map((item, index) => ({
    key: String(item.key || `item_${index + 1}`),
    label: String(item.label || "").trim(),
    checked: Boolean(item.checked),
    note: String(item.note || "").trim(),
  }));
  if (!normalized.length || normalized.some((item) => !item.label))
    throw new ErrorHandler("Checklist phải có ít nhất một hạng mục hợp lệ", 400);
  return successResponse(
    res,
    200,
    "Cập nhật checklist thành công",
    await s.updateChecklist(req.params.id, normalized, req.body.notes, req.user, req.ip),
  );
});
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
    await s.addImages(req.params.id, req.files, req.user),
  ),
);
const removeImage = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Xóa ảnh kiểm định thành công",
    await s.removeImage(req.params.id, req.params.imageId),
  ),
);
module.exports = {
  list,
  get,
  create,
  update,
  start,
  checklist,
  pass: action("passed"),
  fail: action("failed"),
  images,
  removeImage,
};
