import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { clearAuthError, login } from "../../redux/slices/authSlice";
import { checkLockStatus } from "../../api/auth.api";
import AuthShell from "./AuthShell";
import Icon from "../../components/common/Icon";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);
  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  // Đếm ngược thời gian khóa thực theo server (không lệch theo đồng hồ máy).
  useEffect(() => {
    if (!error?.lockedUntil) {
      setRemainingSeconds(0);
      return;
    }
    const target = new Date(error.lockedUntil).getTime();
    const tick = () =>
      setRemainingSeconds(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [error?.lockedUntil]);

  // locked gắn với error?.lockedUntil để tránh lệch pha giữa 2 state khác
  // nguồn (error đến từ Redux, remainingSeconds đến từ interval cục bộ).
  const locked = remainingSeconds > 0 && Boolean(error?.lockedUntil);
  const countdownText = `${Math.floor(remainingSeconds / 60)}:${String(
    remainingSeconds % 60,
  ).padStart(2, "0")}`;
  const errorMessage = locked
    ? `Bạn đã đăng nhập sai ${error.failedAttempts} lần, hãy quay lại sau ${countdownText}.`
    : error?.lockedUntil
      ? null // đã hết thời gian khóa — ẩn thông báo cũ, cho phép thử lại
      : error?.message;

  // Trong lúc đang khóa, tự hỏi lại server mỗi vài giây — nếu admin mở khóa
  // thủ công thì tắt đồng hồ đếm ngược ngay, không cần đợi hết giờ hay bấm nút.
  useEffect(() => {
    if (!locked) return;
    const lockedEmail = form.email.trim();
    if (!lockedEmail) return;
    let active = true;
    const poll = async () => {
      try {
        const status = await checkLockStatus(lockedEmail);
        if (active && !status.locked) dispatch(clearAuthError());
      } catch {
        // Lỗi mạng khi poll thì bỏ qua, chờ lần kiểm tra kế tiếp.
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [locked, form.email, dispatch]);

  if (isAuthenticated) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Email không đúng định dạng";
    if (!form.password) next.password = "Vui lòng nhập mật khẩu";
    setErrors(next);
    if (Object.keys(next).length || locked) return;
    const result = await dispatch(
      login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }),
    );
    if (login.fulfilled.match(result))
      navigate(location.state?.from || "/", { replace: true });
  };
  return (
    <AuthShell title="Đăng nhập" subtitle="" login>
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Email"
          type="email"
          value={form.email}
          error={errors.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="custommer@gmail.com"
        />
        <Field
          label="Mật khẩu"
          type="password"
          value={form.password}
          error={errors.password}
          onChange={(v) => setForm({ ...form, password: v })}
          placeholder="••••••••"
        />
        {errorMessage && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
            {errorMessage}
          </p>
        )}
        <button className="btn-primary w-full" disabled={loading || locked}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </AuthShell>
  );
}
export function Field({ label, error, onChange, type, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          className={`w-full rounded-xl border bg-white/10 px-4 py-3.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:ring-4 focus:ring-red-500/20 ${isPassword ? "pr-12" : ""} ${error ? "border-red-400" : "border-white/20 focus:border-red-400"}`}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:text-white"
            tabIndex={-1}
          >
            <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && (
        <span className="mt-1 block text-xs text-red-300">{error}</span>
      )}
    </label>
  );
}
