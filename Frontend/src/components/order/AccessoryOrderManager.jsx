import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchAccessoryOrders,
  confirmAccessoryOrder,
  shipAccessoryOrder,
  cancelAccessoryOrder,
  completeAccessoryOrder,
} from "../../redux/slices/accessoryOrderSlice";
import TableShell from "../common/TableShell";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import StatusFilter from "../common/StatusFilter";
import LoadingState from "../common/LoadingState";

const statusOptions = [
  { value: "pending", label: "Đang chờ" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao hàng" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];
const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export default function AccessoryOrderManager() {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector(
    (s) => s.accessoryOrders,
  );
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1);
  useEffect(() => {
    dispatch(fetchAccessoryOrders());
  }, [dispatch]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const filtered = useMemo(
    () =>
      items.filter((x) => {
        const code = `PK${String(x.id).padStart(5, "0")}`;
        const matchesSearch =
          code.toLowerCase().includes(search.toLowerCase()) ||
          String(x.id).includes(search.trim());
        const matchesStatus =
          status === "all" || String(x.status).toLowerCase() === status;
        return matchesSearch && matchesStatus;
      }),
    [items, search, status],
  );
  const act = async (thunk, id, label) => {
    try {
      await dispatch(thunk(id)).unwrap();
      toast.success(label);
    } catch {}
  };
  return (
    <TableShell
      title="Danh sách đơn hàng phụ kiện"
      subtitle=""
      search={search}
      setSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      filters={
        <StatusFilter
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={statusOptions}
        />
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="table-head">
            <tr>
              {[
                "Mã đơn",
                "Khách hàng",
                "Phụ kiện",
                "Số lượng",
                "Ngày đặt",
                "Tổng tiền",
                "Trạng thái",
                "Thao tác",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body font-bold">
            {filtered.slice((page - 1) * 7, page * 7).map((o) => (
              <tr key={o.id}>
                <td className="text-slate-900">
                  PK{String(o.id).padStart(5, "0")}
                </td>
                <td>{o.customer_name || `KH #${o.customer_id}`}</td>
                <td>{o.accessory_name || `Phụ kiện #${o.accessory_id}`}</td>
                <td>{o.quantity ?? 1}</td>
                <td>{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                <td className="font-semibold">{money(o.total_amount)}</td>
                <td>
                  <StatusBadge value={o.status} />
                </td>
                <td>
                  <div className="flex gap-2 text-xs">
                    {o.status === "pending" && (
                      <button
                        disabled={submitting}
                        onClick={() =>
                          act(confirmAccessoryOrder, o.id, "Đã xác nhận đơn")
                        }
                        className="action-blue"
                      >
                        Xác nhận
                      </button>
                    )}
                    {o.status === "confirmed" && (
                      <button
                        disabled={submitting}
                        onClick={() =>
                          act(shipAccessoryOrder, o.id, "Đã chuyển sang giao hàng")
                        }
                        className="action-blue"
                      >
                        Giao hàng
                      </button>
                    )}
                    {["pending", "confirmed", "shipping"].includes(
                      o.status,
                    ) && (
                      <button
                        onClick={() =>
                          act(cancelAccessoryOrder, o.id, "Đã hủy đơn")
                        }
                        className="action-red"
                      >
                        Hủy
                      </button>
                    )}
                    {o.status === "shipping" && (
                      <button
                        onClick={() =>
                          act(completeAccessoryOrder, o.id, "Đã hoàn tất đơn")
                        }
                        className="action-green"
                      >
                        Hoàn tất
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="8" className="py-16 text-center text-slate-400">
                  Không có đơn hàng phụ kiện
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
