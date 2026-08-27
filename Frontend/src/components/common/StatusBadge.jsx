const colors = {
  available: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  signed: "bg-teal-50 text-teal-700",
  passed: "bg-emerald-50 text-emerald-700",
  confirmed: "bg-cyan-50 text-cyan-700",
  checking: "bg-blue-50 text-blue-700",
  reserved: "bg-amber-50 text-amber-700",
  pending: "bg-amber-50 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-50 text-rose-700",
  failed: "bg-rose-50 text-rose-700",
  sold: "bg-violet-50 text-violet-700",
  inactive: "bg-slate-100 text-slate-500",
  active: "bg-emerald-50 text-emerald-700",
  out_of_stock: "bg-rose-50 text-rose-700",
};
const labels = { active: "ACTIVE", inactive: "INACTIVE", out_of_stock: "OUT_OF_STOCK" };

export default function StatusBadge({ value }) {
  const key = String(value || "unknown").toLowerCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${colors[key] || "bg-blue-50 text-blue-700"}`}>{labels[key] || value || "—"}</span>;
}
