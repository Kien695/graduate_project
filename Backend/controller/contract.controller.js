const service = require("../service/contract.service");
const audit = require("../service/auditLog.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");
const list = catchAsyncError(async (req, res) => {
  req.user.contractActor = req.contractActor;
  return successResponse(
    res,
    200,
    "Lấy hợp đồng thành công",
    await service.list(req.user),
  );
});
const get = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy hợp đồng thành công",
    await service.get(req.params.id, req.user, req.contractActor),
  ),
);
const capabilities = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy quyền quy trình hợp đồng thành công", service.capabilities(req.contractActor)),
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
    await service.update(req.params.id, req.body, req.user, req.contractActor, req.ip),
  ),
);
const action = (actionName) =>
  catchAsyncError(async (req, res) =>
    successResponse(
      res,
      200,
      "Cập nhật hợp đồng thành công",
      await service.transition(req.params.id, actionName, req.body?.reason, req.user, req.contractActor, req.ip),
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
  capabilities,
  get,
  create,
  update,
  submit: action("submit"),
  approve: action("approve"),
  returnForRevision: action("return"),
  reject: action("reject"),
  sign: action("sign"),
  payment,
  logs,
  security,
};
