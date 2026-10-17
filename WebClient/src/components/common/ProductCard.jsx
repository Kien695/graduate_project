import { Link } from "react-router-dom";
import { formatVND, imageOf } from "../../utils/format";
import Icon from "./Icon";
export default function ProductCard({ item, type }) {
  const vehicle = type === "vehicle";
  const available = vehicle
    ? String(item.status || "available").toLowerCase() === "available"
    : Number(item.stock) > 0;
  return (
    <Link
      to={`/${vehicle ? "vehicles" : "accessories"}/${item.id}`}
      className="card group block overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-300/60 dark:hover:shadow-black/40"
    >
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 p-6 dark:from-slate-800 dark:to-slate-900">
        {imageOf(item) ? (
          <img
            src={imageOf(item)}
            alt={vehicle ? `${item.brand} ${item.model}` : item.name}
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Icon name={vehicle ? "car" : "box"} className="h-14 w-14 text-slate-400" />
        )}
      </div>
      <div className="border-t border-dashed border-slate-200 p-5 text-center dark:border-slate-700">
        <h3 className="truncate text-base font-black uppercase tracking-tight">
          {vehicle ? `${item.brand} ${item.model}` : item.name}
        </h3>
        {vehicle && (
          <p className="mt-1 text-xs text-slate-500">
            {item.year} · {item.color || "Chưa cập nhật"}
          </p>
        )}
        <p className="mt-3 text-lg font-black text-red-700 dark:text-red-400">
          {formatVND(item.price)}
        </p>
        <p
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold ${available ? "text-emerald-600" : "text-slate-500"}`}
        >
          ● {available ? "Còn hàng" : vehicle ? "Liên hệ" : "Hết hàng"}
        </p>
      </div>
    </Link>
  );
}
