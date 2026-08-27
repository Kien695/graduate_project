const crud = require("../service/crud.service");
const audit = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const uploader = require("../service/upload.service");
const storageQuota = require("../service/storageQuota.service");

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
const auditValues = (table, data) => {
  if (table !== "customers" || !data) return data;
  const safe = { ...data };
  for (const field of ["cccd", "email", "phone", "address"])
    if (field in safe) safe[field] = "[ENCRYPTED]";
  return safe;
};

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
    const files = req.files || [];
    const reservation = await storageQuota.reserveForUser(
      req.user,
      files.reduce((total, file) => total + Number(file.size || 0), 0),
    );
    let uploaded = [];
    let data;
    try {
      uploaded = storageQuota.tagImages(await uploadRequestImages(table, files), reservation);
      data = await crud.create(table, {
        ...req.body,
        ...(uploaded.length ? { images: JSON.stringify(uploaded) } : {}),
      });
    } catch (error) {
      await Promise.allSettled([
        uploader.destroyImages(uploaded),
        storageQuota.releaseReservation(reservation),
      ]);
      throw error;
    }
    await audit.record(null, {
      userId: req.user?.id,
      action: "CREATE",
      entityType: table,
      entityId: data.id,
      newValues: auditValues(table, data),
      ipAddress: req.ip,
    });
    return successResponse(res, 201, "Tạo dữ liệu thành công", data);
  }),
  update: catchAsyncError(async (req, res) => {
    const old = await crud.get(table, req.params.id);
    const files = req.files || [];
    const reservation = await storageQuota.reserveForUser(
      req.user,
      files.reduce((total, file) => total + Number(file.size || 0), 0),
    );
    let uploaded = [];
    let data;
    try {
      uploaded = storageQuota.tagImages(await uploadRequestImages(table, files), reservation);
      const images = [...parseImages(old.images), ...uploaded];
      data = await crud.update(table, req.params.id, {
        ...req.body,
        ...(uploaded.length ? { images: JSON.stringify(images) } : {}),
      });
    } catch (error) {
      await Promise.allSettled([
        uploader.destroyImages(uploaded),
        storageQuota.releaseReservation(reservation),
      ]);
      throw error;
    }
    await audit.record(null, {
      userId: req.user?.id,
      action: "UPDATE",
      entityType: table,
      entityId: data.id,
      oldValues: auditValues(table, old),
      newValues: auditValues(table, data),
      ipAddress: req.ip,
    });
    return successResponse(res, 200, "Cập nhật thành công", data);
  }),
  remove: catchAsyncError(async (req, res) => {
    const old = await crud.get(table, req.params.id);
    if (imageConfig[table]) await uploader.destroyImages(parseImages(old.images));
    const data = await crud.remove(table, req.params.id);
    if (imageConfig[table]) await storageQuota.releaseImages(parseImages(old.images));
    await audit.record(null, {
      userId: req.user?.id,
      action: "DELETE",
      entityType: table,
      entityId: req.params.id,
      oldValues: auditValues(table, old),
      ipAddress: req.ip,
    });
    return successResponse(res, 200, "Xóa dữ liệu thành công", data);
  }),
  removeImage: catchAsyncError(async (req, res) => {
    if (!imageConfig[table]) throw new Error("Resource khong ho tro hinh anh");
    const old = await crud.get(table, req.params.id);
    const images = parseImages(old.images);
    const image = images.find((item) => item.public_id === req.body.public_id);
    if (!image) {
      const { ErrorHandler } = require("../middleware/errorMiddleware");
      throw new ErrorHandler("Không tìm thấy ảnh", 404);
    }
    await uploader.destroyImage(image.public_id);
    const data = await crud.update(table, req.params.id, {
      images: JSON.stringify(images.filter((item) => item.public_id !== image.public_id)),
    });
    await storageQuota.releaseImages([image]);
    await audit.record(null, {
      userId: req.user?.id,
      action: "DELETE_IMAGE",
      entityType: table,
      entityId: req.params.id,
      oldValues: { image },
      newValues: { imageCount: images.length - 1 },
      ipAddress: req.ip,
    });
    return successResponse(res, 200, "Xóa ảnh thành công", data);
  }),
});
module.exports = { makeCrudController };
