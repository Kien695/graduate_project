import { Link } from "react-router-dom";
import Icon from "../../components/common/Icon";
import background from "../../../assets/lambor.webp";
export default function AuthShell({ title, subtitle, children, login }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <img
        src={background}
        className="absolute inset-0 h-full w-full object-cover"
        alt="Showroom ô tô hiện đại"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/55 via-[#030914]/72 to-[#030914]/85" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/20 p-9 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-10">
        <Link to="/" className="mb-7 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-700 text-white">
            <Icon name="car" />
          </span>
          <span className="text-lg font-black tracking-tight text-white">
            AUTO CAR
          </span>
        </Link>
        <h2 className="text-center text-3xl font-black text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-slate-300">
            {subtitle}
          </p>
        )}
        <div className="mt-8">{children}</div>
        <p className="mt-7 text-center text-sm text-slate-300">
          {login ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <Link
            className="font-bold text-red-400 hover:text-red-300"
            to={login ? "/register" : "/login"}
          >
            {login ? "Đăng ký tài khoản" : "Đăng nhập"}
          </Link>
        </p>
      </div>
    </main>
  );
}
