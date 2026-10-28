import { Link } from "react-router-dom";
import Icon from "../../components/common/Icon";
import background from "../../../assets/lambor.webp";

export default function AuthShell({ title, subtitle, children, login }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Background with Ambient Overlay */}
      <img
        src={background}
        className="absolute inset-0 h-full w-full object-cover scale-105 filter blur-[1px]"
        alt="Showroom ô tô hiện đại"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#07090e]/80 to-[#030508]/95" />
      
      {/* Ambient Red Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-red-600/20 blur-[120px]" />

      {/* Glassmorphic Auth Box */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-black/50 p-8 sm:p-10 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <Link to="/" className="group mb-8 flex items-center justify-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/40 transition-transform duration-300 group-hover:scale-105">
            <Icon name="car" className="h-5 w-5" />
          </span>
          <div className="text-left">
            <div className="text-base font-black tracking-wider text-white">
              AUTO CAR
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-red-500">
              Showroom Deluxe
            </div>
          </div>
        </Link>

        <h2 className="text-center text-2xl sm:text-3xl font-black text-white tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-center text-xs text-slate-300 leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="mt-8">{children}</div>

        <p className="mt-8 text-center text-xs text-slate-400">
          {login ? "Chưa có tài khoản thành viên?" : "Đã có tài khoản trước đó?"}{" "}
          <Link
            className="font-bold text-red-400 hover:text-red-300 transition-colors"
            to={login ? "/register" : "/login"}
          >
            {login ? "Đăng ký ngay" : "Đăng nhập tại đây"}
          </Link>
        </p>
      </div>
    </main>
  );
}
