import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Modal from "./Modal";
import Pagination from "./Pagination";
import StatusBadge from "./StatusBadge";
import TableShell from "./TableShell";
import LoadingState from "./LoadingState";
import { Icon } from "./Icons";

const format = (value, type) => {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
  if (type === "date") return new Date(value).toLocaleDateString("vi-VN");
  return String(value);
};
const renderCell = (item, column) => {
  const value = column.value ? column.value(item) : item[column.key];
  return column.type === "status" ? <StatusBadge value={value} /> : format(value, column.type);
};

const toFormData = (payload, files) => {
  const data = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) data.append(key, value);
  });
  files.forEach((file) => data.append("images", file));
  return data;
};

export default function EntityManager({ slice, title, subtitle, columns, fields, thunks, addLabel, imageUpload }) {
  const dispatch = useDispatch();
  const { items, loading, submitting, error } = useSelector((state) => state[slice]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const pageSize = 7;

  useEffect(() => { dispatch(thunks.fetch()); }, [dispatch, thunks]);
  useEffect(() => { if (error) toast.error(error); }, [error]);
  const imagePreviews = useMemo(() => imageFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [imageFiles]);
  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [imagePreviews]);
  const filtered = useMemo(() => items.filter((item) => columns.some((column) => String(item[column.key] ?? "").toLowerCase().includes(search.toLowerCase()))), [items, columns, search]);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  const open = (item) => {
    setEditing(item || null);
    setForm(item ? Object.fromEntries(fields.map((field) => [field.key, item[field.key] ?? ""])) : Object.fromEntries(fields.map((field) => [field.key, field.default ?? ""])));
    setImageFiles([]);
    setModal(true);
  };
  const selectImages = (event) => {
    const files = [...event.target.files];
    const selected = imageUpload.multiple ? [...imageFiles, ...files] : files;
    if (selected.length > imageUpload.maxFiles) {
      toast.error(`Chỉ được chọn tối đa ${imageUpload.maxFiles} ảnh`);
      event.target.value = "";
      return;
    }
    setImageFiles(selected);
    event.target.value = "";
  };
  const submit = async (event) => {
    event.preventDefault();
    const payload = {};
    for (const field of fields) {
      let value = form[field.key];
      if (field.type === "number" && value !== "") value = Number(value);
      if (field.type === "checkbox") value = Boolean(value);
      payload[field.key] = value;
    }
    const data = imageUpload ? toFormData(payload, imageFiles) : payload;
    try {
      if (editing) await dispatch(thunks.update({ id: editing.id, data })).unwrap();
      else await dispatch(thunks.create(data)).unwrap();
      toast.success(editing ? "Cập nhật thành công" : "Tạo mới thành công");
      setModal(false);
      setImageFiles([]);
    } catch { /* Redux state displays the API error. */ }
  };
  const remove = async (item) => {
    if (!window.confirm(`Xác nhận xóa ${item.name || item.full_name || item.model || "bản ghi này"}?`)) return;
    try {
      await dispatch(thunks.remove(item.id)).unwrap();
      toast.success("Đã xóa dữ liệu");
    } catch { /* Redux state displays the API error. */ }
  };
  const removeExistingImage = async (image) => {
    if (!editing || !thunks.removeImage || !window.confirm("Xác nhận xóa ảnh này?")) return;
    try {
      const updated = await dispatch(thunks.removeImage({ id: editing.id, publicId: image.public_id })).unwrap();
      setEditing(updated);
      toast.success("Đã xóa ảnh");
    } catch { /* Redux state displays the API error. */ }
  };

  return <>
    <TableShell title={title} subtitle={subtitle} search={search} setSearch={(value) => { setSearch(value); setPage(1); }} onAdd={() => open()} addLabel={addLabel}>
      {loading ? <LoadingState /> : <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">STT</th>{columns.map((column) => <th key={column.key} className="px-4 py-4">{column.label}</th>)}<th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{shown.map((item, index) => <tr key={item.id} className="hover:bg-slate-50/80">
          <td className="px-5 py-4 text-xs text-slate-400">{(page - 1) * pageSize + index + 1}</td>
          {columns.map((column) => <td key={column.key} className={`px-4 py-4 ${column.primary ? "font-bold text-slate-900" : "text-slate-600"}`}>{renderCell(item, column)}</td>)}
          <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => open(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Sửa"><Icon name="edit" className="h-4 w-4" /></button><button onClick={() => remove(item)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Xóa"><Icon name="trash" className="h-4 w-4" /></button></div></td>
        </tr>)}{!shown.length && <tr><td colSpan={columns.length + 2} className="px-5 py-16 text-center text-slate-400">Không có dữ liệu</td></tr>}</tbody>
      </table>}
      <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
    </TableShell>
    <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Cập nhật ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => <label key={field.key} className={field.full ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold text-slate-600">{field.label}{field.required && " *"}</span>{field.type === "select" ? <select required={field.required} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="form-control">{field.options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea required={field.required} rows="3" value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="form-control" /> : <input required={field.required} type={field.type || "text"} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="form-control" />}</label>)}
        {imageUpload && <div className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">{imageUpload.label}</span><label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center"><span className="font-bold text-blue-700">Chọn ảnh</span><span className="mt-1 text-xs text-slate-500">JPEG, PNG, WEBP · tối đa {imageUpload.maxFiles} ảnh, 5 MB/ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple={imageUpload.multiple} className="sr-only" onChange={selectImages} /></label>{(editing?.images?.length > 0 || imagePreviews.length > 0) && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{(editing?.images || []).map((image) => <div key={image.public_id || image.url} className="relative"><img src={image.url} alt="Ảnh hiện tại" className="h-20 w-full rounded-xl object-cover" /><button type="button" onClick={() => removeExistingImage(image)} className="absolute right-1 top-1 rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white">Xóa</button></div>)}{imagePreviews.map((preview) => <img key={preview.url} src={preview.url} alt={preview.name} className="h-20 w-full rounded-xl object-cover ring-2 ring-blue-400" />)}</div>}</div>}
        <div className="mt-3 flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold">Hủy</button><button disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Đang lưu..." : "Lưu dữ liệu"}</button></div>
      </form>
    </Modal>
  </>;
}
