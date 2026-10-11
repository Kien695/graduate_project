const service = require("../service/dashboard.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const overview = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy dữ liệu Dashboard thành công", await service.getOverview()),
);

module.exports = { overview };
