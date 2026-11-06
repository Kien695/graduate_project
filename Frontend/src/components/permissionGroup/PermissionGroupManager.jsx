import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { deleteData, getData, postData, putData } from "../../utils/api";
import TableShell from "../common/TableShell";
import LoadingState from "../common/LoadingState";
import Modal from "../common/Modal";
import PermissionMatrix from "../common/PermissionMatrix";

const emptyForm = { name: "", description: "" };

export default function PermissionGroupManager() {
  const [items, setItems] = useState([]),
    [featureCatalog, setFeatureCatalog] = useState([]),
    [loading, setLoading] = useState(true),
    [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(emptyForm),
    [features, setFeatures] = useState([]),
    [modalLoading, setModalLoading] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState(null),
    [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getData("/permission-groups");
      setItems(response.data?.items || []);
      setFeatureCatalog(response.data?.featureCatalog || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể tải danh sách nhóm quyền");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    Promise.resolve().then(() => load());
  }, []); // Initial API synchronization.
  const filtered = useMemo(
    () => items.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFeatures(featureCatalog);
    setModal(true);
  };
  const openEdit = async (item) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description || "" });
    setFeatures([]);
    setModal(true);
    setModalLoading(true);
    try {
      const response = await getData(`/permission-groups/${item.id}`);
      setFeatures(response.data?.features || []);
    } catch (e) {
      setModal(false);
      toast.error(e.response?.data?.message || "Không thể tải chi tiết nhóm quyền");
    } finally {
      setModalLoading(false);
    }
  };
  const toggleFeature = (featureKey, privilege) =>
    setFeatures((current) =>
      current.map((feature) =>
        feature.key === featureKey
          ? { ...feature, permissions: { ...feature.permissions, [privilege]: !feature.permissions[privilege] } }
          : feature,
      ),
    );
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        features: Object.fromEntries(features.map((feature) => [feature.key, feature.permissions])),
      };
      const response = editing
        ? await putData(`/permission-groups/${editing.id}`, payload)
        : await postData("/permission-groups", payload);
      const cascadeFailures = response.data?.cascadeFailures || [];
      toast.success(editing ? "Đã cập nhật nhóm quyền" : "Đã tạo nhóm quyền");
      if (cascadeFailures.length)
        toast.warn(
          `Không áp quyền được cho ${cascadeFailures.length} nhân viên: ` +
            cascadeFailures.map((f) => f.fullName || f.employeeCode).join(", "),
        );
      setModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu nhóm quyền");
    } finally {
      setSubmitting(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteGroup || deleting) return;
    setDeleting(true);
    try {
      await deleteData(`/permission-groups/${deleteGroup.id}`);
      toast.success("Đã xóa nhóm quyền");
      setDeleteGroup(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể xóa nhóm quyền");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <TableShell title="Nhóm quyền" subtitle="" search={search} setSearch={setSearch} onAdd={openCreate} addLabel="Thêm nhóm quyền">
        {loading ? (
          <LoadingState />
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="table-head">
              <tr>
                {["Tên nhóm", "Mô tả", "Số nhân viên", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="table-body font-bold">
              {filtered.map((g) => (
                <tr key={g.id}>
                  <td className="text-slate-900 dark:text-white">{g.name}</td>
                  <td className="font-normal text-slate-500">{g.description || "—"}</td>
                  <td>{g.member_count}</td>
                  <td className="flex gap-3">
                    <button type="button" onClick={() => openEdit(g)} className="font-bold text-blue-600">
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={g.member_count > 0}
                      title={g.member_count > 0 ? "Còn nhân viên thuộc nhóm, không thể xóa" : ""}
                      onClick={() => setDeleteGroup(g)}
                      className="font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="4" className="py-16 text-center text-slate-400">
                    Chưa có nhóm quyền nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </TableShell>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Cập nhật nhóm quyền" : "Thêm nhóm quyền"}>
        {modalLoading && !features.length ? (
          <LoadingState />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Tên nhóm *</span>
                <input className="form-control" name="name" required value={form.name} onChange={change} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Mô tả</span>
                <input className="form-control" name="description" value={form.description} onChange={change} />
              </label>
            </div>
            <PermissionMatrix features={features} onToggle={toggleFeature} />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold dark:border-slate-700 dark:text-slate-200">
                Hủy
              </button>
              <button disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {submitting ? "Đang lưu..." : "Lưu nhóm quyền"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={Boolean(deleteGroup)} onClose={() => !deleting && setDeleteGroup(null)} title="Xác nhận xóa nhóm quyền">
        <div className="space-y-5">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <p className="font-bold">Thao tác này không thể hoàn tác.</p>
            <p className="mt-2">
              Nhóm quyền sẽ bị xóa: <strong>{deleteGroup?.name}</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" disabled={deleting} onClick={() => setDeleteGroup(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
              Hủy
            </button>
            <button type="button" disabled={deleting} onClick={confirmDelete} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {deleting ? "Đang xóa..." : "Xóa nhóm quyền"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
