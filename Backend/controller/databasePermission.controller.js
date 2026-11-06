const service = require("../service/databasePermission.service");
const groups = require("../service/permissionGroup.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");
const { ErrorHandler } = require("../middleware/errorMiddleware");

const get = catchAsyncError(async (req, res) => {
  const [data, group] = await Promise.all([
    service.read(req.params.id),
    groups.getAssignedGroup(req.params.id),
  ]);
  successResponse(res, 200, "Lấy quyền PostgreSQL thành công", { ...data, group });
});
const update = catchAsyncError(async (req, res) => {
  const group = await groups.getAssignedGroup(req.params.id);
  if (group)
    throw new ErrorHandler(
      `Nhân viên đang thuộc nhóm quyền "${group.name}"; hãy sửa quyền của nhóm hoặc bỏ nhân viên khỏi nhóm trước khi cấp quyền riêng`,
      409,
    );
  successResponse(res, 200, "Cập nhật quyền PostgreSQL thành công", await service.update(req.params.id, req.body?.features));
});
module.exports = { get, update };

