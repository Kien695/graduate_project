import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  deleteData,
  getData,
  patchData,
  postData,
  putData,
} from "../../utils/api";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import LoadingState from "../common/LoadingState";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import StatusFilter from "../common/StatusFilter";
import { Icon } from "../common/Icons";

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
        const matchesSearch = [
          x.employee_code,
          x.full_name,
          x.email,
          x.department,
        ].some((v) =>
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
  const deactivate = async (item) => {
    if (!window.confirm(`Vô hiệu hóa tài khoản của ${item.full_name}?`)) return;
    try {
      await deleteData(`/employees/${item.id}`);
      toast.success("Đã vô hiệu hóa tài khoản");
      await load();
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Không thể vô hiệu hóa tài khoản",
      );
    }
  };
  return (
    <>
      <TableShell
        title="Quản lý nhân viên"
        subtitle="Tài khoản nhân viên và nhãn bảo mật MAC"
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
            <tbody className="table-body">
              {filtered.slice((page - 1) * 7, page * 7).map((x) => (
                <tr key={x.id}>
                  <td className="font-bold text-slate-900 dark:text-white">
                    {x.employee_code}
                  </td>
                  <td className="font-semibold">{x.full_name}</td>
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
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/admin/employees/${x.id}`)}
                        className="action-green"
                        title="Chi tiết"
                      >
                        <Icon name="eye" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => open(x)}
                        className="action-blue"
                        title="Sửa"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        disabled={!x.is_active}
                        onClick={() => deactivate(x)}
                        className="action-red"
                        title="Vô hiệu hóa"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
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
        title={editing ? "Cập nhật nhân viên" : "Thêm nhân viên và tài khoản"}
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
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
