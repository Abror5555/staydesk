'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest, toQuery } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatDate, formatMoney, nightsBetween, STATUS_LABELS } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader, StatusBadge } from '@/components/ui';

// Actions available for each status (mirrors the API's allowed transitions).
const ACTIONS = {
  confirmed: [
    { to: 'checked_in', label: 'Check in', style: 'btn-secondary' },
    { to: 'cancelled', label: 'Cancel', style: 'btn-danger', confirm: 'Cancel this reservation?' },
  ],
  checked_in: [{ to: 'checked_out', label: 'Check out', style: 'btn-secondary' }],
};

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ReservationsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(params.get('created') ? 'Reservation created successfully.' : null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const debouncedSearch = useDebounced(search);

  // The page number belongs to one combination of filters: when the filters
  // change, we are automatically back on page 1 (no extra effect needed).
  const filterKey = `${status}|${debouncedSearch}`;
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next) => setPageState({ filterKey, page: next });

  const { data, error, loading, reload } = useApi(
    `/reservations${toQuery({ status, search: debouncedSearch, page, pageSize: 10 })}`,
  );

  async function changeStatus(reservation, action) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusyId(reservation.id);
    setActionError(null);
    try {
      await apiRequest(`/reservations/${reservation.id}/status`, { method: 'PATCH', body: { status: action.to } });
      setNotice(`Reservation #${reservation.id}: ${STATUS_LABELS[action.to].toLowerCase()}.`);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Search, filter and manage guest stays"
        action={
          <Link href="/reservations/new" className="btn-primary">
            New reservation
          </Link>
        }
      />

      {notice && (
        <Notice
          onClose={() => {
            setNotice(null);
            router.replace('/reservations');
          }}
        >
          {notice}
        </Notice>
      )}
      {actionError && (
        <Notice type="error" onClose={() => setActionError(null)}>
          {actionError}
        </Notice>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <input
            className="input max-w-xs"
            placeholder="Search guest, email or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search reservations"
          />
          <select
            className="input max-w-[180px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading && !data && <LoadingState />}
        {error && (
          <div className="p-4">
            <ErrorState error={error} onRetry={reload} />
          </div>
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="No reservations found"
            description={status || search ? 'Try a different filter or search term.' : 'Create the first reservation.'}
          />
        )}

        {data && data.items.length > 0 && (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">#</th>
                  <th className="th">Guest</th>
                  <th className="th">Room</th>
                  <th className="th">Stay</th>
                  <th className="th">Total</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td className="td text-slate-500">{r.id}</td>
                    <td className="td">
                      <p className="font-medium text-slate-900">{r.guest.fullName}</p>
                      <p className="text-xs text-slate-500">{r.guest.email}</p>
                    </td>
                    <td className="td">
                      {r.room.number} <span className="text-xs capitalize text-slate-500">· {r.room.type}</span>
                    </td>
                    <td className="td">
                      {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                      <p className="text-xs text-slate-500">
                        {nightsBetween(r.checkIn, r.checkOut)} night(s) · {r.guestsCount} guest(s)
                      </p>
                    </td>
                    <td className="td font-medium">{formatMoney(r.totalPrice)}</td>
                    <td className="td">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {(ACTIONS[r.status] || []).map((action) => (
                          <button
                            key={action.to}
                            type="button"
                            className={`${action.style} px-3 py-1.5 text-xs`}
                            disabled={busyId === r.id}
                            onClick={() => changeStatus(r, action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {data.page} of {data.totalPages} · {data.total} reservations
            </span>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReservationsView />
    </Suspense>
  );
}
