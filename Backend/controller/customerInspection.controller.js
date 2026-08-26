const service = require('../service/customerInspection.service');
const { catchAsyncError } = require('../middleware/catchAsyncError');
const { ErrorHandler } = require('../middleware/errorMiddleware');
const { successResponse } = require('../utils/response');

const getByOrder = catchAsyncError(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0)
    throw new ErrorHandler('Order id không hợp lệ', 400);
  return successResponse(
    res,
    200,
    'Lấy trạng thái kiểm định thành công',
    await service.getByOrder(orderId, req.user.id),
  );
});

module.exports = { getByOrder };
