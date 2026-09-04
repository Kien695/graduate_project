const service = require("../service/contract.service");
const audit = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy hợp đồng thành công",
    await service.list(req.user),
  ),
);
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy hợp đồng thành công",
    await service.get(req.params.id),
  ),
);
const create = catchAsyncError(async (req, res) => {
  if (!req.body.order_id) throw new ErrorHandler("order_id là bắt buộc", 400);
  return successResponse(
    res,
    201,
    "Tạo hợp đồng thành công",
    await service.create(req.body, req.macClassification, req.user, req.ip),
  );
});
const update = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật hợp đồng thành công",
    await service.update(req.params.id, req.body, req.user, req.ip),
  ),
);
const action = (status) =>
  catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Cập nhật hợp đồng thành công",
      await service.setStatus(req.params.id, status, req.user, req.ip),
    ),
  );
const payment = catchAsyncError(async (req, res) => {
  if (!req.body.amount) throw new ErrorHandler("amount là bắt buộc", 400);
  return successResponse(
    res,
    201,
    "Thanh toán thành công",
    await service.addPayment(req.params.id, req.body, req.user, req.ip),
  );
});
const logs = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy audit log thành công",
    await audit.list({
      entityType: "contract",
      entityId: req.params.id,
      ...req.query,
    }),
  ),
);
const security = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật nhãn bảo mật thành công",
    await service.setSecurityLevel(req.params.id, req.macClassification, req.user, req.ip),
  ),
);
module.exports = {
  list,
  get,
  create,
  update,
  approve: action("approved"),
  sign: action("signed"),
  remove: action("cancelled"),
  payment,
  logs,
  security,
};
