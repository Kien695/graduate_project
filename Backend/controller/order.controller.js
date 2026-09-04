const service = require("../service/order.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy đơn hàng thành công",
    await service.list(req.user),
  ),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy đơn hàng thành công",
    await service.get(req.params.id, req.user),
  ),
);
const create = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    201,
    "Đặt xe thành công",
    await service.create(req.body, req.user),
  ),
);
const action = (status) =>
  catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Cập nhật đơn hàng thành công",
      await service.transition(req.params.id, status, req.user),
    ),
  );
const update = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật đơn hàng thành công",
    await service.update(req.params.id, req.body),
  ),
);
module.exports = {
  list,
  get,
  create,
  update,
  confirm: action("confirmed"),
  cancel: action("cancelled"),
  complete: action("completed"),
};
