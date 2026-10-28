import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getAccessory, getVehicle } from "../../api/catalog.api";
import {
  createAccessoryOrder,
  createVehicleOrder,
} from "../../api/customer.api";
import { ErrorState, LoadingState } from "../../components/common/States";
import Icon from "../../components/common/Icon";
import { apiMessage, formatVND, imageOf } from "../../utils/format";

export default function ProductDetailPage({ type }) {
  const { id } = useParams();
  const vehicle = type === "vehicle";
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    (vehicle ? getVehicle(id) : getAccessory(id))
      .then((data) => {
        setItem(data);
        setActiveImage(imageOf(data));
      })
      .catch((e) =>
        setError(
          e.response?.status === 404
            ? "Sản phẩm không còn tồn tại."
            : "Không thể tải thông tin sản phẩm.",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [id, vehicle]);

  const order = async () => {
    if (!vehicle && (quantity < 1 || quantity > Number(item.stock)))
      return toast.error("Số lượng không hợp lệ.");
    if (
      !window.confirm(
        `Xác nhận đặt ${vehicle ? "xe" : `${quantity} phụ kiện`} này?`,
      )
    )
      return;
    setOrdering(true);
    try {
      await (vehicle
        ? createVehicleOrder(item.id)
        : createAccessoryOrder(item.id, quantity));
      toast.success("Đặt hàng thành công!");
      navigate("/orders");
    } catch (e) {
      toast.error(apiMessage(e, "Không thể đặt hàng."));
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!item)
    return (
      <div className="container-page py-12">
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  const available = vehicle
    ? String(item.status).toUpperCase() === "AVAILABLE"
    : Number(item.stock) > 0;

  return (
    <div className="container-page py-10">
      {/* Back Button */}
      <Link
        to={vehicle ? "/vehicles" : "/accessories"}
        className="group mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-1">
          &larr;
        </span>
        <span>Quay lại {vehicle ? "danh sách xe" : "danh sách phụ kiện"}</span>
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        
        {/* Left Column: Visual Gallery Showcase */}
        <section className="space-y-4">
          <div className="card relative aspect-[16/10] overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 shadow-xl dark:border-white/10 dark:bg-black/40">
            {activeImage || imageOf(item) ? (
              <img
                src={activeImage || imageOf(item)}
                alt={vehicle ? `${item.brand} ${item.model}` : item.name}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-slate-400">
                <Icon name={vehicle ? "car" : "box"} className="h-24 w-24" />
              </div>
            )}
            
            {/* Overlay Chips */}
            <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-white backdrop-blur-md">
              {vehicle ? item.brand : "Chính hãng"}
            </span>

            <span
              className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${
                available
                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/20 text-amber-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  available ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {available
                ? `Còn hàng${vehicle ? "" : ` (${item.stock})`}`
                : vehicle
                  ? "Không khả dụng"
                  : "Hết hàng"}
            </span>
          </div>

          {/* Multiple Thumbnails Strip */}
          {item.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {item.images.map((img, i) => {
                const url = img.url || img;
                const isSelected = (activeImage || imageOf(item)) === url;
                return (
                  <button
                    key={url || i}
                    onClick={() => setActiveImage(url)}
                    className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                      isSelected
                        ? "border-red-600 ring-2 ring-red-500/30"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={url}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Pricing, Specifications & Order Action */}
        <section className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-500">
              {vehicle ? "Xe cao cấp tuyển chọn" : "Phụ kiện chính hãng 100%"}
            </div>

            <h1 className="mt-3 text-3xl sm:text-4xl font-black capitalize tracking-tight text-slate-950 dark:text-white">
              {vehicle ? `${item.brand} ${item.model}` : item.name}
            </h1>

            {/* Price Banner */}
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Giá niêm yết chính thức
              </span>
              <div className="mt-1 font-tech text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400">
                {formatVND(item.price)}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Đã bao gồm thuế GTGT & quy trình kiểm định chất lượng tiêu chuẩn.
              </p>
            </div>

            {/* Specifications Card */}
            <div className="card mt-6 divide-y divide-slate-100 p-5 dark:divide-white/[0.06]">
              {vehicle ? (
                <>
                  <SpecRow label="Năm sản xuất" value={item.year} />
                  <SpecRow label="Màu ngoại thất" value={item.color} />
                  <SpecRow label="Số khung (VIN)" value={item.vin || item.vin_number} isTech />
                  <SpecRow label="Tình trạng kỹ thuật" value="Đã kiểm định 160 điểm" />
                </>
              ) : (
                <>
                  <SpecRow label="Mã sản phẩm (SKU)" value={item.sku} isTech />
                  <SpecRow label="Số lượng tồn kho" value={item.stock} />
                  <SpecRow label="Bảo hành" value="12 tháng chính hãng" />
                </>
              )}
              {item.description && (
                <div className="py-3.5 text-xs sm:text-sm">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Mô tả chi tiết</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              )}
            </div>

            {/* Quantity Selector for Accessory */}
            {!vehicle && available && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-900/50">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Số lượng đặt:
                </span>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  className="w-24 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(Number(item.stock), Number(e.target.value))))}
                />
              </div>
            )}
          </div>

          {/* Action Button & Assurance */}
          <div className="mt-8 space-y-3">
            <button
              className="btn-primary w-full py-4 text-base font-black uppercase tracking-wider"
              disabled={!available || ordering}
              onClick={order}
            >
              {ordering ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý đơn hàng...
                </span>
              ) : available ? (
                <span>{vehicle ? "Đặt cọc & Hẹn xem xe" : "Xác nhận đặt hàng"}</span>
              ) : (
                "Hiện không thể đặt"
              )}
            </button>

            <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
              Chuyên viên tư vấn Auto Car sẽ liên hệ trực tiếp trong vòng 15 phút để hoàn tất thủ tục và kiểm định.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

function SpecRow({ label, value, isTech }) {
  return (
    <div className="flex justify-between items-center gap-4 py-3 text-xs sm:text-sm">
      <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      <b className={`text-right text-slate-900 dark:text-white ${isTech ? "font-mono font-bold" : ""}`}>
        {value || "—"}
      </b>
    </div>
  );
}
