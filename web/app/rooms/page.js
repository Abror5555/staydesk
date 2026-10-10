'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatMoney } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from '@/components/ui';

const EMPTY_ROOM = { number: '', type: 'double', capacity: 2, nightlyRate: '' };

export default function RoomsPage() {
  const { data: rooms, error, loading, reload } = useApi('/rooms');
  const [form, setForm] = useState(EMPTY_ROOM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function addRoom(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const room = await apiRequest('/rooms', {
        method: 'POST',
        body: { ...form, capacity: Number(form.capacity), nightlyRate: form.nightlyRate === '' ? undefined : Number(form.nightlyRate) },
      });
      setForm(EMPTY_ROOM);
      setMessage({ type: 'success', text: `Room ${room.number} added.` });
      reload();
    } catch (err) {
      setErrors(err.fields || {});
      setMessage({ type: 'error', text: err.code === 'DUPLICATE' ? 'This room number already exists.' : err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room) {
    try {
      await apiRequest(`/rooms/${room.id}`, { method: 'PATCH', body: { isActive: !room.isActive } });
      reload();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <PageHeader title="Rooms" description="Inventory, rates and availability for booking" />

      {message && (
        <Notice type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          {loading && !rooms && <LoadingState />}
          {error && (
            <div className="p-4">
              <ErrorState error={error} onRetry={reload} />
            </div>
          )}
          {rooms && rooms.length === 0 && <EmptyState title="No rooms yet" description="Add your first room on the right." />}
          {rooms && rooms.length > 0 && (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Room</th>
                  <th className="th">Type</th>
                  <th className="th">Capacity</th>
                  <th className="th">Rate</th>
                  <th className="th text-right">Bookable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className={room.isActive ? '' : 'text-slate-400'}>
                    <td className="td font-medium">{room.number}</td>
                    <td className="td capitalize">{room.type}</td>
                    <td className="td">{room.capacity}</td>
                    <td className="td">{formatMoney(room.nightlyRate)}</td>
                    <td className="td text-right">
                      <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => toggleActive(room)}>
                        {room.isActive ? 'Active · disable' : 'Disabled · enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <form onSubmit={addRoom} className="card h-fit space-y-4 p-5" noValidate>
          <h2 className="font-semibold text-slate-900">Add room</h2>
          <label className="block">
            <span className="label">Room number</span>
            <input
              className={`input ${errors.number ? 'input-error' : ''}`}
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
            {errors.number && <p className="field-error">{errors.number}</p>}
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="suite">Suite</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Capacity</span>
              <input
                type="number"
                min={1}
                max={10}
                className={`input ${errors.capacity ? 'input-error' : ''}`}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
              {errors.capacity && <p className="field-error">{errors.capacity}</p>}
            </label>
            <label className="block">
              <span className="label">Rate / night</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={`input ${errors.nightlyRate ? 'input-error' : ''}`}
                value={form.nightlyRate}
                onChange={(e) => setForm({ ...form, nightlyRate: e.target.value })}
              />
              {errors.nightlyRate && <p className="field-error">{errors.nightlyRate}</p>}
            </label>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Add room'}
          </button>
        </form>
      </div>
    </>
  );
}
