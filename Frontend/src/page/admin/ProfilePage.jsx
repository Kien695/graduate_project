import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  changeCurrentPassword,
  loadCurrentUser,
  logoutUser,
  updateCurrentAvatar,
  updateCurrentUser,
} from "../../redux/slices/authSlice";

const roleLabel = { admin: "Quản trị viên", manager: "Quản lý", staff: "Nhân viên" };
const profileValues = (user = {}) => ({
  fullName: user.full_name || "",
  email: user.email || "",
  phone: user.phone || "",
  address: user.address || "",
});

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [profile, setProfile] = useState(() => profileValues(user));
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    dispatch(loadCurrentUser()).unwrap().then((freshUser) => setProfile(profileValues(freshUser))).catch(() => undefined);
  }, [dispatch]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Ảnh đại diện không được vượt quá 5 MB");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };
  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      await dispatch(updateCurrentAvatar(avatarFile)).unwrap();
      await dispatch(loadCurrentUser()).unwrap();
      setAvatarFile(null);
      setAvatarPreview("");
      toast.success("Cập nhật ảnh đại diện thành công");
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Không thể cập nhật ảnh đại diện");
    } finally { setUploadingAvatar(false); }
  };

  const update = (key) => (event) => setProfile((current) => ({ ...current, [key]: event.target.value }));
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateCurrentUser(profile)).unwrap();
      await dispatch(loadCurrentUser()).unwrap();
      toast.success("Cập nhật thông tin cá nhân thành công");
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Không thể cập nhật hồ sơ");
    } finally { setSaving(false); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword)
      return toast.error("Mật khẩu xác nhận không khớp");
    setChangingPassword(true);
    try {
      await dispatch(changeCurrentPassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      })).unwrap();
      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      await dispatch(logoutUser());
      navigate("/admin/login", { replace: true });
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Không thể đổi mật khẩu");
    } finally { setChangingPassword(false); }
  };
  const logout = async () => {
    await dispatch(logoutUser());
    navigate("/admin/login", { replace: true });
  };

  const initial = (user?.full_name || user?.email || "A").charAt(0).toUpperCase();
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="flex flex-col gap-5 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
      <div className="flex flex-col items-center gap-2"><label className="group relative cursor-pointer">{avatarPreview || user?.avatar_url
        ? <img src={avatarPreview || user.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-4 ring-white/10" />
        : <div className="grid h-20 w-20 place-items-center rounded-full bg-blue-600 text-3xl font-black">{initial}</div>}<span className="absolute inset-0 grid place-items-center rounded-full bg-slate-950/60 text-[10px] font-bold opacity-0 transition group-hover:opacity-100">Chọn ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectAvatar}/></label>{avatarFile&&<button type="button" disabled={uploadingAvatar} onClick={uploadAvatar} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60">{uploadingAvatar?"Đang tải...":"Cập nhật avatar"}</button>}</div>
      <div className="flex-1"><h1 className="text-2xl font-black">{user?.full_name || "Tài khoản"}</h1><p className="mt-1 text-sm text-slate-300">{user?.email}</p><span className="mt-3 inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-200">{roleLabel[String(user?.role || "").toLowerCase()] || user?.role}</span></div>
      <button onClick={logout} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Đăng xuất</button>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Thông tin cá nhân</h2>
        <p className="mt-1 text-xs text-slate-500">Dữ liệu được tải trực tiếp từ tài khoản đang xác thực.</p>
        <div className="mt-5 space-y-4">
          <Field label="Họ và tên" value={profile.fullName} onChange={update("fullName")} required />
          <Field label="Email" type="email" value={profile.email} onChange={update("email")} required />
          <Field label="Số điện thoại" value={profile.phone} onChange={update("phone")} />
          <Field label="Địa chỉ" value={profile.address} disabled placeholder="Chưa có dữ liệu địa chỉ cho tài khoản nhân viên" />
          <Field label="Vai trò" value={roleLabel[String(user?.role || "").toLowerCase()] || user?.role || ""} disabled />
        </div>
        <button disabled={saving} className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
      </form>

      <form onSubmit={changePassword} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Đổi mật khẩu</h2>
        <p className="mt-1 text-xs text-slate-500">Sau khi đổi mật khẩu, tất cả phiên đăng nhập sẽ bị thu hồi.</p>
        <div className="mt-5 space-y-4">
          <Field label="Mật khẩu hiện tại" type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required />
          <Field label="Mật khẩu mới" type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} minLength={8} required />
          <Field label="Xác nhận mật khẩu mới" type="password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} minLength={8} required />
        </div>
        <button disabled={changingPassword} className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-60">{changingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}</button>
      </form>
    </div>
  </div>;
}

function Field({ label, ...props }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input {...props} className="form-control disabled:bg-slate-100 disabled:text-slate-500" /></label>;
}
