import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { createInspection, fetchInspections } from "../../redux/slices/inspectionSlice";
import { getData } from "../../utils/api";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import LoadingState from "../common/LoadingState";
import { Icon } from "../common/Icons";
import InspectionDetailModal from "./InspectionDetailModal";

const emptyForm = { vehicle_id: "", notes: "" };

export default function InspectionManager() {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector((state) => state.inspections);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { dispatch(fetchInspections()); }, [dispatch]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const filtered = useMemo(
    () => items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const openCreate = async () => {
    setForm(emptyForm);
    setFormOpen(true);
    if (vehicles.length) return;
    setVehiclesLoading(true);
    try { setVehicles((await getData("/vehicles")).data || []); }
    catch (requestError) { toast.error(requestError.response?.data?.message || "Không thể tải danh sách xe"); }
    finally { setVehiclesLoading(false); }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    if (!detail) setDetail({ id });
    try { setDetail((await getData(`/inspections/${id}`)).data); }
    catch (requestError) { toast.error(requestError.response?.data?.message || "Không thể tải chi tiết kiểm định"); }
    finally { setDetailLoading(false); }
  };

  const submitInspection = async (event) => {
    event.preventDefault();
    try {
      const created = await dispatch(createInspection({ vehicle_id: Number(form.vehicle_id), notes: form.notes.trim() || null })).unwrap();
      toast.success("Đã tạo phiếu kiểm định");
      setFormOpen(false);
      setForm(emptyForm);
      await dispatch(fetchInspections());
      await openDetail(created.id);
    } catch {
      // The API message is surfaced by the slice error toast.
    }
  };

  return <>
    <TableShell title="Kiểm định xe" subtitle="Theo dõi checklist, kết quả và hình ảnh kiểm định" search={search} setSearch={(value) => { setSearch(value); setPage(1); }} onAdd={openCreate} addLabel="Thêm kiểm định">
      {loading ? <LoadingState /> : <table className="w-full min-w-[950px] text-left text-sm">
        <thead className="table-head"><tr>{["Mã kiểm định", "Xe", "Đơn hàng", "Người kiểm định", "Ngày kiểm định", "Kết quả", "Thao tác"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody className="table-body">
          {filtered.slice((page - 1) * 7, page * 7).map((inspection) => <tr key={inspection.id}>
            <td className="font-bold text-slate-900">KD{String(inspection.id).padStart(5, "0")}</td>
            <td><div className="font-semibold">{inspection.brand} {inspection.model}</div><div className="text-xs text-slate-400">{inspection.vin || `Xe #${inspection.vehicle_id}`}</div></td>
            <td>{inspection.order_number ? `DH${String(inspection.order_number).padStart(5, "0")}` : "—"}</td>
            <td>{inspection.inspector_name || `NV #${inspection.inspector_id}`}</td>
            <td>{new Date(inspection.inspected_at || inspection.created_at).toLocaleDateString("vi-VN")}</td>
            <td><StatusBadge value={inspection.status} /></td>
            <td><button type="button" onClick={() => openDetail(inspection.id)} className="action-green inline-flex items-center gap-1.5 px-3 py-2" title="Xem chi tiết"><Icon name="eye" className="h-4 w-4" /><span>Xem chi tiết</span></button></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan="7" className="py-16 text-center text-slate-400">Không có phiếu kiểm định</td></tr>}
        </tbody>
      </table>}
      <Pagination page={page} total={filtered.length} pageSize={7} onChange={setPage} />
    </TableShell>

    <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Thêm phiếu kiểm định">
      <form onSubmit={submitInspection} className="space-y-5">
        <label className="block text-xs font-bold text-slate-700">Xe cần kiểm định *<select required disabled={vehiclesLoading} className="form-control mt-2" value={form.vehicle_id} onChange={(event) => setForm({ ...form, vehicle_id: event.target.value })}><option value="">{vehiclesLoading ? "Đang tải danh sách xe..." : "Chọn xe"}</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{[vehicle.brand, vehicle.model, vehicle.vin].filter(Boolean).join(" · ")} · {String(vehicle.status || "").toUpperCase()}</option>)}</select></label>
        <label className="block text-xs font-bold text-slate-700">Ghi chú<textarea rows="4" className="form-control mt-2" placeholder="Nhập nội dung cần lưu ý khi kiểm định..." value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">Người kiểm định được xác định tự động từ tài khoản Staff/Admin đang đăng nhập. Phiếu mới có trạng thái chờ kiểm định.</div>
        <button disabled={submitting || vehiclesLoading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Đang tạo..." : "Tạo phiếu kiểm định"}</button>
      </form>
    </Modal>

    <InspectionDetailModal key={`${detail?.id || "none"}-${detail?.updated_at || "loading"}-${detail?.images?.length || 0}`} inspection={detail} loading={detailLoading} onClose={() => setDetail(null)} onRefresh={openDetail} />
  </>;
}
