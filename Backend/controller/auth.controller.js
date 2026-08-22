const authService = require("../service/auth.service");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const { ErrorHandler } = require("../middleware/errorMiddleware");
const { successResponse } = require("../utils/response");

const requireFields = (body, fields) => {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length)
    throw new ErrorHandler(
      "Dữ liệu đầu vào không hợp lệ",
      400,
      missing.map((field) => ({ field, message: "Bắt buộc" })),
    );
};
const login = catchAsyncError(async (req, res) => {
  requireFields(req.body, ["email", "password"]);
  const data = await authService.login({
    ...req.body,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });
  res.cookie("refreshToken", data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 86400000,
  });
  return successResponse(res, 200, "Đăng nhập thành công", data);
});
const refreshToken = catchAsyncError(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) throw new ErrorHandler("Thiếu refresh token", 400);
  return successResponse(
    res,
    200,
    "Cấp access token thành công",
    await authService.refresh(token),
  );
});
const logout = catchAsyncError(async (req, res) => {
  await authService.logout(req.body.refreshToken || req.cookies?.refreshToken);
  res.clearCookie("refreshToken");
  return successResponse(res, 200, "Đăng xuất thành công");
});
const logoutAll = catchAsyncError(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.clearCookie("refreshToken");
  return successResponse(res, 200, "Đã đăng xuất tất cả thiết bị");
});
const changePassword = catchAsyncError(async (req, res) => {
  requireFields(req.body, ["currentPassword", "newPassword"]);
  if (req.body.newPassword.length < 8)
    throw new ErrorHandler("Mật khẩu mới phải có ít nhất 8 ký tự", 400);
  await authService.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  res.clearCookie("refreshToken");
  return successResponse(
    res,
    200,
    "Đổi mật khẩu thành công, vui lòng đăng nhập lại",
  );
});
const lockAccount = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã khóa tài khoản",
    await authService.setLock(req.params.id, true),
  ),
);
const unlockAccount = catchAsyncError(async (req, res) =>
  successResponse(
    res,
    200,
    "Đã mở khóa tài khoản",
    await authService.setLock(req.body.userId || req.params.id, false),
  ),
);
module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll,
  changePassword,
  lockAccount,
  unlockAccount,
};
