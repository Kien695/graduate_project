import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearAuthError, login } from "../../redux/slices/authSlice";
import { Icon } from "../common/Icons";

const WEB_DEVICE_ID_KEY = "autoDealerWebDeviceId";
const getWebDeviceId = () => {
  const existing = localStorage.getItem(WEB_DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(WEB_DEVICE_ID_KEY, generated);
  return generated;
};

export default function LoginForm() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false);
  const { loading, error } = useSelector((s) => s.auth);
  const dispatch = useDispatch(),
    navigate = useNavigate();
  useEffect(() => {
    if (error) toast.error(error);
    return () => dispatch(clearAuthError());
  }, [error, dispatch]);
  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password)
      return toast.warning("Vui lòng nhập đầy đủ thông tin");
    const result = await dispatch(
      login({
        email,
        password,
        deviceId: getWebDeviceId(),
        deviceType: "PC",
      }),
    );
    if (login.fulfilled.match(result)) {
      toast.success("Đăng nhập thành công");
      navigate("/admin/dashboard");
    }
  };
  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md">
      <div className="mb-9">
        <div className="mb-7 flex items-center gap-3 lg:hidden">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
            <Icon name="car" />
          </div>
          <span className="font-black text-slate-950">AUTO DEALER</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600">
          Chào mừng trở lại
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Vui lòng đăng nhập để tiếp tục quản lý hệ thống.
        </p>
      </div>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@autodealer.com"
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Mật khẩu
          </span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400"
            >
              <Icon name="eye" className="h-4 w-4" />
            </button>
          </div>
        </label>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-500">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600"
            />
            Ghi nhớ đăng nhập
          </label>
          <span className="font-semibold text-blue-600">Quên mật khẩu?</span>
        </div>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </div>
      <p className="mt-14 text-center text-xs text-slate-400">
        © 2026 Auto Dealer Management System
      </p>
    </form>
  );
}
