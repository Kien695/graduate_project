import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getContracts } from "../../api/customer.api";
import StatusBadge from "../../components/common/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
import { formatDate, formatVND, imageOf } from "../../utils/format";

export default function ContractsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getContracts()
      .then(setItems)
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải hợp đồng."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="container-page py-12">
      {/* Header */}
      <div className="mb-10 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
          Văn bản pháp lý
        </span>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          Hợp đồng điện tử
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Tra cứu, xác nhận và quản lý các văn bản hợp đồng mua bán xe kỹ thuật số.
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items.length ? (
        <EmptyState
          title="Bạn chưa có hợp đồng nào"
          description="Hợp đồng do chuyên viên Auto Car tạo và công bố sẽ xuất hiện tại đây sau khi đơn hàng được duyệt."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {items.map((x) => (
            <Link
              key={x.id}
              to={`/contracts/${x.id}`}
              className="card group flex flex-col sm:flex-row gap-5 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-red-500/30"
            >
              {/* Vehicle Thumbnail */}
              <div className="h-32 w-full sm:w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200/80 dark:border-white/10">
                {imageOf(x) ? (
                  <img
                    src={imageOf(x)}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    alt=""
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs font-bold text-slate-400">
                    HỢP ĐỒNG
                  </div>
                )}
              </div>

              {/* Meta & Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {x.contract_number}
                    </span>
                    <StatusBadge status={x.status} />
                  </div>

                  <h3 className="mt-1.5 truncate text-base font-black text-slate-900 group-hover:text-red-600 transition-colors dark:text-white dark:group-hover:text-red-400">
                    {x.brand} {x.model}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Ngày tạo: {formatDate(x.created_at)}
                  </p>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Giá trị hợp đồng
                    </span>
                    <span className="font-tech text-base font-black text-red-600 dark:text-red-400">
                      {formatVND(x.total_amount || x.vehicle_price)}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">
                    Chi tiết &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
