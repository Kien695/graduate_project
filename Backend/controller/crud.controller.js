const crud = require("../service/crud.service");
const audit = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const uploader = require("../service/upload.service");

const imageConfig = {
  vehicles: { folder: "auto-dealer/vehicles" },
  accessories: { folder: "auto-dealer/accessories" },
};
const parseImages = (images) => {
  if (Array.isArray(images)) return images;
  if (typeof images !== "string") return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const uploadRequestImages = (table, files) =>
  uploader.uploadMany(files, imageConfig[table]?.folder);

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
    const uploaded = await uploadRequestImages(table, req.files || []);
    let data;
    try {
      data = await crud.create(table, {
        ...req.body,
        ...(uploaded.length ? { images: JSON.stringify(uploaded) } : {}),
      });
    } catch (error) {
      await Promise.allSettled([uploader.destroyImages(uploaded)]);
      throw error;
    }
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
    const uploaded = await uploadRequestImages(table, req.files || []);
    let data;
    try {
      const images = [...parseImages(old.images), ...uploaded];
      data = await crud.update(table, req.params.id, {
        ...req.body,
        ...(uploaded.length ? { images: JSON.stringify(images) } : {}),
      });
    } catch (error) {
      await Promise.allSettled([uploader.destroyImages(uploaded)]);
      throw error;
    }
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
    if (imageConfig[table]) await uploader.destroyImages(parseImages(old.images));
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
