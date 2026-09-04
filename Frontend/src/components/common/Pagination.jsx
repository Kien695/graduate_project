export default function Pagination({ page, total, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <span>
        Hiển thị {total ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, total)} trong {total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1)
          .slice(Math.max(0, page - 3), Math.max(5, page + 2))
          .map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`h-8 min-w-8 rounded-lg px-2 font-semibold ${p === page ? "bg-blue-600 text-white" : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"}`}
            >
              {p}
            </button>
          ))}
      </div>
    </div>
  );
}
