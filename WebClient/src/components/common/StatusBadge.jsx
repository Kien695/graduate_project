const styles = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CONFIRMED: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SIGNED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PASS: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  FAIL: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  CHECKING: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  NOT_STARTED: "border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

const labels = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  CONFIRMED: "Đã xác nhận",
  SIGNED: "Đã ký",
  COMPLETED: "Hoàn tất",
  PASS: "Đạt",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
  FAIL: "Không đạt",
  CHECKING: "Đang kiểm tra",
  NOT_STARTED: "Chưa kiểm định",
};

export default function StatusBadge({ status }) {
  const key = String(status || "PENDING").toUpperCase();
  const colorClass = styles[key] || styles.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-sm ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {labels[key] || key}
    </span>
  );
}
