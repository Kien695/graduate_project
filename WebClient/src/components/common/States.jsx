export function LoadingState({ text = "Đang tải dữ liệu showroom..." }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-red-500/20" />
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-red-500/20 border-t-red-600" />
      </div>
      <p className="text-xs font-bold tracking-wider uppercase text-slate-400">{text}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center border-red-500/20 bg-red-500/[0.02]">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
        {message}
      </p>
      {onRetry && (
        <button className="btn-secondary text-xs" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/[0.04]">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
