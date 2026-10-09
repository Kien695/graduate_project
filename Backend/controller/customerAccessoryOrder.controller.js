const service = require("../service/customerAccessoryOrder.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");

const create = catchAsyncError(async (req, res) => {
  const accessoryId = Number(req.body.accessory_id);
  if (!Number.isInteger(accessoryId) || accessoryId <= 0)
    throw new ErrorHandler("accessory_id không hợp lệ", 400, [
      { field: "accessory_id", message: "accessory_id phải là số nguyên dương" },
    ]);
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new ErrorHandler("quantity không hợp lệ", 400, [
      { field: "quantity", message: "quantity phải là số nguyên dương" },
    ]);
  return successResponse(
    res,
    201,
    "Đặt phụ kiện thành công",
    await service.create(accessoryId, quantity, req.user.id),
  );
});

const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy danh sách đơn hàng phụ kiện thành công",
    await service.list(req.user.id),
  ),
);

const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy đơn hàng phụ kiện thành công",
    await service.get(req.params.id, req.user.id),
  ),
);

const cancel = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã hủy đơn hàng phụ kiện",
    await service.cancel(req.params.id, req.user.id),
  ),
);

module.exports = { create, list, get, cancel };
