const crud = require("../service/crud.service");
const audit = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const makeCrudController = (table) => ({
  list: catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Lấy danh sách thành công",
      await crud.list(table, req.query),
    ),
  ),
  get: catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Lấy dữ liệu thành công",
      await crud.get(table, req.params.id),
    ),
  ),
  create: catchAsyncError(async (req, res) => {
    const data = await crud.create(table, req.body);
    await audit.record(null, {
      userId: req.user?.id,
      action: "CREATE",
      entityType: table,
      entityId: data.id,
      newValues: data,
      ipAddress: req.ip,
    });
    return successResponse(res, 201, "Tạo dữ liệu thành công", data);
  }),
  update: catchAsyncError(async (req, res) => {
    const old = await crud.get(table, req.params.id);
    const data = await crud.update(table, req.params.id, req.body);
    await audit.record(null, {
      userId: req.user?.id,
      action: "UPDATE",
      entityType: table,
      entityId: data.id,
      oldValues: old,
      newValues: data,
      ipAddress: req.ip,
    });
    return successResponse(res, 200, "Cập nhật thành công", data);
  }),
  remove: catchAsyncError(async (req, res) => {
    const old = await crud.get(table, req.params.id);
    const data = await crud.remove(table, req.params.id);
    await audit.record(null, {
      userId: req.user?.id,
      action: "DELETE",
      entityType: table,
      entityId: req.params.id,
      oldValues: old,
      ipAddress: req.ip,
    });
    return successResponse(res, 200, "Xóa dữ liệu thành công", data);
  }),
});
module.exports = { makeCrudController };
