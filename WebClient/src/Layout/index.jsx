import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { fetchUnreadCount } from "../redux/slices/notificationSlice";
import { toggleTheme } from "../redux/slices/themeSlice";
import Icon from "../components/common/Icon";

const nav = [
  { to: "/", label: "Trang chủ", icon: "home", end: true },
  { to: "/vehicles", label: "Xe", icon: "car" },
  { to: "/accessories", label: "Phụ kiện", icon: "box" },
  { to: "/orders", label: "Đơn hàng", icon: "orders" },
  { to: "/contracts", label: "Hợp đồng", icon: "contract" },
];

export default function ClientLayout() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const unread = useSelector((s) => s.notifications.unreadCount);
  const mode = useSelector((s) => s.theme.mode);

  useEffect(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const signOut = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 flex flex-col justify-between">
      {/* Neo-Luxury Sticky Frosted Glass Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 text-slate-900 backdrop-blur-xl transition-colors duration-300 dark:border-white/[0.08] dark:bg-[#0a0b0e]/85 dark:text-slate-100">
        <div className="container-page flex h-20 items-center justify-between py-3">
          
          {/* Brand Logo */}
          <NavLink to="/" className="group flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-red-600 via-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 transition-transform duration-300 group-hover:scale-105">
              <Icon name="car" className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-base font-black tracking-wider text-slate-950 dark:text-white">
                AUTO CAR <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
              </div>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-red-600 dark:text-red-500">
                Showroom
              </div>
            </div>
          </NavLink>

          {/* Desktop Capsule Nav Menu */}
          <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/70 p-1.5 shadow-sm backdrop-blur-md lg:flex dark:border-white/[0.08] dark:bg-white/[0.03]">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                end={item.end}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-5 py-2 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/35"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
              onClick={() => dispatch(toggleTheme())}
              aria-label="Đổi giao diện"
              title={mode === "dark" ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
            >
              <Icon name={mode === "dark" ? "sun" : "moon"} className="h-4 w-4" />
            </button>

            {/* Notification Bell */}
            <NavLink
              to="/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
              title="Thông báo"
            >
              <Icon name="bell" className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-md shadow-red-600/40 ring-2 ring-white dark:ring-[#0a0b0e]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </NavLink>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 lg:hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
              aria-label="Menu"
            >
              <Icon name={open ? "close" : "menu"} className="h-4 w-4" />
            </button>

            {/* Desktop User Profile Capsule */}
            <NavLink
              to="/account"
              className="hidden items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/80 py-1 pl-1.5 pr-4 shadow-sm transition hover:bg-slate-100 md:flex dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-red-500/30"
                  alt=""
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-xs font-black text-white shadow-sm">
                  {(user?.full_name || "K")[0]?.toUpperCase()}
                </span>
              )}
              <div className="flex flex-col text-left">
                <span className="max-w-32 truncate text-xs font-bold text-slate-900 dark:text-white">
                  {user?.full_name || "Khách hàng"}
                </span>
                <span className="text-[10px] font-medium text-slate-400">Tài khoản VIP</span>
              </div>
            </NavLink>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {open && (
          <nav className="container-page space-y-1.5 border-t border-slate-200/80 bg-white/95 py-4 backdrop-blur-xl lg:hidden dark:border-white/[0.08] dark:bg-[#0a0b0e]/95">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                end={item.end}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                  }`
                }
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              <Icon name="user" className="h-4 w-4" />
              Tài khoản cá nhân
            </NavLink>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Icon name="logout" className="h-4 w-4" />
              Đăng xuất
            </button>
          </nav>
        )}
      </header>

      {/* Main Content View */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Neo-Luxury Editorial Footer */}
      <footer className="mt-20 border-t border-slate-200/80 bg-white text-slate-600 transition-colors duration-300 dark:border-white/[0.08] dark:bg-[#07080a] dark:text-slate-400 pb-20 md:pb-0">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <NavLink to="/" className="inline-flex items-center gap-3 text-slate-900 dark:text-white">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30">
                <Icon name="car" className="h-5 w-5" />
              </span>
              <div>
                <div className="text-base font-black tracking-wider text-slate-950 dark:text-white">
                  AUTO CAR
                </div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-red-600 dark:text-red-500">
                  Showroom Deluxe
                </div>
              </div>
            </NavLink>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Đồng hành cùng quý khách từ bước tham khảo, lựa chọn mẫu xe ưng ý cho đến khi hoàn tất hợp đồng số và quy trình kiểm định chất lượng nghiêm ngặt.
            </p>
          </div>

          {/* Links: Khám phá */}
          <FooterLinks
            title="Khám phá"
            links={[
              { to: "/vehicles", label: "Danh sách xe cao cấp" },
              { to: "/accessories", label: "Phụ kiện chính hãng" },
              { to: "/orders", label: "Đơn hàng của tôi" },
            ]}
          />

          {/* Links: Tài khoản */}
          <FooterLinks
            title="Tài khoản"
            links={[
              { to: "/contracts", label: "Hợp đồng điện tử" },
              { to: "/notifications", label: "Trung tâm thông báo" },
              { to: "/account", label: "Hồ sơ cá nhân" },
            ]}
          />

          {/* Links: Hỗ trợ */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-white">
              Hỗ trợ khách hàng
            </h2>
            <div className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Thứ Hai – Chủ Nhật: 08:00 – 20:00</span>
              </p>
              <p>
                Mọi yêu cầu hỗ trợ sẽ được đội ngũ chuyên viên Auto Car tiếp nhận và xử lý trực tiếp qua thông tin tài khoản của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Footer Line */}
        <div className="border-t border-slate-200/80 dark:border-white/[0.08]">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-400 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Auto Car Showroom. Bản quyền thuộc về hệ thống quản lý số.</p>
            <p>Trải nghiệm showroom số thượng lưu dành cho khách hàng.</p>
          </div>
        </div>
      </footer>

      {/* Floating Mobile Bottom Navigation Dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/[0.08] dark:bg-[#0a0b0e]/95">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            end={item.end}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                isActive ? "text-red-600 dark:text-red-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function FooterLinks({ title, links }) {
  return (
    <div>
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-white">
        {title}
      </h2>
      <nav className="mt-4 space-y-2.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="block text-xs text-slate-500 transition-all duration-200 hover:translate-x-1 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
