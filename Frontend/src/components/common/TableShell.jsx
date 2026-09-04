import { Icon } from "./Icons";
export default function TableShell({
  title,
  subtitle,
  onAdd,
  addLabel = "Thêm mới",
  search,
  setSearch,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900 sm:w-64">
            <Icon name="search" className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-transparent py-2.5 text-sm outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Icon name="plus" className="h-4 w-4" />
              {addLabel}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
