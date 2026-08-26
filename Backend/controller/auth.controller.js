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
const registerCustomer = catchAsyncError(async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;
  const errors = [];
  const addError = (field, message) => errors.push({ field, message });

  if (!String(name || "").trim())
    addError("name", "Họ và tên không được để trống");
  if (!String(email || "").trim())
    addError("email", "Email không được để trống");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()))
    addError("email", "Email không đúng định dạng");
  if (!String(phone || "").trim())
    addError("phone", "Số điện thoại không được để trống");
  else if (!/^(0\d{9}|\+84\d{9})$/.test(String(phone).trim()))
    addError("phone", "Số điện thoại không hợp lệ");
  if (!password) addError("password", "Mật khẩu không được để trống");
  else if (String(password).length < 6)
    addError("password", "Mật khẩu phải có ít nhất 6 ký tự");
  if (!confirmPassword)
    addError("confirmPassword", "Vui lòng nhập lại mật khẩu");
  else if (password !== confirmPassword)
    addError("confirmPassword", "Mật khẩu nhập lại không khớp");

  if (errors.length)
    throw new ErrorHandler("Dữ liệu đăng ký không hợp lệ", 400, errors);
  await authService.registerCustomer({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    password,
  });
  return successResponse(res, 201, "Register successfully");
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
  registerCustomer,
  refreshToken,
  logout,
  logoutAll,
  changePassword,
  lockAccount,
  unlockAccount,
};
