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
    <div className="container-page max-w-4xl py-10">
      <h1 className="text-3xl font-black">Thông báo</h1>
      <p className="mt-2 text-sm text-slate-500">
        Các cập nhật mới nhất từ Auto Car.
      </p>
      <div className="mt-8">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !items.length ? (
          <EmptyState title="Chưa có thông báo" />
        ) : (
          <div className="space-y-3">
            {items.map((x) => (
              <Link
                key={x.id}
                to={`/notifications/${x.id}`}
                className={`card block p-5 transition hover:shadow-md ${!x.is_read ? "border-l-4 border-l-red-600" : ""}`}
              >
                <div className="flex justify-between gap-5">
                  <div>
                    <h2 className="font-extrabold">{x.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {x.message}
                    </p>
                  </div>
                  {!x.is_read && (
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {formatDate(x.created_at, true)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
