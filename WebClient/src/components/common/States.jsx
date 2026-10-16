export function LoadingState({ text = "Đang tải dữ liệu..." }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-red-700" />
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">!</div>
      <p className="font-semibold text-slate-700 dark:text-slate-200">
        {message}
      </p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function EmptyState({ title, description }) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-5xl opacity-50">◇</div>
      <h3 className="font-extrabold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}
