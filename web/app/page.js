'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { formatDate, formatMoney } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';

function StatCard({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi('/dashboard');

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `Overview for ${formatDate(data.date)}` : 'Today at a glance'}
        action={
          <Link href="/reservations/new" className="btn-primary">
            New reservation
          </Link>
        }
      />

      {loading && !data && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Occupancy tonight"
              value={`${data.occupancyRate}%`}
              hint={`${data.occupiedRooms} of ${data.activeRooms} rooms`}
            />
            <StatCard label="Arrivals today" value={data.arrivalsToday} hint="Confirmed, not checked in yet" />
            <StatCard label="Departures today" value={data.departuresToday} hint="Guests checking out" />
            <StatCard label="Revenue this month" value={formatMoney(data.revenueThisMonth)} hint="Excludes cancellations" />
          </div>

          <section className="card mt-6">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Upcoming arrivals</h2>
              <Link href="/reservations?status=confirmed" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {data.upcomingArrivals.length === 0 ? (
              <EmptyState title="No upcoming arrivals" description="New confirmed bookings will appear here." />
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Guest</th>
                    <th className="th">Room</th>
                    <th className="th">Check-in</th>
                    <th className="th">Check-out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.upcomingArrivals.map((r) => (
                    <tr key={r.id}>
                      <td className="td font-medium text-slate-900">{r.guestName}</td>
                      <td className="td">{r.roomNumber}</td>
                      <td className="td">{formatDate(r.checkIn)}</td>
                      <td className="td">{formatDate(r.checkOut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
