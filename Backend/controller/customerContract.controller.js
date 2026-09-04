const service = require("../service/customerContract.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new ErrorHandler("Contract id không hợp lệ", 400);
  return id;
};

const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy danh sách hợp đồng thành công",
    await service.list(req.user.id),
  ),
);

const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy hợp đồng thành công",
    await service.get(parseId(req.params.id), req.user.id),
  ),
);

const confirm = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Xác nhận hợp đồng thành công",
    await service.confirm(parseId(req.params.id), req.user.id, req.ip),
  ),
);

module.exports = { list, get, confirm };
