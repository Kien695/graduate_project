import { useCallback, useEffect, useState } from "react";
import { getData, postData, putData } from "../../utils/api";
import { toast } from "react-toastify";

const date = value => value ? new Date(value).toLocaleString("vi-VN") : "—";
const status = { completed: "Thành công", processing: "Đang chạy", failed: "Thất bại", expired: "Đã hết hạn" };
const button = "rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50";
export default function BackupPage() {
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const load = useCallback(async () => {
    const [config, backups, logs] = await Promise.all([
      getData("/backups/settings"), getData("/backups"), getData("/backups/history"),
    ]);
    setSettings(config.data); setRecords(backups.data); setHistory(logs.data); setError("");
  }, []);
  useEffect(() => { load().catch(e => setError(e.response?.data?.message || "Không thể tải dữ liệu sao lưu")); }, [load]);
  const run = async (operation, message) => {
    setBusy(true);
    try { await operation(); toast.success(message); await load(); }
    catch (e) { const text = e.response?.data?.message || "Tác vụ chưa được xác nhận hoàn tất. Hãy tải lại lịch sử trước khi thử lại."; setError(text); toast.error(text); }
    finally { setBusy(false); }
  };
  const restore = () => run(async () => {
    await postData(`/backups/${selected.id}/restore`, { confirm: true }, { timeout: 0 });
    setSelected(null); setConfirmation("");
    // A restored database also restores old sessions: require a fresh login.
    localStorage.removeItem("accessToken"); localStorage.removeItem("currentUser");
    window.location.assign("/admin/login");
  }, "Đã phục hồi dữ liệu. Vui lòng đăng nhập lại.");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Sao lưu & phục hồi</h1><p className="mt-1 text-sm text-slate-500">Quản lý lịch sao lưu và khôi phục database khi xảy ra sự cố.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-4 text-lg font-semibold">Lịch sao lưu tự động</h2>
      {settings ? <form onSubmit={e => { e.preventDefault(); run(() => putData("/backups/settings", { enabled: settings.enabled, hour: Number(settings.hour), retention_days: Number(settings.retention_days) }), "Đã lưu lịch sao lưu"); }} className="space-y-4">
        <label className="flex items-center gap-2"><input type="checkbox" disabled={busy} checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} />Bật sao lưu hằng ngày</label>
        <div className="flex flex-wrap gap-5">
          <label>Giờ chạy ({settings.timezone})<select className="ml-3 rounded border bg-transparent p-2" disabled={busy} value={settings.hour} onChange={e => setSettings({ ...settings, hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
          <label>Số ngày lưu<input className="ml-3 w-24 rounded border bg-transparent p-2" type="number" min="1" max="3650" required disabled={busy} value={settings.retention_days} onChange={e => setSettings({ ...settings, retention_days: e.target.value })} /></label>
        </div>
        <p className="text-sm text-slate-500">Lần chạy đã lên lịch: {date(settings.next_run)}. Backend cần hoạt động vào giờ này. Bản sao được lưu trên máy chủ; ảnh lưu trên Cloudinary không nằm trong bản sao database.</p>
        <button className={button} disabled={busy}>Lưu lịch</button>
      </form> : <p>Đang tải cấu hình…</p>}
    </section>
    <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Bản sao lưu</h2><div className="flex gap-2">
        <button className={button} disabled={busy} onClick={() => run(() => postData("/backups", {}, { timeout: 0 }), "Đã tạo bản sao lưu")}>{busy ? "Đang xử lý…" : "Sao lưu ngay"}</button>
        <button className="rounded-lg border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => run(load, "Đã cập nhật danh sách")}>Tải lại</button>
      </div></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="table-head"><tr>{["Tên bản sao", "Ngày tạo", "Dung lượng", "Trạng thái", "Thao tác"].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody className="table-body">
        {records.map(r => <tr key={r.id}><td>{r.file_name}</td><td>{date(r.created_at)}</td><td>{r.size_bytes ? `${(Number(r.size_bytes) / 1024 / 1024).toFixed(2)} MB` : "—"}</td><td>{status[r.status] || r.status}</td><td><button className="font-semibold text-red-600 disabled:opacity-40" disabled={busy || r.status !== "completed"} onClick={() => { setSelected(r); setConfirmation(""); }}>Phục hồi</button></td></tr>)}
        {!records.length && <tr><td colSpan={5} className="p-6 text-center">Chưa có bản sao lưu</td></tr>}
      </tbody></table></div>
    </section>
    <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><h2 className="mb-3 text-lg font-semibold">Lịch sử sao lưu</h2>
      <div className="max-h-72 overflow-auto text-sm">{history.map(h => <div key={h.id} className="flex flex-wrap justify-between gap-2 border-b py-3"><span>{h.file_name}</span><span>{date(h.created_at)} · {status[h.status] || h.status}</span></div>)}{!history.length && <p>Chưa có lịch sử</p>}</div>
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="restore-title" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 dark:bg-slate-800">
      <h2 id="restore-title" className="text-xl font-bold">Xác nhận phục hồi dữ liệu</h2>
      <p>Bản sao: <strong className="break-all">{selected.file_name}</strong> ({date(selected.created_at)}).</p>
      <p className="text-red-600">Dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu tại thời điểm sao lưu. Các thay đổi sau thời điểm đó sẽ mất. Hãy dừng thao tác của người dùng và tạo bản sao mới trước khi tiếp tục.</p>
      <label className="block">Nhập PHUC HOI để xác nhận<input autoFocus className="mt-2 w-full rounded border bg-transparent p-2" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></label>
      <div className="flex justify-end gap-3"><button disabled={busy} onClick={() => setSelected(null)}>Hủy</button><button className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-40" disabled={busy || confirmation !== "PHUC HOI"} onClick={restore}>{busy ? "Đang phục hồi…" : "Phục hồi dữ liệu"}</button></div>
    </section></div>}
  </div>;
}
