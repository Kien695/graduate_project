import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers } from "../../redux/slices/customerSlice";
import { patchData } from "../../utils/api";
import { toast } from "react-toastify";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import LoadingState from "../common/LoadingState";
export default function CustomerManager() {
  const dispatch = useDispatch();
  const { items, loading, error, total = 0 } = useSelector((s) => s.customers);
  const isAdmin = useSelector(
    (s) => String(s.auth.user?.role).toLowerCase() === "admin",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lockedOnly, setLockedOnly] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
  useEffect(() => {
    dispatch(
      fetchCustomers({
        page,
        limit: 7,
        search,
        locked: lockedOnly ? "true" : undefined,
      }),
    );
  }, [dispatch, page, search, lockedOnly]);
  const unlock = async (customer) => {
    if (!window.confirm(`Mở khóa tài khoản của ${customer.full_name}?`)) return;
    setUnlocking(customer.id);
    try {
      await patchData(`/customers/${customer.id}/unlock`, {});
      toast.success("Đã mở khóa tài khoản khách hàng");
      if (lockedOnly && items.length === 1 && page > 1) setPage(page - 1);
      else
        await dispatch(
          fetchCustomers({
            page,
            limit: 7,
            search,
            locked: lockedOnly ? "true" : undefined,
          }),
        ).unwrap();
    } catch (err) {
      toast.error(err.response?.data?.message || String(err.message || err));
    } finally {
      setUnlocking(null);
    }
  };
  return (
    <TableShell
      title="Thông tin khách hàng"
      subtitle="Danh sách khách hàng từ hệ thống PostgreSQL"
      search={search}
      setSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
    >
      <label className="flex items-center gap-2 px-5 py-3 text-sm">
        <input
          type="checkbox"
          checked={lockedOnly}
          onChange={(event) => {
            setLockedOnly(event.target.checked);
            setPage(1);
          }}
        />
        Chỉ hiển thị tài khoản bị khóa
      </label>
      {error && (
        <p role="alert" className="px-5 py-2 text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <LoadingState />
      ) : (
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="table-head">
            <tr>
              {[
                "Mã KH",
                "Họ tên",
                "Số điện thoại",
                "Email",
                "Địa chỉ",
                "Ngày tạo",
                "Tài khoản",
                "Sai đăng nhập",
                ...(isAdmin ? ["Thao tác"] : []),
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {items.map((c) => (
              <tr key={c.id}>
                <td className="font-bold text-slate-900">
                  KH{String(c.id).padStart(5, "0")}
                </td>
                <td className="font-semibold">{c.full_name}</td>
                <td>{c.phone || "Dữ liệu được bảo vệ"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.address || "Dữ liệu được bảo vệ"}</td>
                <td>{new Date(c.created_at).toLocaleDateString("vi-VN")}</td>
                <td>
                  <span
                    className={
                      c.account_status === "LOCKED"
                        ? "font-semibold text-red-600"
                        : "text-slate-600"
                    }
                  >
                    {{
                      LOCKED: "Đang bị khóa",
                      ACTIVE: "Hoạt động",
                      INACTIVE: "Đã vô hiệu hóa",
                      NO_ACCOUNT: "Chưa có tài khoản",
                    }[c.account_status] || "—"}
                  </span>
                  {c.account_status === "LOCKED" && (
                    <div className="mt-1 text-xs text-slate-500">
                      {c.locked_until
                        ? `Khóa đến ${new Date(c.locked_until).toLocaleString("vi-VN")}`
                        : "Khóa không thời hạn"}
                    </div>
                  )}
                </td>
                <td>{c.user_id ? (c.failed_login_attempts ?? 0) : "—"}</td>
                {isAdmin && (
                  <td>
                    {c.account_status === "LOCKED" && (
                      <button
                        type="button"
                        disabled={unlocking !== null}
                        onClick={() => unlock(c)}
                        className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                      >
                        {unlocking === c.id ? "Đang mở khóa..." : "Mở khóa"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="py-16 text-center text-slate-400"
                >
                  Không có khách hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <Pagination page={page} total={total} pageSize={7} onChange={setPage} />
    </TableShell>
  );
}
