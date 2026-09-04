const service = require("../service/customerOrder.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");

const create = catchAsyncError(async (req, res) => {
  const vehicleId = Number(req.body.vehicle_id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0)
    throw new ErrorHandler("vehicle_id không hợp lệ", 400, [
      { field: "vehicle_id", message: "vehicle_id phải là số nguyên dương" },
    ]);
  return successResponse(
    res,
    201,
    "Đặt hàng thành công",
    await service.create(vehicleId, req.user.id),
  );
});

const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy danh sách đơn hàng thành công",
    await service.list(req.user.id),
  ),
);

module.exports = { create, list };
