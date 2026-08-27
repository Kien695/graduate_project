import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../redux/slices/authSlice";
import { Icon } from "../components/common/Icons";
import { hasRole } from "../utils/adminAccess";

const nav = [
  { to: "/admin/dashboard", icon: "dashboard", label: "Trang chủ" },
  { to: "/admin/vehicles", icon: "car", label: "Xe trong kho" },
  { to: "/admin/accessories", icon: "box", label: "Phụ kiện" },
  { to: "/admin/orders", icon: "orders", label: "Đơn đặt hàng" },
  { to: "/admin/contracts", icon: "contract", label: "Hợp đồng" },
  { to: "/admin/inspections", icon: "inspect", label: "Kiểm định xe" },
  { to: "/admin/customers", icon: "users", label: "Khách hàng" },
  { to: "/admin/employees", icon: "users", label: "Quản lý nhân viên", roles: ["ADMIN"] },
  { to: "/admin/security", icon: "shield", label: "Bảo mật", roles: ["ADMIN"] },
  { to: "/admin/profile", icon: "users", label: "Thông tin cá nhân" },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const visibleNav = nav.filter((item) => !item.roles || hasRole(user, item.roles));
  const logout = async () => { await dispatch(logoutUser()); navigate("/admin/login"); };

  return <div className="min-h-screen bg-slate-50 text-slate-700">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#07192d] text-slate-300 shadow-2xl transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Icon name="car" /></div><div><div className="text-sm font-black tracking-wider text-white">AUTO DEALER</div><div className="text-[10px] uppercase tracking-[.22em] text-blue-300">Management</div></div></div>
      <nav className="flex-1 space-y-1 p-4">{visibleNav.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "hover:bg-white/5 hover:text-white"}`}><Icon name={item.icon} className="h-5 w-5" />{item.label}</NavLink>)}</nav>
      <button onClick={logout} className="m-4 flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/5"><Icon name="logout" />Đăng xuất</button>
    </aside>
    {open && <button aria-label="Đóng menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-4"><button onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><Icon name="menu" /></button><div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-4 sm:flex"><Icon name="search" className="h-4 w-4 text-slate-400" /><input className="w-64 bg-transparent py-2.5 text-sm outline-none" placeholder="Tìm kiếm nhanh..." /></div></div><div className="flex items-center gap-4"><div className="h-9 w-px bg-slate-200" /><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 font-bold text-white">{(user?.full_name || user?.email || "A")[0].toUpperCase()}</div><div className="hidden sm:block"><p className="text-sm font-bold text-slate-900">{user?.full_name || "Administrator"}</p><p className="text-[11px] capitalize text-slate-500">{user?.role || "admin"}</p></div></div></div></header><main className="p-4 sm:p-7"><Outlet /></main></div>
  </div>;
}
