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
    if (!window.confirm("Bạn đã đọc và đồng ý xác nhận các điều khoản của hợp đồng này?")) return;
    setWorking(true);
    try {
      setItem(await confirmContract(id));
      toast.success("Đã xác nhận hợp đồng thành công.");
    } catch (e) {
      toast.error(apiMessage(e, "Không thể xác nhận hợp đồng."));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!item)
    return (
      <div className="container-page py-12">
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  const canConfirm = String(item.status).toUpperCase() === "APPROVED";

  return (
    <div className="container-page max-w-5xl py-12">
      {/* Back Button */}
      <Link
        to="/contracts"
        className="group mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-1">
          &larr;
        </span>
        <span>Quay lại danh sách hợp đồng</span>
      </Link>

      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        
        {/* Left Column: Vehicle & Price Card */}
        <div>
          <div className="card overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-black/40">
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
            <div className="p-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400">
                Phương tiện theo hợp đồng
              </span>
              <h2 className="mt-1 text-2xl font-black capitalize text-slate-950 dark:text-white">
                {item.brand} {item.model}
              </h2>
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Tổng giá trị bàn giao
                </span>
                <p className="font-tech text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">
                  {formatVND(item.total_amount || item.vehicle_price)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contract Metadata & Terms Sheet */}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5 dark:border-white/[0.06]">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Mã văn bản điện tử
              </p>
              <h1 className="mt-1 font-tech text-2xl font-black text-slate-950 dark:text-white">
                {item.contract_number}
              </h1>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="mt-6 divide-y divide-slate-100 dark:divide-white/[0.06]">
            <ContractRow label="Khách hàng thụ hưởng" value={item.customer_name} />
            <ContractRow label="Email xác thực" value={item.customer_email} isTech />
            <ContractRow label="Ngày khởi tạo văn bản" value={formatDate(item.created_at)} />
            <ContractRow label="Thời điểm ký kết" value={formatDate(item.signed_at)} />
          </div>

          {/* Terms & Conditions Sheet */}
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>📄</span> Điều khoản hợp đồng
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {item.terms || "Chưa có nội dung điều khoản đính kèm cho hợp đồng này."}
            </p>
          </div>

          {/* Confirm Action */}
          {canConfirm && (
            <div className="mt-8">
              <button
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider"
                disabled={working}
                onClick={confirm}
              >
                {working ? "Đang xử lý xác nhận..." : "Tôi đồng ý xác nhận hợp đồng này"}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Hành động này mang giá trị xác thực điện tử trực tuyến.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ContractRow({ label, value, isTech }) {
  return (
    <div className="flex justify-between items-center gap-4 py-3 text-xs sm:text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <b className={`text-right text-slate-900 dark:text-white ${isTech ? "font-mono" : ""}`}>
        {value || "—"}
      </b>
    </div>
  );
}
