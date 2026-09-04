import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers } from "../../redux/slices/customerSlice";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import LoadingState from "../common/LoadingState";
export default function CustomerManager() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((s) => s.customers);
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);
  const filtered = useMemo(
    () =>
      items.filter((x) =>
        JSON.stringify(x).toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );
  return (
    <TableShell
      title="Thông tin khách hàng"
      subtitle="Danh sách khách hàng từ hệ thống PostgreSQL"
      search={search}
      setSearch={setSearch}
    >
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
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {filtered.slice((page - 1) * 7, page * 7).map((c) => (
              <tr key={c.id}>
                <td className="font-bold text-slate-900">
                  KH{String(c.id).padStart(5, "0")}
                </td>
                <td className="font-semibold">{c.full_name}</td>
                <td>{c.phone || "Dữ liệu được bảo vệ"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.address || "Dữ liệu được bảo vệ"}</td>
                <td>{new Date(c.created_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="6" className="py-16 text-center text-slate-400">
                  Không có khách hàng
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
  );
}
