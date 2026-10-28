import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAccessoryOrders, getVehicleOrders } from "../../api/customer.api";
import StatusBadge from "../../components/common/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
import { formatDate, formatVND, imageOf } from "../../utils/format";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([getVehicleOrders(), getAccessoryOrders().catch(() => [])])
      .then(([v, a]) =>
        setOrders(
          [
            ...v.map((x) => ({ ...x, type: "vehicle", date: x.order_date })),
            ...a.map((x) => ({ ...x, type: "accessory", date: x.created_at })),
          ].sort((x, y) => new Date(y.date) - new Date(x.date)),
        ),
      )
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải đơn hàng."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="container-page py-12">
      {/* Editorial Header */}
      <div className="mb-10 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
          Lịch sử giao dịch
        </span>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          Đơn hàng của tôi
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Theo dõi tiến trình đặt cọc xe, thẩm định kỹ thuật và mua sắm phụ kiện chính hãng.
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !orders.length ? (
        <EmptyState
          title="Bạn chưa có đơn hàng nào"
          description="Các xe và phụ kiện bạn đặt sẽ được lưu trữ và cập nhật trạng thái chi tiết tại đây."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const isVehicle = o.type === "vehicle";
            const code = `#${isVehicle ? "DH" : "PK"}${String(o.id).padStart(6, "0")}`;
            const title = isVehicle ? `${o.brand} ${o.model}` : o.accessory_name || o.name;

            return (
              <Link
                key={`${o.type}-${o.id}`}
                to={`/orders/${o.type}/${o.id}`}
                className="card group flex flex-col gap-5 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-red-500/30 sm:flex-row sm:items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Thumbnail */}
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200/80 dark:border-white/10">
                    {imageOf(o) ? (
                      <img
                        src={imageOf(o)}
                        alt={title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-bold text-slate-400">
                        {isVehicle ? "XE" : "PHỤ KIỆN"}
                      </div>
                    )}
                  </div>

                  {/* Order Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {code}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {isVehicle ? "Đơn xe" : "Phụ kiện"}
                      </span>
                    </div>

                    <h3 className="mt-1 truncate text-base font-black text-slate-900 group-hover:text-red-600 transition-colors dark:text-white dark:group-hover:text-red-400">
                      {title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Ngày đặt: {formatDate(o.date, true)}
                    </p>
                  </div>
                </div>

                {/* Price, Status & Action Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0 dark:border-white/[0.06]">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Tổng tiền
                    </div>
                    <div className="font-tech text-lg font-black text-red-600 dark:text-red-400">
                      {formatVND(o.total_amount || o.price)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="hidden sm:inline-block text-slate-400 transition-transform duration-300 group-hover:translate-x-1 text-base">
                      &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
