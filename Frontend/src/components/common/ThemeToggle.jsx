import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../../redux/slices/themeSlice";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="currentColor">
    <circle cx="12" cy="12" r="4.5" />
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6" />
    </g>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-200" fill="currentColor">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </svg>
);

export default function ThemeToggle() {
  const mode = useSelector((state) => state.theme.mode);
  const dispatch = useDispatch();
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={`relative flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-100"}`}
    >
      <span className={`absolute left-1 grid h-7 w-7 place-items-center rounded-full bg-white shadow-md transition-transform ${isDark ? "translate-x-7 bg-slate-900" : "translate-x-0"}`}>
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
