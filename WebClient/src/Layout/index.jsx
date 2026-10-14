import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { fetchUnreadCount } from "../redux/slices/notificationSlice";
import { toggleTheme } from "../redux/slices/themeSlice";
import Icon from "../components/common/Icon";
const nav = [{ to: "/", label: "Trang chủ", icon: "home", end: true }, { to: "/vehicles", label: "Xe", icon: "car" }, { to: "/accessories", label: "Phụ kiện", icon: "box" }, { to: "/orders", label: "Đơn hàng", icon: "orders" }, { to: "/contracts", label: "Hợp đồng", icon: "contract" }];
export default function ClientLayout() {
  const [open, setOpen] = useState(false); const dispatch = useDispatch(); const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth); const unread = useSelector((s) => s.notifications.unreadCount); const mode = useSelector((s) => s.theme.mode);
  useEffect(() => { dispatch(fetchUnreadCount()); }, [dispatch]);
  const signOut = async () => { await dispatch(logout()); navigate("/login"); };
  return <div className="min-h-screen pb-20 md:pb-0">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"><div className="container-page flex h-18 items-center justify-between py-3">
      <NavLink to="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-700 text-white"><Icon name="car"/></span><div><div className="font-black tracking-wide">AUTO CAR</div><div className="text-[10px] font-bold uppercase tracking-[.25em] text-red-700">Showroom</div></div></NavLink>
      <nav className="hidden items-center gap-1 lg:flex">{nav.map((item) => <NavLink key={item.to} end={item.end} to={item.to} className={({isActive}) => `rounded-xl px-4 py-2.5 text-sm font-bold transition ${isActive ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{item.label}</NavLink>)}</nav>
      <div className="flex items-center gap-2"><button className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => dispatch(toggleTheme())} aria-label="Đổi giao diện"><Icon name={mode === "dark" ? "sun" : "moon"}/></button><NavLink to="/notifications" className="relative rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="bell"/>{unread > 0 && <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</NavLink><button onClick={() => setOpen(!open)} className="rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><Icon name={open ? "close" : "menu"}/></button><NavLink to="/account" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 md:flex dark:border-slate-800">{user?.avatar_url ? <img src={user.avatar_url} className="h-8 w-8 rounded-full object-cover" alt=""/> : <span className="grid h-8 w-8 place-items-center rounded-full bg-red-100 font-bold text-red-700">{(user?.full_name || "K")[0]}</span>}<span className="max-w-32 truncate text-xs font-bold">{user?.full_name}</span></NavLink></div>
    </div>{open && <nav className="container-page space-y-1 border-t border-slate-100 py-3 lg:hidden dark:border-slate-800">{nav.map((item) => <NavLink key={item.to} end={item.end} to={item.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name={item.icon}/>{item.label}</NavLink>)}<NavLink to="/account" className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold"><Icon name="user"/>Tài khoản</NavLink><button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-red-700"><Icon name="logout"/>Đăng xuất</button></nav>}</header>
    <main><Outlet/></main>
    <footer className="mt-14 border-t border-slate-200 bg-slate-950 pb-20 text-slate-300 md:pb-0 dark:border-slate-800">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <NavLink to="/" className="inline-flex items-center gap-3 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-700">
              <Icon name="car" />
            </span>
            <div>
              <div className="font-black tracking-wide">AUTO CAR</div>
              <div className="text-[10px] font-bold uppercase tracking-[.25em] text-red-400">Showroom</div>
            </div>
          </NavLink>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            Đồng hành cùng bạn từ lúc lựa chọn chiếc xe phù hợp đến khi hoàn tất hợp đồng và kiểm định.
          </p>
        </div>
        <FooterLinks title="Khám phá" links={[{ to: "/vehicles", label: "Danh sách xe" }, { to: "/accessories", label: "Phụ kiện chính hãng" }, { to: "/orders", label: "Đơn hàng của tôi" }]} />
        <FooterLinks title="Tài khoản" links={[{ to: "/contracts", label: "Hợp đồng" }, { to: "/notifications", label: "Thông báo" }, { to: "/account", label: "Thông tin cá nhân" }]} />
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Hỗ trợ khách hàng</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <p>Thứ Hai – Chủ Nhật: 08:00 – 20:00</p>
            <p>Mọi yêu cầu hỗ trợ sẽ được nhân viên Auto Car tiếp nhận qua thông tin tài khoản của bạn.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Auto Car. Bảo lưu mọi quyền.</p>
          <p>Trải nghiệm showroom số dành cho khách hàng.</p>
        </div>
      </div>
    </footer>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white md:hidden dark:border-slate-800 dark:bg-slate-950">{nav.map((item) => <NavLink key={item.to} end={item.end} to={item.to} className={({isActive}) => `flex flex-col items-center gap-1 py-2 text-[10px] font-bold ${isActive ? "text-red-700" : "text-slate-500"}`}><Icon name={item.icon} className="h-5 w-5"/>{item.label}</NavLink>)}</nav>
  </div>;
}

function FooterLinks({ title, links }) {
  return <div>
    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">{title}</h2>
    <nav className="mt-5 space-y-3">
      {links.map((link) => <NavLink key={link.to} to={link.to} className="block text-sm text-slate-400 transition hover:translate-x-1 hover:text-red-400">{link.label}</NavLink>)}
    </nav>
  </div>;
}
