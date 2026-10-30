import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getData, postData } from "../../utils/api";
import { useSelector } from "react-redux";
import PageHeader from "../../components/common/PageHeader";
import { hasRole } from "../../utils/adminAccess";

const POLL_MS = 5000;
const date = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const num = (value, digits = 1) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "—";
const METRIC_LABEL = {
  cpu_percent: "CPU (%)",
  memory_percent: "RAM (%)",
  load_per_core: "Tải CPU / nhân",
  p95_latency_ms: "Độ trễ p95 (ms)",
  db_pool_percent: "Phiên cơ sở dữ liệu (%)",
};
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

function Meter({ label, value, unit, percent, warn, hint }) {
  const width = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-800 ${warn ? "border-rose-400" : "border-slate-200 dark:border-slate-700"}`}
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
        {value}
        <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>
      </p>
      {percent !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full ${warn ? "bg-rose-500" : "bg-blue-600"}`}
            style={{ width: `${width}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function MonitoringPage() {
  const user = useSelector((state) => state.auth.user);
  const isAdmin = hasRole(user, ["ADMIN"]);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (withAlerts = true) => {
    try {
      const [state, list] = await Promise.all([
        getData("/monitoring/server/status"),
        withAlerts ? getData("/monitoring/alerts") : Promise.resolve(null),
      ]);
      setStatus(state.data);
      if (list) setAlerts(list.data);
      setForm((current) =>
        current || {
          cpuThreshold: state.data.thresholds.cpu_threshold,
          memoryThreshold: state.data.thresholds.memory_threshold,
          loadThreshold: state.data.thresholds.load_threshold,
          responseTimeThresholdMs: state.data.thresholds.response_time_threshold_ms,
          dbPoolThreshold: state.data.thresholds.db_pool_threshold,
        },
      );
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Không thể tải số liệu giám sát");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(true);
    })();
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      load(tick % 6 === 0);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await postData("/monitoring/alerts/config", {
        cpuThreshold: Number(form.cpuThreshold),
        memoryThreshold: Number(form.memoryThreshold),
        loadThreshold: Number(form.loadThreshold),
        responseTimeThresholdMs: Number(form.responseTimeThresholdMs),
        dbPoolThreshold: Number(form.dbPoolThreshold),
      });
      toast.success("Đã lưu ngưỡng cảnh báo");
      await load(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  if (!status)
    return (
      <>
        <PageHeader title="Giám sát hệ thống" description="Tình trạng máy chủ và cảnh báo quá tải" />
        <p className="text-sm text-slate-500">{error || "Đang tải số liệu..."}</p>
      </>
    );

  const t = status.thresholds;
  const over = (metric) => status.breaches.some((b) => b.metric === metric);
  const req = status.requests;
  const db = status.database;

  return (
    <>
      <PageHeader
        title="Giám sát hệ thống"
        description={`Cập nhật mỗi ${POLL_MS / 1000} giây · máy chủ ${status.hostname} · hoạt động ${Math.round(status.processUptimeSeconds / 60)} phút`}
      />
      {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {status.breaches.length > 0 ? (
        <div className="mb-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          <b>Đang vượt ngưỡng:</b>{" "}
          {status.breaches
            .map((b) => `${METRIC_LABEL[b.metric]} = ${num(b.value, 2)} (ngưỡng ${num(b.threshold, 2)})`)
            .join(" · ")}
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Hệ thống trong ngưỡng an toàn.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Meter label="CPU" value={num(status.cpu.usagePercent)} unit="%" percent={status.cpu.usagePercent}
          warn={over("cpu_percent")} hint={`${status.cpu.cores} nhân · ngưỡng ${t.cpu_threshold}%`} />
        <Meter label={`RAM (${status.memory.source === "container" ? "container" : "máy chủ"})`}
          value={num(status.memory.usagePercent)} unit="%" percent={status.memory.usagePercent}
          warn={over("memory_percent")} hint={`${num(status.memory.usedBytes / 1048576, 0)} / ${num(status.memory.totalBytes / 1048576, 0)} MB`} />
        <Meter label="Tải CPU / nhân (1 phút)" value={num(status.load.loadPerCore, 2)} unit=""
          warn={over("load_per_core")} hint={`ngưỡng ${t.load_threshold}`} />
        <Meter label={`Độ trễ p95 (${req.windowSeconds}s gần nhất)`} value={num(req.p95LatencyMs, 0)} unit="ms"
          warn={over("p95_latency_ms")} hint={`ngưỡng ${t.response_time_threshold_ms} ms · ${req.windowRequestCount} yêu cầu`} />
        <Meter label="Yêu cầu / giây" value={num(req.requestsPerSecond, 2)} unit="req/s"
          hint={`Lỗi 5xx: ${req.windowErrorCount} trong cửa sổ, ${req.errorCount} tổng`} />
        <Meter label="Phiên cơ sở dữ liệu đang mở" value={`${db.sessionPools} / ${db.sessionPoolLimit}`} unit=""
          percent={db.sessionPoolPercent} warn={over("db_pool_percent")} hint={`ngưỡng ${t.db_pool_threshold}%`} />
        <Meter label="Kết nối pool hệ thống"
          value={`${db.totalConnections - db.idleConnections} / ${db.systemPoolMax}`} unit="đang dùng"
          hint={`${db.idleConnections} rảnh · ${db.waitingRequests} đang chờ`} warn={db.waitingRequests > 0} />
        <Meter label="Độ trễ trung bình (từ lúc khởi động)" value={num(req.averageLatencyMs, 0)} unit="ms"
          hint={`${req.requestCount} yêu cầu`} />
      </div>

      <form onSubmit={save} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Ngưỡng cảnh báo</h2>
        <p className="mb-4 text-xs text-slate-500">
          Cảnh báo chỉ gửi khi vượt ngưỡng liên tiếp 2 lần kiểm tra (mỗi phút). {isAdmin ? "" : "Chỉ quản trị viên được thay đổi."}
        </p>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["cpuThreshold", "CPU (%)"],
              ["memoryThreshold", "RAM (%)"],
              ["loadThreshold", "Tải / nhân"],
              ["responseTimeThresholdMs", "Độ trễ p95 (ms)"],
              ["dbPoolThreshold", "Phiên CSDL (%)"],
            ].map(([key, label]) => (
              <label key={key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {label}
                <input type="number" min="0" step="any" disabled={!isAdmin} className={`${inputClass} mt-1`}
                  value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </label>
            ))}
          </div>
        )}
        {isAdmin && (
          <button disabled={saving} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu ngưỡng"}
          </button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="p-5 pb-3 text-base font-bold text-slate-900 dark:text-white">Lịch sử cảnh báo</h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="table-head">
            <tr>{["Thời gian", "Chỉ số", "Giá trị đo", "Ngưỡng", "Gửi"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody className="table-body">
            {alerts.length === 0 && (
              <tr><td colSpan={5} className="p-5 text-center text-slate-500">Chưa có cảnh báo nào</td></tr>
            )}
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{date(a.created_at)}</td>
                <td>{METRIC_LABEL[a.metric] || a.metric}</td>
                <td>{num(a.measured_value, 2)}</td>
                <td>{num(a.threshold_value, 2)}</td>
                <td>{a.delivery_status === "logged" ? "Chỉ ghi log" : a.delivery_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
