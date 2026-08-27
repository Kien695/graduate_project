export const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "STAFF"]);

export const hasAdminAccess = (user) =>
  ADMIN_ROLES.has(String(user?.role || "").toUpperCase());

export const hasRole = (user, roles = []) =>
  roles.map((role) => String(role).toUpperCase()).includes(String(user?.role || "").toUpperCase());

export const ADMIN_ACCESS_ERROR = "Bạn không có quyền truy cập trang quản trị.";
