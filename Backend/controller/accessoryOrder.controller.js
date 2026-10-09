const service = require("../service/accessoryOrder.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy đơn hàng phụ kiện thành công",
    await service.list(req.user),
  ),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy đơn hàng phụ kiện thành công",
    await service.get(req.params.id, req.user),
  ),
);
const action = (status) =>
  catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Cập nhật đơn hàng phụ kiện thành công",
      await service.transition(req.params.id, status, req.user),
    ),
  );
module.exports = {
  list,
  get,
  confirm: action("confirmed"),
  ship: action("shipping"),
  cancel: action("cancelled"),
  complete: action("completed"),
};
