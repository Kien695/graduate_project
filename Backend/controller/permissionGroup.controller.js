const service = require("../service/permissionGroup.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { successResponse } = require("../utils/response");

const list = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy danh sách nhóm quyền thành công", await service.list()));
const get = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Lấy chi tiết nhóm quyền thành công", await service.get(req.params.id)));
const create = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    201,
    "Tạo nhóm quyền thành công",
    await service.create(req.body?.name, req.body?.description, req.body?.features),
  ));
const update = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật nhóm quyền thành công",
    await service.updateGroup(req.params.id, {
      name: req.body?.name,
      description: req.body?.description,
      features: req.body?.features,
    }),
  ));
const remove = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Đã xóa nhóm quyền", await service.deleteGroup(req.params.id)));
const assignMember = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã gán nhân viên vào nhóm quyền",
    await service.assignEmployee(req.params.employeeId, req.params.id),
  ));
const removeMember = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã bỏ nhân viên khỏi nhóm quyền",
    await service.unassignEmployee(req.params.employeeId),
  ));

module.exports = { list, get, create, update, remove, assignMember, removeMember };
