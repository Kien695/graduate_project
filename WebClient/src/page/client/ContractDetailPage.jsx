import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { confirmContract, getContract } from "../../api/customer.api";
import StatusBadge from "../../components/common/StatusBadge";
import { ErrorState, LoadingState } from "../../components/common/States";
import Icon from "../../components/common/Icon";
import { apiMessage, formatDate, formatVND, imageOf } from "../../utils/format";
export default function ContractDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    getContract(id)
      .then(setItem)
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải hợp đồng."),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);
  const confirm = async () => {
    if (!window.confirm("Bạn đã đọc và đồng ý xác nhận hợp đồng này?")) return;
    setWorking(true);
    try {
      setItem(await confirmContract(id));
      toast.success("Đã xác nhận hợp đồng.");
    } catch (e) {
      toast.error(apiMessage(e, "Không thể xác nhận hợp đồng."));
    } finally {
      setWorking(false);
    }
  };
  if (loading) return <LoadingState />;
  if (!item)
    return (
      <div className="container-page py-10">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  const canConfirm = String(item.status).toUpperCase() === "APPROVED";
  return (
    <div className="container-page max-w-5xl py-8">
      <Link
        to="/contracts"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500"
      >
        <Icon name="back" />
        Hợp đồng
      </Link>
      <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="card aspect-[4/3] overflow-hidden bg-slate-100">
            {imageOf(item) ? (
              <img
                src={imageOf(item)}
                className="h-full w-full object-cover"
                alt=""
              />
            ) : (
              <div className="grid h-full place-items-center">
                <Icon name="car" className="h-20 w-20 text-slate-400" />
              </div>
            )}
          </div>
          <h2 className="mt-5 text-2xl font-black capitalize">
            {item.brand} {item.model}
          </h2>
          <p className="mt-2 text-2xl font-black text-red-700">
            {formatVND(item.total_amount || item.vehicle_price)}
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Mã hợp đồng
              </p>
              <h1 className="mt-2 text-2xl font-black">
                {item.contract_number}
              </h1>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-7 divide-y dark:divide-slate-800">
            <Row label="Khách hàng" value={item.customer_name} />
            <Row label="Email" value={item.customer_email} />
            <Row label="Ngày tạo" value={formatDate(item.created_at)} />
            <Row label="Ngày ký" value={formatDate(item.signed_at)} />
          </div>
          <div className="mt-7 rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
            <h3 className="font-black">Điều khoản</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
              {item.terms || "Chưa có điều khoản hợp đồng."}
            </p>
          </div>
          {canConfirm && (
            <button
              className="btn-primary mt-7 w-full"
              disabled={working}
              onClick={confirm}
            >
              {working ? "Đang xác nhận..." : "Xác nhận hợp đồng"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className="text-right">{value || "—"}</b>
    </div>
  );
}
