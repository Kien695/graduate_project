import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getNotification, markRead } from "../../api/notification.api";
import { notificationRead } from "../../redux/slices/notificationSlice";
import { ErrorState, LoadingState } from "../../components/common/States";
import Icon from "../../components/common/Icon";
import { formatDate } from "../../utils/format";

export default function NotificationDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    getNotification(id)
      .then(async (x) => {
        setItem(x);
        if (!x.is_read) {
          await markRead(id);
          dispatch(notificationRead());
        }
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải thông báo."),
      )
      .finally(() => setLoading(false));
  }, [id, dispatch]);

  if (loading) return <LoadingState />;
  if (!item)
    return (
      <div className="container-page py-12">
        <ErrorState message={error} />
      </div>
    );

  const openReference = () => {
    const type = String(item.type || item.reference_type || "").toLowerCase();
    if (type.includes("contract")) navigate(`/contracts/${item.reference_id}`);
    else if (type.includes("accessory"))
      navigate(`/orders/accessory/${item.reference_id}`);
    else navigate(`/orders/vehicle/${item.reference_id}`);
  };

  return (
    <div className="container-page max-w-3xl py-12">
      {/* Back Button */}
      <Link
        to="/notifications"
        className="group mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-1">
          &larr;
        </span>
        <span>Quay lại trung tâm thông báo</span>
      </Link>

      <article className="card p-6 sm:p-10">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30">
            <Icon name="bell" className="h-5 w-5" />
          </span>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400">
              Thông báo hệ thống
            </span>
            <p className="text-xs text-slate-400">
              {formatDate(item.created_at, true)}
            </p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          {item.title}
        </h1>

        <div className="my-6 border-t border-slate-100 dark:border-white/[0.06]" />

        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {item.message}
        </div>

        {item.reference_id && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
            <button className="btn-primary w-full sm:w-auto" onClick={openReference}>
              <span>Xem hồ sơ & chi tiết liên quan</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
