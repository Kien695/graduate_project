import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  approveContract,
  cancelContract,
  createContract,
  fetchContracts,
  payContract,
  signContract,
  updateContract,
  updateContractSecurity,
} from "../../redux/slices/contractSlice";
import { getData } from "../../utils/api";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import LoadingState from "../common/LoadingState";
import { Icon } from "../common/Icons";

const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
const emptyContract = {
  order_id: "",
  contract_number: "",
  terms: "",
  security_level_id: "",
};
const emptyPayment = { amount: "", method: "bank_transfer", reference: "" };

export default function ContractManager() {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector((s) => s.contracts);
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(emptyContract);
  const [orders, setOrders] = useState([]),
    [levels, setLevels] = useState([]),
    [paying, setPaying] = useState(null),
    [payment, setPayment] = useState(emptyPayment);
  const [detail, setDetail] = useState(null),
    [logs, setLogs] = useState([]),
    [detailLoading, setDetailLoading] = useState(false),
    [securityLevel, setSecurityLevel] = useState("");
  useEffect(() => {
    dispatch(fetchContracts());
    Promise.all([getData("/orders"), getData("/security-levels")])
      .then(([o, l]) => {
        setOrders(o.data || []);
        setLevels(l.data || []);
      })
      .catch((e) =>
        toast.error(
          e.response?.data?.message || "Không thể tải dữ liệu tạo hợp đồng",
        ),
      );
  }, [dispatch]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const filtered = useMemo(
    () =>
      items.filter((x) =>
        [
          x.contract_number,
          x.customer_name,
          x.vehicle_brand,
          x.vehicle_model,
          x.status,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      ),
    [items, search],
  );
  const refresh = () => dispatch(fetchContracts());
  const run = async (thunk, payload, message) => {
    try {
      await dispatch(thunk(payload)).unwrap();
      toast.success(message);
      await refresh();
    } catch {}
  };
  const openCreate = () => {
    setEditing(null);
    setForm(emptyContract);
    setFormOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      order_id: c.order_id,
      contract_number: c.contract_number || "",
      terms: c.terms || "",
      security_level_id: c.security_level_id || "",
    });
    setFormOpen(true);
  };
  const submitContract = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      order_id: Number(form.order_id),
      security_level_id: Number(form.security_level_id),
    };
    try {
      if (editing)
        await dispatch(
          updateContract({
            id: editing.id,
            data: { contract_number: data.contract_number, terms: data.terms },
          }),
        ).unwrap();
      else await dispatch(createContract(data)).unwrap();
      toast.success(editing ? "Đã cập nhật hợp đồng" : "Đã tạo hợp đồng");
      setFormOpen(false);
      await refresh();
    } catch {}
  };
  const openDetail = async (c) => {
    setDetailLoading(true);
    setDetail(c);
    setLogs([]);
    try {
      const [d, a] = await Promise.all([
        getData(`/contracts/${c.id}`),
        getData(`/contracts/${c.id}/audit-logs`),
      ]);
      setDetail(d.data);
      setSecurityLevel(String(d.data.security_level_id || ""));
      setLogs(a.data?.items || []);
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Không thể tải chi tiết hợp đồng",
      );
    } finally {
      setDetailLoading(false);
    }
  };
  const assignSecurity = async () => {
    try {
      await dispatch(
        updateContractSecurity({
          id: detail.id,
          data: { securityLevelId: Number(securityLevel) },
        }),
      ).unwrap();
      toast.success("Đã cập nhật nhãn bảo mật MAC");
      await openDetail(detail);
      await refresh();
    } catch {}
  };
  const submitPay = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        payContract({
          id: paying.id,
          data: { ...payment, amount: Number(payment.amount) },
        }),
      ).unwrap();
      setPaying(null);
      setPayment(emptyPayment);
      toast.success("Thanh toán thành công");
      await refresh();
    } catch {}
  };
  const confirmedOrders = orders.filter(
    (o) =>
      String(o.status).toLowerCase() === "confirmed" &&
      !items.some((c) => c.order_id === o.id && c.id !== editing?.id),
  );
  return (
    <>
      <TableShell
        title="Danh sách hợp đồng"
        subtitle="Tạo, duyệt, ký, thanh toán và quản lý bảo mật hợp đồng"
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onAdd={openCreate}
        addLabel="Tạo hợp đồng"
      >
        {loading ? (
          <LoadingState />
        ) : (
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="table-head">
              <tr>
                {[
                  "Mã hợp đồng",
                  "Khách hàng / Xe",
                  "Ngày tạo",
                  "Tổng tiền",
                  "Đã thanh toán",
                  "Nhãn MAC",
                  "Trạng thái",
                  "Thao tác",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="table-body">
              {filtered.slice((page - 1) * 7, page * 7).map((c) => (
                <tr key={c.id}>
                  <td className="font-bold text-slate-900 dark:text-white">
                    {c.contract_number}
                  </td>
                  <td>
                    <div className="font-semibold">
                      {c.customer_name || `Đơn hàng #${c.order_id}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      {[c.vehicle_brand, c.vehicle_model, c.vin]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString("vi-VN")}</td>
                  <td>{money(c.total_amount || c.order_total_amount)}</td>
                  <td>{money(c.paid_amount)}</td>
                  <td>
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                      {c.security_level_name || "—"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge value={c.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <button
                        onClick={() => openDetail(c)}
                        className="action-green"
                        title="Chi tiết"
                      >
                        <Icon name="eye" className="h-4 w-4" />
                      </button>
                      {["draft", "approved"].includes(c.status) && (
                        <button
                          onClick={() => openEdit(c)}
                          className="action-blue"
                          title="Sửa"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                      )}
                      {c.status === "draft" && (
                        <button
                          onClick={() =>
                            run(approveContract, c.id, "Đã duyệt hợp đồng")
                          }
                          className="action-blue"
                        >
                          Duyệt
                        </button>
                      )}
                      {c.status === "approved" && (
                        <button
                          onClick={() =>
                            run(signContract, c.id, "Đã ký hợp đồng")
                          }
                          className="action-green"
                        >
                          Ký
                        </button>
                      )}
                      {["approved", "signed"].includes(c.status) && (
                        <button
                          onClick={() => {
                            setPaying(c);
                            setPayment(emptyPayment);
                          }}
                          className="action-blue"
                        >
                          Thanh toán
                        </button>
                      )}
                      {["draft", "approved"].includes(c.status) && (
                        <button
                          onClick={() =>
                            window.confirm(
                              `Hủy hợp đồng ${c.contract_number}?`,
                            ) && run(cancelContract, c.id, "Đã hủy hợp đồng")
                          }
                          className="action-red"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    Không có hợp đồng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={7}
          onChange={setPage}
        />
      </TableShell>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Cập nhật hợp đồng" : "Tạo hợp đồng mới"}
      >
        <form onSubmit={submitContract} className="space-y-4">
          <label className="block text-xs font-bold">
            Đơn hàng đã xác nhận *
            <select
              disabled={Boolean(editing)}
              required
              className="form-control mt-2"
              value={form.order_id}
              onChange={(e) => setForm({ ...form, order_id: e.target.value })}
            >
              <option value="">Chọn đơn hàng</option>
              {editing && (
                <option value={editing.order_id}>
                  Đơn hàng #{editing.order_id}
                </option>
              )}
              {confirmedOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.id} · {o.customer_name} · {o.brand} {o.model} ·{" "}
                  {money(o.total_amount)}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Mã hợp đồng (để trống để tự sinh)"
            value={form.contract_number}
            set={(v) => setForm({ ...form, contract_number: v })}
          />
          <label className="block text-xs font-bold">
            Điều khoản
            <textarea
              required
              rows="5"
              className="form-control mt-2"
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold">
            Nhãn bảo mật MAC *
            <select
              disabled={Boolean(editing)}
              required
              className="form-control mt-2"
              value={form.security_level_id}
              onChange={(e) =>
                setForm({ ...form, security_level_id: e.target.value })
              }
            >
              <option value="">Chọn nhãn bảo mật</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.level_name} (rank {l.rank})
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Đang lưu..." : "Lưu hợp đồng"}
          </button>
        </form>
      </Modal>

      <Modal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title={`Thanh toán ${paying?.contract_number || ""}`}
      >
        <form onSubmit={submitPay} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <div className="flex justify-between">
              <span>Còn phải thanh toán</span>
              <b>
                {money(
                  Number(paying?.total_amount || paying?.order_total_amount) -
                    Number(paying?.paid_amount),
                )}
              </b>
            </div>
          </div>
          <Field
            label="Số tiền"
            type="number"
            min="1"
            max={
              Number(paying?.total_amount || paying?.order_total_amount) -
              Number(paying?.paid_amount)
            }
            value={payment.amount}
            set={(v) => setPayment({ ...payment, amount: v })}
          />
          <label className="block text-xs font-bold">
            Phương thức
            <select
              className="form-control mt-2"
              value={payment.method}
              onChange={(e) =>
                setPayment({ ...payment, method: e.target.value })
              }
            >
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
              <option value="card">Thẻ</option>
            </select>
          </label>
          <Field
            label="Mã tham chiếu"
            value={payment.reference}
            set={(v) => setPayment({ ...payment, reference: v })}
          />
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Xác nhận thanh toán
          </button>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Chi tiết ${detail?.contract_number || ""}`}
        size="max-w-4xl"
      >
        {detailLoading ? (
          <LoadingState />
        ) : (
          detail && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Khách hàng" value={detail.customer_name} />
                <Info
                  label="Xe"
                  value={`${detail.vehicle_brand || ""} ${detail.vehicle_model || ""}`}
                />
                <Info
                  label="Tổng tiền"
                  value={money(
                    detail.total_amount || detail.order_total_amount,
                  )}
                />
                <Info label="Đã thanh toán" value={money(detail.paid_amount)} />
                <Info label="VIN" value={detail.vin} />
                <Info label="Trạng thái" value={detail.status} />
                <Info
                  label="Ngày duyệt"
                  value={
                    detail.approved_at
                      ? new Date(detail.approved_at).toLocaleString("vi-VN")
                      : "—"
                  }
                />
                <Info
                  label="Ngày ký"
                  value={
                    detail.signed_at
                      ? new Date(detail.signed_at).toLocaleString("vi-VN")
                      : "—"
                  }
                />
              </div>
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                  Điều khoản
                </h3>
                <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                  {detail.terms || "Chưa có điều khoản"}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                  Nhãn bảo mật MAC
                </h3>
                <div className="flex gap-2">
                  <select
                    className="form-control"
                    value={securityLevel}
                    onChange={(e) => setSecurityLevel(e.target.value)}
                  >
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.level_name} (rank {l.rank})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={assignSecurity}
                    className="rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
                  >
                    Cập nhật
                  </button>
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                  Lịch sử thanh toán
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="table-head">
                      <tr>
                        <th>Số tiền</th>
                        <th>Phương thức</th>
                        <th>Tham chiếu</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {(detail.payments || []).map((p) => (
                        <tr key={p.id}>
                          <td>{money(p.amount)}</td>
                          <td>{p.method || "—"}</td>
                          <td>{p.reference || "—"}</td>
                          <td>{new Date(p.paid_at).toLocaleString("vi-VN")}</td>
                        </tr>
                      ))}
                      {!detail.payments?.length && (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center text-slate-400"
                          >
                            Chưa có thanh toán
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">
                  Audit log
                </h3>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900"
                    >
                      <b>{log.action}</b>
                      <span>
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  ))}
                  {!logs.length && (
                    <p className="text-sm text-slate-400">Chưa có lịch sử.</p>
                  )}
                </div>
              </section>
            </div>
          )
        )}
      </Modal>
    </>
  );
}

function Field({ label, value, set, type = "text", min, max }) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <input
        required={type === "number"}
        className="form-control mt-2"
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}
