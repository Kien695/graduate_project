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
    <div className="container-page max-w-5xl py-12">
      {/* Header */}
      <div className="mb-10 border-b border-slate-200/80 pb-6 dark:border-white/[0.08]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
          Cài đặt & Hồ sơ
        </span>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          Tài khoản khách hàng
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Quản lý thông tin định danh, địa chỉ liên hệ và bảo mật mật khẩu của bạn.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        {/* Left Column: Avatar & Quick Actions */}
        <aside className="card h-fit p-6 text-center">
          <div className="relative mx-auto h-28 w-28">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                className="h-full w-full rounded-full object-cover ring-4 ring-red-500/20"
                alt="Ảnh đại diện"
              />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-3xl font-black text-white shadow-lg shadow-red-600/30">
                {(user?.full_name || "K")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">
            {user?.full_name || "Khách hàng"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 font-mono">
            {user?.email}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-500">
            Khách hàng định danh
          </div>

          <label className="btn-secondary mt-6 w-full cursor-pointer text-xs">
            <Icon name="image" className="h-4 w-4" />
            <span>Thay đổi ảnh đại diện</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={avatar}
            />
          </label>

          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-red-50/50 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span>Đăng xuất phiên làm việc</span>
          </button>
        </aside>

        {/* Right Column: Forms */}
        <div className="space-y-8">
          {/* Profile Form */}
          <form onSubmit={save} className="card p-6 sm:p-8">
            <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
              <span>👤</span> Thông tin định danh cá nhân
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Họ và tên"
                value={profile.fullName}
                onChange={(v) => setProfile({ ...profile, fullName: v })}
                required
              />
              <Field
                label="Địa chỉ Email"
                type="email"
                value={profile.email}
                onChange={(v) => setProfile({ ...profile, email: v })}
                required
              />
              <Field
                label="Số điện thoại liên hệ"
                value={profile.phone}
                onChange={(v) => setProfile({ ...profile, phone: v })}
                placeholder="09xx xxx xxx"
              />
              <Field
                label="Địa chỉ giao nhận"
                value={profile.address}
                onChange={(v) => setProfile({ ...profile, address: v })}
                placeholder="Số nhà, đường, quận/huyện..."
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-primary text-xs" disabled={saving}>
                {saving ? "Đang lưu thay đổi..." : "Lưu thay đổi hồ sơ"}
              </button>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={change} className="card p-6 sm:p-8">
            <h2 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
              <span>🔒</span> Bảo mật & Đổi mật khẩu
            </h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Sau khi đổi mật khẩu thành công, bạn sẽ được tự động đăng xuất để đăng nhập lại bằng mật khẩu mới.
            </p>
            <div className="mt-6 grid gap-4">
              <Field
                label="Mật khẩu hiện tại"
                type="password"
                value={password.currentPassword}
                onChange={(v) =>
                  setPassword({ ...password, currentPassword: v })
                }
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Mật khẩu mới (tối thiểu 8 ký tự)"
                  type="password"
                  value={password.newPassword}
                  onChange={(v) => setPassword({ ...password, newPassword: v })}
                  required
                />
                <Field
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  value={password.confirm}
                  onChange={(v) => setPassword({ ...password, confirm: v })}
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-secondary text-xs" disabled={changing}>
                {changing ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <input
        className="field"
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
