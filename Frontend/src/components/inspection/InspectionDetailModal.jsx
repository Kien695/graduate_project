import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  failInspection,
  passInspection,
  startInspection,
  updateInspectionChecklist,
  uploadInspectionImages,
  deleteInspectionImage,
} from "../../redux/slices/inspectionSlice";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import LoadingState from "../common/LoadingState";

const defaultChecklist = [
  ["exterior", "Ngoại thất và thân vỏ"],
  ["interior", "Nội thất và thiết bị"],
  ["engine", "Động cơ và hệ thống truyền động"],
  ["brakes", "Phanh, lốp và hệ thống lái"],
  ["electrical", "Điện, đèn và ắc quy"],
  ["documents", "Hồ sơ và phụ kiện bàn giao"],
].map(([key, label]) => ({ key, label, checked: false, note: "" }));

const dateTime = (value) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

export default function InspectionDetailModal({
  inspection,
  loading,
  onClose,
  onRefresh,
}) {
  const dispatch = useDispatch();
  const submitting = useSelector((state) => state.inspections.submitting);
  const [checklist, setChecklist] = useState(() =>
    inspection?.checklist?.length ? inspection.checklist : defaultChecklist,
  );
  const [notes, setNotes] = useState(
    () => inspection?.notes || inspection?.note || "",
  );
  const [files, setFiles] = useState([]);

  if (!inspection && !loading) return null;
  const status = String(inspection?.status || "pending").toLowerCase();
  const run = async (thunk, data, successMessage) => {
    try {
      await dispatch(thunk({ id: inspection.id, data })).unwrap();
      toast.success(successMessage);
      await onRefresh(inspection.id);
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : "Không thể cập nhật kiểm định",
      );
    }
  };
  const saveChecklist = () =>
    run(updateInspectionChecklist, { checklist, notes }, "Đã lưu checklist");
  const finish = async (result) => {
    const label = result === "pass" ? "PASS" : "FAIL";
    if (!window.confirm(`Xác nhận hoàn thành kiểm định với kết quả ${label}?`))
      return;
    try {
      await dispatch(
        updateInspectionChecklist({
          id: inspection.id,
          data: { checklist, notes },
        }),
      ).unwrap();
      const finishAction = result === "pass" ? passInspection : failInspection;
      await dispatch(finishAction({ id: inspection.id })).unwrap();
      toast.success(`Đã hoàn thành kiểm định: ${label}`);
      await onRefresh(inspection.id);
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : "Không thể hoàn thành kiểm định",
      );
    }
  };
  const upload = async () => {
    const data = new FormData();
    files.forEach((file) => data.append("images", file));
    await run(uploadInspectionImages, data, "Upload ảnh kiểm định thành công");
    setFiles([]);
  };
  const removeImage = async (imageId) => {
    if (!window.confirm("Xác nhận xóa ảnh kiểm định này?")) return;
    await run(deleteInspectionImage, { imageId }, "Đã xóa ảnh kiểm định");
  };
  const updateItem = (index, values) =>
    setChecklist((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...values } : item,
      ),
    );
  const toggleChecklistItem = async (index, checked) => {
    const nextChecklist = checklist.map((item, itemIndex) =>
      itemIndex === index ? { ...item, checked } : item,
    );
    setChecklist(nextChecklist);
    if (status !== "pending") return;
    try {
      await dispatch(startInspection({ id: inspection.id })).unwrap();
      await dispatch(
        updateInspectionChecklist({
          id: inspection.id,
          data: { checklist: nextChecklist, notes },
        }),
      ).unwrap();
      toast.success("Đã bắt đầu kiểm định và lưu checklist");
      await onRefresh(inspection.id);
    } catch (error) {
      setChecklist(checklist);
      toast.error(
        typeof error === "string" ? error : "Không thể bắt đầu kiểm định",
      );
      await onRefresh(inspection.id);
    }
  };

  return (
    <Modal
      open={Boolean(inspection) || loading}
      onClose={onClose}
      title="Chi tiết kiểm định"
      size="max-w-5xl"
    >
      {loading || !inspection ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mã kiểm định
              </div>
              <div className="mt-1 text-2xl font-black">
                KD{String(inspection.id).padStart(5, "0")}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {[inspection.brand, inspection.model, inspection.vin]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <StatusBadge value={inspection.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Người kiểm định"
              value={
                inspection.inspector_name || `NV #${inspection.inspector_id}`
              }
            />
            <Info
              label="Ngày tạo phiếu"
              value={dateTime(inspection.created_at)}
            />
            <Info
              label="Ngày hoàn thành"
              value={dateTime(
                inspection.inspected_at || inspection.inspection_date,
              )}
            />
            <Info
              label="Đơn hàng liên quan"
              value={
                inspection.order_number
                  ? `DH${String(inspection.order_number).padStart(5, "0")}`
                  : "Chưa liên kết"
              }
            />
            <Info label="Khách hàng" value={inspection.customer_name} />
            <Info label="Trạng thái đơn" value={inspection.order_status} />
            <Info label="Màu xe" value={inspection.color} />
            <Info label="Kết quả" value={inspection.result || "WAITING"} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Checklist kiểm tra
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {status === "pending"
                    ? "Tick hạng mục đầu tiên để tự động bắt đầu kiểm định."
                    : "Đánh dấu và ghi chú từng hạng mục khi đang kiểm định."}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {checklist.filter((item) => item.checked).length}/
                {checklist.length} hoàn tất
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              {checklist.map((item, index) => (
                <div
                  key={item.key}
                  className="grid gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-700 md:grid-cols-[1fr_1.2fr]"
                >
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                      disabled={
                        submitting || !["pending", "checking"].includes(status)
                      }
                      checked={Boolean(item.checked)}
                      onChange={(event) =>
                        toggleChecklistItem(index, event.target.checked)
                      }
                    />
                    {item.label}
                  </label>
                  <input
                    disabled={submitting || status !== "checking"}
                    className="form-control"
                    placeholder={
                      status === "pending"
                        ? "Tick một hạng mục để bắt đầu trước"
                        : "Ghi chú hạng mục"
                    }
                    value={item.note || ""}
                    onChange={(event) =>
                      updateItem(index, { note: event.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
              Ghi chú chung
            </h3>
            <textarea
              rows="4"
              disabled={status !== "checking"}
              className="form-control"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Kết luận và lưu ý kiểm định..."
            />
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">
              Hình ảnh kiểm định
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {inspection.images?.map((image) => (
                <div
                  key={image.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                >
                  <a href={image.url} target="_blank" rel="noreferrer">
                    <img
                      src={image.url}
                      alt="Ảnh kiểm định"
                      className="h-32 w-full object-cover"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute right-2 top-2 rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white"
                  >
                    Xóa
                  </button>
                </div>
              ))}
              {!inspection.images?.length && (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
                  Chưa có ảnh kiểm định
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center dark:bg-slate-900">
              <input
                multiple
                accept="image/jpeg,image/png,image/webp"
                type="file"
                className="block flex-1 text-sm text-slate-600 dark:text-slate-300"
                onChange={(event) => setFiles([...event.target.files])}
              />
              <button
                type="button"
                disabled={submitting || !files.length}
                onClick={upload}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Upload ảnh
              </button>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-700">
            {status === "pending" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  run(startInspection, undefined, "Đã bắt đầu kiểm định")
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bắt đầu kiểm định
              </button>
            )}
            {status === "checking" && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={saveChecklist}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Lưu checklist
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => finish("fail")}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hoàn thành FAIL
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => finish("pass")}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hoàn thành PASS
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold capitalize text-slate-800 dark:text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}
