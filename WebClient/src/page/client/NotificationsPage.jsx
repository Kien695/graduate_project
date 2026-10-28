import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getNotifications } from "../../api/notification.api";
import { fetchUnreadCount } from "../../redux/slices/notificationSlice";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
import { formatDate } from "../../utils/format";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();

  const load = () => {
    setLoading(true);
    getNotifications()
      .then(setItems)
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải thông báo."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  return (
    <div className="container-page max-w-4xl py-12">
      {/* Header */}
      <div className="mb-10 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
          Hộp thư hệ thống
        </span>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          Trung tâm thông báo
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Các cập nhật trạng thái đơn hàng, tiến độ kiểm định và thông báo từ ban quản trị.
        </p>
      </div>

      <div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !items.length ? (
          <EmptyState
            title="Chưa có thông báo nào"
            description="Bạn sẽ nhận được các thông báo cập nhật mới nhất tại đây."
          />
        ) : (
          <div className="space-y-3.5">
            {items.map((x) => (
              <Link
                key={x.id}
                to={`/notifications/${x.id}`}
                className={`card group block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  !x.is_read
                    ? "border-l-4 border-l-red-600 bg-red-500/[0.02]"
                    : "opacity-85 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors dark:text-white dark:group-hover:text-red-400">
                        {x.title}
                      </h2>
                      {!x.is_read && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black text-white">
                          Mới
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {x.message}
                    </p>
                  </div>

                  {!x.is_read && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 animate-pulse" />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-white/[0.06]">
                  <span>{formatDate(x.created_at, true)}</span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">
                    Xem chi tiết &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
