import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getData, patchData } from "../../utils/api";
import LoadingState from "../common/LoadingState";
import StatusBadge from "../common/StatusBadge";

export default function EmployeeDetail() {
  const { id } = useParams(),
    navigate = useNavigate();
  const [employee, setEmployee] = useState(null),
    [levels, setLevels] = useState([]),
    [level, setLevel] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, l] = await Promise.all([
        getData(`/employees/${id}`),
        getData("/security-levels"),
      ]);
      setEmployee(e.data);
      setLevel(e.data.security_level_id || "");
      setLevels(l.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tải nhân viên");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  const assign = async () => {
    try {
      await patchData(`/employees/${id}/security-level`, {
        securityLevelId: Number(level),
      });
      toast.success("Đã gán nhãn bảo mật MAC");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể gán nhãn");
    }
  };
  if (loading) return <LoadingState />;
  if (!employee)
    return (
      <div className="rounded-2xl bg-white p-8 dark:bg-slate-800 dark:text-slate-300">
        Không tìm thấy nhân viên.
      </div>
    );
  const fields = [
    ["Mã nhân viên", employee.employee_code],
    ["Họ tên", employee.full_name],
    ["Email", employee.email],
    ["Số điện thoại", employee.phone || "—"],
    ["Chức vụ", employee.position || "—"],
    ["Phòng ban", employee.department || "—"],
    ["Vai trò tài khoản", employee.role],
    [
      "Đăng nhập gần nhất",
      employee.last_login_at
        ? new Date(employee.last_login_at).toLocaleString("vi-VN")
        : "Chưa đăng nhập",
    ],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/admin/employees")}
            className="mb-2 text-sm font-bold text-blue-600"
          >
            ← Danh sách nhân viên
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Chi tiết nhân viên
          </h1>
        </div>
        <StatusBadge value={employee.is_active ? "active" : "inactive"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
          <h2 className="mb-5 font-bold text-slate-900 dark:text-white">
            Thông tin nhân viên
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">
            Nhãn bảo mật MAC
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Nhãn Subject dùng khi áp dụng chính sách truy cập Contract.
          </p>
          <select
            className="form-control mt-5"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || l.level_name} (rank {l.rank})
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            disabled={!level}
            className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Gán nhãn bảo mật
          </button>
        </section>
      </div>
    </div>
  );
}
