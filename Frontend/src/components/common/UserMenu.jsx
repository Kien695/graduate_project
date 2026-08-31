import { useNavigate } from "react-router-dom";

export default function UserMenu({ user }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/admin/profile")} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">{user?.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 font-bold text-white">{(user?.full_name || user?.email || "A")[0].toUpperCase()}</div>}<div className="hidden sm:block"><p className="text-sm font-bold text-slate-900 dark:text-white">{user?.full_name || "Administrator"}</p><p className="text-[11px] capitalize text-slate-500 dark:text-slate-400">{user?.role || "admin"}</p></div></button>;
}
