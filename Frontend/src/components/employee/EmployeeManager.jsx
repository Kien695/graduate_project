import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getData, patchData, postData, putData } from "../../utils/api";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import LoadingState from "../common/LoadingState";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import StatusFilter from "../common/StatusFilter";

const statusOptions = [
  { value: "active", label: "Đang làm việc" },
  { value: "inactive", label: "Đã vô hiệu hóa" },
];

const emptyForm = {
  employeeCode: "",
  fullName: "",
  phone: "",
  email: "",
  password: "",
  position: "",
  department: "",
  securityLevelId: "",
};
export default function EmployeeManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]),
    [levels, setLevels] = useState([]),
    [loading, setLoading] = useState(true),
    [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(emptyForm);
  const load = async () => {
    setLoading(true);
    try {
      const response = await getData("/employees", { params: { limit: 100 } });
      setItems(response.data?.items || []);
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Không thể tải danh sách nhân viên",
      );
    } finally {
      setLoading(false);
    }
  };
  const loadLevels = async () => {
    try {
      const response = await getData("/security-levels");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
      setLevels(data);
      if (!data.length) toast.error("Hệ thống chưa có nhãn bảo mật");
    } catch (e) {
      setLevels([]);
      toast.error(e.response?.data?.message || "Không thể tải nhãn bảo mật");
    }
  };
  useEffect(() => {
    Promise.resolve().then(() => Promise.all([load(), loadLevels()]));
  }, []); // Initial API synchronization.
  const filtered = useMemo(
    () =>
      items.filter((x) => {
        const matchesSearch = [x.employee_code, x.full_name].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        );
        const matchesStatus =
          status === "all" || (x.is_active ? "active" : "inactive") === status;
        return matchesSearch && matchesStatus;
      }),
    [items, search, status],
  );
  const open = (item) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            employeeCode: item.employee_code,
            fullName: item.full_name,
            phone: item.phone || "",
            email: item.email,
            position: item.position || "",
            department: item.department || "",
            securityLevelId: item.security_level_id || "",
          }
        : emptyForm,
    );
    setModal(true);
    void loadLevels();
  };
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await putData(`/employees/${editing.id}`, form);
        if (Number(form.securityLevelId) !== Number(editing.security_level_id))
          await patchData(`/employees/${editing.id}/security-level`, {
            securityLevelId: Number(form.securityLevelId),
          });
      } else await postData("/employees", form);
      toast.success(
        editing ? "Đã cập nhật nhân viên" : "Đã tạo tài khoản nhân viên",
      );
      setModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu nhân viên");
    } finally {
      setSubmitting(false);
    }
  };
  const toggleLock = async (item) => {
    const locking = item.is_active;
    const label = locking ? "khóa" : "mở khóa";
    if (!window.confirm(`Xác nhận ${label} tài khoản của ${item.full_name}?`))
      return;
    try {
      await postData(`/employees/${item.id}/${locking ? "lock" : "unlock"}`);
      toast.success(locking ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      await load();
    } catch (e) {
      toast.error(
        e.response?.data?.message || `Không thể ${label} tài khoản`,
      );
    }
  };
  const handleAction = (item, action) => {
    if (action === "view") navigate(`/admin/employees/${item.id}`);
    else if (action === "edit") open(item);
    else if (action === "lock" || action === "unlock") toggleLock(item);
  };
  return (
    <>
      <TableShell
        title="Quản lý nhân viên"
        subtitle=""
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        filters={
          <StatusFilter
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={statusOptions}
          />
        }
        onAdd={() => open()}
        addLabel="Thêm nhân viên"
      >
        {loading ? (
          <LoadingState />
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="table-head">
              <tr>
                {[
                  "Mã NV",
                  "Họ tên",
                  "Liên hệ",
                  "Vị trí",
                  "Phòng ban",
                  "Nhãn MAC",
                  "Trạng thái",
                  "Thao tác",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="table-body font-bold">
              {filtered.slice((page - 1) * 7, page * 7).map((x) => (
                <tr key={x.id}>
                  <td className="text-slate-900 dark:text-white">
                    {x.employee_code}
                  </td>
                  <td>{x.full_name}</td>
                  <td>
                    <div>{x.email}</div>
                    <div className="text-xs text-slate-400">
                      {x.phone || "—"}
                    </div>
                  </td>
                  <td>{x.position || "—"}</td>
                  <td>{x.department || "—"}</td>
                  <td>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {x.security_level_name || "Chưa gán"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge value={x.is_active ? "active" : "inactive"} />
                  </td>
                  <td>
                    <select
                      value=""
                      onChange={(e) => {
                        handleAction(x, e.target.value);
                        e.target.value = "";
                      }}
                      className="form-control py-1.5 text-xs font-bold"
                    >
                      <option value="" disabled>
                        Chọn thao tác
                      </option>
                      <option value="view">Xem chi tiết</option>
                      <option value="edit">Sửa</option>
                      {x.is_active ? (
                        <option value="lock">Khóa tài khoản</option>
                      ) : (
                        <option value="unlock">Mở khóa tài khoản</option>
                      )}
                    </select>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400">
                    Không có nhân viên
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
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Cập nhật nhân viên" : "Thêm nhân viên"}
      >
        <form
          onSubmit={submit}
          className="grid gap-4 sm:grid-cols-2"
          autoComplete="off"
        >
          {[
            ["employeeCode", "Mã nhân viên", "text"],
            ["fullName", "Họ tên", "text"],
            ["email", "Email đăng nhập", "email"],
            ["phone", "Số điện thoại", "tel"],
            ["position", "Chức vụ", "text"],
            ["department", "Phòng ban", "text"],
          ].map(([name, label, type]) => (
            <label key={name}>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {label}
                {["employeeCode", "fullName", "email"].includes(name) && " *"}
              </span>
              <input
                className="form-control"
                name={name}
                type={type}
                autoComplete="off"
                required={["employeeCode", "fullName", "email"].includes(name)}
                value={form[name]}
                onChange={change}
              />
            </label>
          ))}
          {!editing && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Mật khẩu ban đầu *
              </span>
              <input
                className="form-control"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength="8"
                required
                value={form.password}
                onChange={change}
              />
            </label>
          )}
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
              Nhãn bảo mật MAC *
            </span>
            <select
              className="form-control"
              name="securityLevelId"
              required={!editing}
              value={form.securityLevelId}
              onChange={change}
            >
              <option value="">Chọn nhãn</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || l.level_name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold dark:border-slate-700 dark:text-slate-200"
            >
              Hủy
            </button>
            <button
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu nhân viên"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
