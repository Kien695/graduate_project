import { useNavigate } from "react-router-dom";
import { Icon } from "./Icons";

export default function StatCard({ icon, label, value, color, to }) {
  const navigate = useNavigate();
  const content = <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Dữ liệu cập nhật từ hệ thống</p></div><div className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon name={icon} /></div></div>;
  if (!to) return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">{content}</div>;
  return <button type="button" onClick={() => navigate(to)} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-800">{content}</button>;
}
