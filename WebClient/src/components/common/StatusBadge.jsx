const styles = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PASS: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-red-100 text-red-800",
  FAIL: "bg-red-100 text-red-800",
  CHECKING: "bg-violet-100 text-violet-800",
  NOT_STARTED: "bg-slate-100 text-slate-600",
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
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[key] || styles.PENDING}`}
    >
      {labels[key] || key}
    </span>
  );
}
