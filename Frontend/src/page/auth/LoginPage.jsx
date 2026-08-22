import LoginForm from "../../components/auth/LoginForm";
import showroom from "../../assets/showroom-login.png";
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-0 sm:p-5 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden bg-white shadow-2xl shadow-slate-300/50 sm:rounded-3xl lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src={showroom}
            className="absolute inset-0 h-full w-full object-cover"
            alt="Showroom ô tô hiện đại"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#031226]/40 via-transparent to-[#031226]/50" />
          <div className="absolute left-10 top-10 text-white">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600/90 text-xl font-black">
                AD
              </span>
              <span className="text-sm font-black tracking-[.2em]">
                AUTO DEALER
              </span>
            </div>
            <h2 className="max-w-sm text-3xl font-black leading-tight">
              HỆ THỐNG
              <br />
              QUẢN LÝ MUA BÁN Ô TÔ
            </h2>
            <p className="mt-4 text-sm text-blue-100">
              Quản lý dễ dàng · Bán hàng hiệu quả
            </p>
          </div>
        </div>
        <div className="flex items-center px-7 py-12 sm:px-14 lg:px-16">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
