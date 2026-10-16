import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { changePassword } from "../../api/auth.api";
import {
  logout,
  updateAvatar,
  updateProfile,
} from "../../redux/slices/authSlice";
import Icon from "../../components/common/Icon";
import { apiMessage } from "../../utils/format";
export default function AccountPage() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  useEffect(
    () =>
      setProfile({
        fullName: user?.full_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        address: user?.address || "",
      }),
    [user],
  );
  const save = async (e) => {
    e.preventDefault();
    if (!profile.fullName.trim())
      return toast.error("Họ tên không được để trống.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
      return toast.error("Email không hợp lệ.");
    setSaving(true);
    try {
      await dispatch(updateProfile(profile)).unwrap();
      toast.success("Đã cập nhật hồ sơ.");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };
  const avatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Vui lòng chọn tệp ảnh.");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Ảnh không được vượt quá 5 MB.");
    try {
      await dispatch(updateAvatar(file)).unwrap();
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch (err) {
      toast.error(err);
    } finally {
      e.target.value = "";
    }
  };
  const change = async (e) => {
    e.preventDefault();
    if (password.newPassword.length < 8)
      return toast.error("Mật khẩu mới tối thiểu 8 ký tự.");
    if (password.newPassword !== password.confirm)
      return toast.error("Mật khẩu mới không khớp.");
    setChanging(true);
    try {
      await changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      await dispatch(logout());
      navigate("/login");
    } catch (err) {
      toast.error(apiMessage(err, "Không thể đổi mật khẩu."));
    } finally {
      setChanging(false);
    }
  };
  const signOut = async () => {
    await dispatch(logout());
    navigate("/login");
  };
  return (
    <div className="container-page max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Tài khoản</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
        <aside className="card h-fit p-6 text-center">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-red-50"
              alt="Ảnh đại diện"
            />
          ) : (
            <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-red-100 text-4xl font-black text-red-700">
              {(user?.full_name || "K")[0]}
            </div>
          )}
          <h2 className="mt-4 text-xl font-black">{user?.full_name}</h2>
          <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
          <label className="btn-secondary mt-5 w-full">
            <Icon name="image" className="mr-2 h-5 w-5" />
            Đổi ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={avatar}
            />
          </label>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            <Icon name="logout" />
            Đăng xuất
          </button>
        </aside>
        <div className="space-y-6">
          <form onSubmit={save} className="card p-6">
            <h2 className="text-lg font-black">Thông tin cá nhân</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Họ và tên"
                value={profile.fullName}
                onChange={(v) => setProfile({ ...profile, fullName: v })}
              />
              <Field
                label="Email"
                type="email"
                value={profile.email}
                onChange={(v) => setProfile({ ...profile, email: v })}
              />
              <Field
                label="Số điện thoại"
                value={profile.phone}
                onChange={(v) => setProfile({ ...profile, phone: v })}
              />
              <Field
                label="Địa chỉ"
                value={profile.address}
                onChange={(v) => setProfile({ ...profile, address: v })}
              />
            </div>
            <button className="btn-primary mt-6" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
          <form onSubmit={change} className="card p-6">
            <h2 className="text-lg font-black">Đổi mật khẩu</h2>
            <p className="mt-2 text-xs text-slate-500">
              Sau khi đổi mật khẩu, tất cả phiên đăng nhập sẽ kết thúc.
            </p>
            <div className="mt-5 grid gap-4">
              <Field
                label="Mật khẩu hiện tại"
                type="password"
                value={password.currentPassword}
                onChange={(v) =>
                  setPassword({ ...password, currentPassword: v })
                }
              />
              <Field
                label="Mật khẩu mới"
                type="password"
                value={password.newPassword}
                onChange={(v) => setPassword({ ...password, newPassword: v })}
              />
              <Field
                label="Nhập lại mật khẩu mới"
                type="password"
                value={password.confirm}
                onChange={(v) => setPassword({ ...password, confirm: v })}
              />
            </div>
            <button className="btn-secondary mt-6" disabled={changing}>
              {changing ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
function Field({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        className="field"
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
