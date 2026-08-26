const vehicleService = require('../service/vehicle.service');
const { catchAsyncError } = require('../middleware/catchAsyncError');
const { successResponse } = require('../utils/response');

const list = catchAsyncError(async (req, res) =>
  successResponse(res, 200, 'Lấy danh sách xe thành công', await vehicleService.list()),
);

const getById = catchAsyncError(async (req, res) =>
  successResponse(res, 200, 'Lấy thông tin xe thành công', await vehicleService.getById(req.params.id)),
);

module.exports = { list, getById };
