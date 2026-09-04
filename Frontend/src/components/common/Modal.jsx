import { Icon } from "./Icons";
export default function Modal({
  open,
  title,
  onClose,
  children,
  size = "max-w-xl",
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        className={`pointer-events-auto relative max-h-[90vh] w-full ${size} overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}
