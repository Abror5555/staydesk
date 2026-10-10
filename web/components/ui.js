import { STATUS_LABELS } from '@/lib/format';

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statusStyles = {
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  checked_in: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  checked_out: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-red-50 text-red-600 ring-red-200',
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        statusStyles[status] || statusStyles.checked_out
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
      <p className="font-medium text-slate-900">Could not load data</p>
      <p className="text-sm text-slate-500">{error?.message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}

export function Notice({ type = 'success', children, onClose }) {
  const styles =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`mb-4 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${styles}`} role="status">
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="font-medium opacity-70 hover:opacity-100" aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}
