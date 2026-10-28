import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  cancelAccessoryOrder,
  getAccessoryOrder,
  getInspection,
  getVehicleOrders,
} from "../../api/customer.api";
import StatusBadge from "../../components/common/StatusBadge";
import { ErrorState, LoadingState } from "../../components/common/States";
import Icon from "../../components/common/Icon";
import { apiMessage, formatDate, formatVND, imageOf } from "../../utils/format";

export default function OrderDetailPage() {
  const { type, id } = useParams();
  const accessory = type === "accessory";
  const [order, setOrder] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    const request = accessory
      ? getAccessoryOrder(id)
      : getVehicleOrders().then(
          (x) =>
            x.find((o) => String(o.id) === String(id)) ||
            Promise.reject({ response: { status: 404 } }),
        );
    request
      .then(async (o) => {
        setOrder(o);
        if (!accessory) {
          try {
            setInspection(await getInspection(id));
          } catch {
            setInspection(null);
          }
        }
      })
      .catch((e) =>
        setError(
          e.response?.status === 404
            ? "Không tìm thấy đơn hàng."
            : "Không thể tải đơn hàng.",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [accessory, id]);

  const cancel = async () => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn phụ kiện này?")) return;
    setWorking(true);
    try {
      await cancelAccessoryOrder(id);
      toast.success("Đã hủy đơn hàng.");
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Không thể hủy đơn hàng."));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!order)
    return (
      <div className="container-page py-12">
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  const orderCode = `#${accessory ? "PK" : "DH"}${String(order.id).padStart(6, "0")}`;

  return (
    <div className="container-page max-w-4xl py-12">
      {/* Back button */}
      <Link
        to="/orders"
        className="group mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-1">
          &larr;
        </span>
        <span>Quay lại danh sách đơn hàng</span>
      </Link>

      {/* Header bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
            Chi tiết đơn hàng {accessory ? "phụ kiện" : "xe"}
          </span>
          <h1 className="mt-1 font-tech text-3xl font-black text-slate-950 dark:text-white">
            {orderCode}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column: Product Showcase */}
        <div className="card overflow-hidden">
          <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-black/40">
            {imageOf(order) ? (
              <img
                src={imageOf(order)}
                className="h-full w-full object-cover"
                alt=""
              />
            ) : (
              <div className="grid h-full place-items-center text-slate-400">
                <Icon name={accessory ? "box" : "car"} className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="p-6">
            <h2 className="text-xl font-black capitalize text-slate-950 dark:text-white">
              {accessory ? order.accessory_name : `${order.brand} ${order.model}`}
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Thời gian khởi tạo:{" "}
              {formatDate(accessory ? order.created_at : order.order_date, true)}
            </p>
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá trị đơn hàng
              </span>
              <p className="font-tech text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">
                {formatVND(order.total_amount || order.price)}
              </p>
            </div>
            {accessory && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Số lượng đặt: <strong className="text-slate-900 dark:text-white font-bold">{order.quantity}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Processing & Inspection Information */}
        <div className="space-y-6">
          {accessory ? (
            <div className="card p-6">
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Thao tác đơn hàng
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Đơn hàng phụ kiện chỉ có thể hủy khi còn ở trạng thái <b>Chờ xử lý</b>.
              </p>
              {String(order.status).toUpperCase() === "PENDING" ? (
                <button
                  className="mt-6 w-full rounded-xl border border-red-200 bg-red-50/50 py-3 text-xs font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                  disabled={working}
                  onClick={cancel}
                >
                  {working ? "Đang hủy đơn..." : "Hủy đơn hàng này"}
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  Đơn đã được duyệt hoặc hoàn tất xử lý nên không thể tự hủy.
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.06]">
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Kiểm định kỹ thuật xe
                </h2>
                <button
                  onClick={load}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition"
                  title="Làm mới dữ liệu"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                </button>
              </div>
              {inspection ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Kết quả thẩm định</span>
                    <StatusBadge status={inspection.status} />
                  </div>
                  <Info
                    label="Ngày kiểm tra hoàn tất"
                    value={formatDate(inspection.inspection_date)}
                  />
                  <Info
                    label="Ghi chú từ kỹ thuật viên"
                    value={
                      inspection.note ||
                      "Xe đạt đầy đủ các tiêu chuẩn vận hành an toàn và thẩm định của showroom."
                    }
                  />
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hiện đang chờ kỹ thuật viên phân công kiểm tra thực tế tại showroom.
                </p>
              )}
            </div>
          )}

          {/* Service Guarantee Banner */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            💡 Trạng thái đơn hàng và hồ sơ kiểm định được cập nhật trực tiếp theo thời gian thực bởi ban quản trị Auto Car.
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white leading-relaxed">{value}</p>
    </div>
  );
}
