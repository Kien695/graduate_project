import { useEffect, useMemo, useState } from "react";
import { getData } from "../../utils/api";
import LoadingState from "../common/LoadingState";
import StatusBadge from "../common/StatusBadge";
import StatCard from "../common/StatCard";
const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
const date = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
export default function DashboardOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    getData("/dashboard")
      .then((response) => setOverview(response.data))
      .catch((e) => setError(e.response?.data?.message || "Không thể tải Dashboard"))
      .finally(() => setLoading(false));
  }, []);
  const orders = overview?.recent_orders || [];
  const contracts = overview?.recent_contracts || [];
  const status = overview?.order_status || {};
  const chart = useMemo(() => {
    return (overview?.revenue_chart || []).map((item) => {
      const d = new Date(item.period_start);
      return [`${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`, Number(item.amount)];
    }).reverse();
  }, [overview]);
  const max = Math.max(...chart.map((x) => x[1]), 1);
  const cards = [
    [
      "car",
      "Tổng xe trong kho",
      Number(overview?.vehicle_count || 0),
      "text-blue-600 bg-blue-50",
      "/admin/vehicles",
    ],
    [
      "orders",
      "Đơn đặt hàng",
      Number(overview?.order_count || 0),
      "text-amber-600 bg-amber-50",
      "/admin/orders",
    ],
    [
      "contract",
      "Hợp đồng",
      Number(overview?.contract_count || 0),
      "text-violet-600 bg-violet-50",
      "/admin/contracts",
    ],
    [
      "dashboard",
      "Doanh thu",
      money(overview?.revenue),
      "text-emerald-600 bg-emerald-50",
      "/admin/contracts",
    ],
  ];
  if (loading) return <LoadingState />;
  if (error)
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center font-semibold text-rose-700">{error}</div>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([icon, label, value, color, to]) => (
          <StatCard
            key={label}
            icon={icon}
            label={label}
            value={value}
            color={color}
            to={to}
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Doanh thu theo thời gian
          </h3>
          <p className="text-xs text-slate-400">Tổng thanh toán hợp đồng</p>
          <div className="mt-8 flex h-52 items-end gap-4 border-b border-l border-slate-200 px-4 dark:border-slate-700">
            {chart.length ? (
              chart.map(([label, value]) => (
                <div
                  key={label}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                >
                  <div
                    title={money(value)}
                    className="min-h-1 rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400"
                    style={{ height: `${Math.max(5, (value / max) * 90)}%` }}
                  />
                  <span className="pb-2 text-center text-[10px] font-semibold text-slate-400">
                    {label}
                  </span>
                </div>
              ))
            ) : (
              <div className="m-auto text-sm text-slate-400">
                Chưa có dữ liệu doanh thu
              </div>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Tỷ lệ đơn hàng
          </h3>
          <p className="text-xs text-slate-400">Phân bổ theo trạng thái</p>
          <div className="mt-7 flex items-center justify-center gap-8">
            <div
              className="grid h-36 w-36 place-items-center rounded-full"
              style={{
                background: Number(overview?.order_count)
                  ? `conic-gradient(#2563eb 0 ${((status.confirmed || 0) / Number(overview.order_count)) * 100}%,#10b981 0 ${(((status.confirmed || 0) + (status.completed || 0)) / Number(overview.order_count)) * 100}%,#f59e0b 0 ${(((status.confirmed || 0) + (status.completed || 0) + (status.pending || 0)) / Number(overview.order_count)) * 100}%,#f43f5e 0)`
                  : "#e2e8f0",
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white dark:bg-slate-800">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {overview?.order_count || 0}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              {[
                ["confirmed", "Đã xác nhận", "bg-blue-600"],
                ["completed", "Hoàn tất", "bg-emerald-500"],
                ["pending", "Đang chờ", "bg-amber-500"],
                ["cancelled", "Đã hủy", "bg-rose-500"],
              ].map(([k, l, c]) => (
                <div key={k} className="flex items-center gap-2">
                  <i className={`h-2.5 w-2.5 rounded-full ${c}`} />
                  <span>
                    {l}: <b>{status[k] || 0}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <MiniTable
          title="Đơn hàng mới nhất"
          headers={["Khách hàng", "Xe", "Ngày", "Trạng thái"]}
          rows={orders
            .slice(0, 5)
            .map((o) => [
              o.customer_name || `KH #${o.customer_id}`,
              `${o.brand || ""} ${o.model || `Xe #${o.vehicle_id}`}`,
              date(o.created_at),
              <StatusBadge key={o.id} value={o.status} />,
            ])}
        />
        <MiniTable
          title="Hợp đồng gần nhất"
          headers={["Mã hợp đồng", "Đơn hàng", "Thanh toán", "Trạng thái"]}
          rows={contracts
            .slice(0, 5)
            .map((c) => [
              c.contract_number || `HD #${c.id}`,
              `#${c.order_id}`,
              money(c.paid_amount),
              <StatusBadge key={c.id} value={c.status} />,
            ])}
        />
      </div>
    </div>
  );
}
function MiniTable({ title, headers, rows }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900 dark:border-slate-700 dark:text-white">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 dark:bg-slate-900">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.length ? (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((v, j) => (
                    <td
                      key={j}
                      className="px-5 py-3 text-slate-600 dark:text-slate-300"
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-8 text-center text-slate-400"
                >
                  Chưa có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
