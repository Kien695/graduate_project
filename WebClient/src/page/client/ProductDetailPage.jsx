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
  const navigate = useNavigate();
  const load = () => {
    setLoading(true);
    (vehicle ? getVehicle(id) : getAccessory(id))
      .then(setItem)
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
      <div className="container-page py-10">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  const available = vehicle
    ? String(item.status).toUpperCase() === "AVAILABLE"
    : Number(item.stock) > 0;
  return (
    <div className="container-page py-8">
      <Link
        to={vehicle ? "/vehicles" : "/accessories"}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500"
      >
        <Icon name="back" />
        Quay lại
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <div className="card aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
            {imageOf(item) ? (
              <img
                src={imageOf(item)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-slate-400">
                <Icon name={vehicle ? "car" : "box"} className="h-24 w-24" />
              </div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {item.images.map((img, i) => (
                <img
                  key={img.url || i}
                  src={img.url}
                  className="aspect-square rounded-xl object-cover"
                  alt=""
                />
              ))}
            </div>
          )}
        </section>
        <section>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-red-700">
            {vehicle ? "Xe cao cấp" : "Phụ kiện chính hãng"}
          </p>
          <h1 className="mt-3 text-3xl font-black capitalize">
            {vehicle ? `${item.brand} ${item.model}` : item.name}
          </h1>
          <p className="mt-4 text-3xl font-black text-red-700 dark:text-red-400">
            {formatVND(item.price)}
          </p>
          <p
            className={`mt-3 text-sm font-bold ${available ? "text-emerald-600" : "text-slate-500"}`}
          >
            ●{" "}
            {available
              ? `Còn hàng${vehicle ? "" : ` (${item.stock})`}`
              : vehicle
                ? "Không khả dụng"
                : "Hết hàng"}
          </p>
          <div className="card mt-7 divide-y p-5 dark:divide-slate-800">
            {vehicle ? (
              <>
                <Row label="Năm sản xuất" value={item.year} />
                <Row label="Màu sắc" value={item.color} />
                <Row label="Số khung" value={item.vin || item.vin_number} />
              </>
            ) : (
              <>
                <Row label="Mã sản phẩm" value={item.sku} />
                <Row label="Tồn kho" value={item.stock} />
              </>
            )}
            <Row label="Mô tả" value={item.description} />
          </div>
          {!vehicle && available && (
            <label className="mt-6 block text-sm font-bold">
              Số lượng
              <input
                type="number"
                min="1"
                max={item.stock}
                className="field mt-2 w-32"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
          )}
          <button
            className="btn-primary mt-7 w-full"
            disabled={!available || ordering}
            onClick={order}
          >
            {ordering
              ? "Đang xử lý..."
              : available
                ? "Đặt hàng ngay"
                : "Hiện không thể đặt"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Nhân viên Auto Car sẽ liên hệ để xác nhận và hướng dẫn các bước tiếp
            theo.
          </p>
        </section>
      </div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className="max-w-[65%] text-right">{value || "—"}</b>
    </div>
  );
}
