import { Link } from "react-router-dom";
import { formatVND, imageOf } from "../../utils/format";
import Icon from "./Icon";

export default function ProductCard({ item, type }) {
  const vehicle = type === "vehicle";
  const available = vehicle
    ? String(item.status || "available").toLowerCase() === "available"
    : Number(item.stock) > 0;

  const brandName = vehicle ? item.brand : "Phụ kiện";
  const titleName = vehicle ? `${item.brand} ${item.model}` : item.name;
  const subtitle = vehicle
    ? `${item.year || "2026"} · ${item.color || "Tiêu chuẩn"}`
    : "Chính hãng · Bảo hành 12T";

  return (
    <Link
      to={`/${vehicle ? "vehicles" : "accessories"}/${item.id}`}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-red-950/10 hover:border-red-500/40 dark:border-white/[0.08] dark:bg-[#121319] dark:hover:border-red-500/50 dark:hover:shadow-red-950/40"
    >
      <div>
        {/* Image Showcase Container */}
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 p-5 dark:from-slate-900/50 dark:to-slate-950">
          {imageOf(item) ? (
            <img
              src={imageOf(item)}
              alt={titleName}
              className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-200/60 text-slate-400 dark:bg-white/5 dark:text-slate-500">
              <Icon name={vehicle ? "car" : "box"} className="h-10 w-10" />
            </div>
          )}

          {/* Top-Left Brand / Type Chip */}
          <span className="absolute left-3 top-3 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/60 dark:text-white">
            {brandName}
          </span>

          {/* Top-Right Availability Chip */}
          <span
            className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md ${
              available
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                available ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {available ? "Còn hàng" : vehicle ? "Liên hệ" : "Hết hàng"}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400">
            {subtitle}
          </p>
          <h3 className="mt-1 truncate text-base font-black uppercase tracking-tight text-slate-900 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">
            {titleName}
          </h3>

          <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá niêm yết
              </span>
              <span className="font-tech text-lg font-black text-red-600 dark:text-red-400">
                {formatVND(item.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 pb-5">
        <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 py-2.5 text-xs font-bold text-slate-700 transition group-hover:border-red-600 group-hover:bg-red-50/50 group-hover:text-red-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:group-hover:border-red-500/50 dark:group-hover:bg-red-500/10 dark:group-hover:text-red-400">
          <span>{vehicle ? "Xem hồ sơ xe" : "Xem chi tiết"}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
