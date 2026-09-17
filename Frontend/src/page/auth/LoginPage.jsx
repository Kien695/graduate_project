import LoginForm from "../../components/auth/LoginForm";
import showroom from "../../assets/showroom-login.png";
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <img
        src={showroom}
        className="absolute inset-0 h-full w-full object-cover object-[50%_75%]"
        alt="Showroom ô tô hiện đại"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/55 via-[#030914]/72 to-[#030914]/85" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/20 p-9 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-10">
        <LoginForm />
      </div>
    </main>
  );
}
