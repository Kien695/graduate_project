import { Icon } from "./Icons";
export default function StatusFilter({ value, onChange, options, label = "Trạng thái" }) {
  return (
    <label className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
      <Icon name="filter" className="h-4 w-4 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="bg-transparent py-2.5 pr-1 text-sm outline-none dark:text-slate-100 dark:[color-scheme:dark]"
      >
        <option value="all">Tất cả</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
