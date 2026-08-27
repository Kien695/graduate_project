const userService = require("../service/user.service");
const authService = require("../service/auth.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");
const getMe = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Lấy thông tin tài khoản thành công",
    await userService.getById(req.user.id),
  ),
);
const updateMe = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Cập nhật thông tin thành công",
    await userService.updateMe(req.user.id, req.body),
  ),
);
const updateAvatar = catchAsyncError(async (req, res) =>
  successResponse(res, 200, "Cập nhật ảnh đại diện thành công", await userService.updateAvatar(req.user, req.file)),
);
const updateSecurityLevel = catchAsyncError(async (req, res) => {
  if (!req.body.securityLevelId)
    throw new ErrorHandler("securityLevelId là bắt buộc", 400);
  return successResponse(
    res,
    200,
    "Cập nhật nhãn bảo mật thành công",
    await userService.setSecurityLevel(req.params.id, req.body.securityLevelId),
  );
});
const lock = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã khóa tài khoản",
    await authService.setLock(req.params.id, true),
  ),
);
module.exports = { getMe, updateMe, updateAvatar, updateSecurityLevel, lock };
