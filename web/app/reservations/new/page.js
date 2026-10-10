'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, toQuery } from '@/lib/api';
import { formatMoney, localIsoDate, nightsBetween } from '@/lib/format';
import { EmptyState, LoadingState, Notice, PageHeader } from '@/components/ui';

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <p className="field-error">{error}</p>}
    </label>
  );
}

export default function NewReservationPage() {
  const router = useRouter();
  const [stay, setStay] = useState({ checkIn: localIsoDate(0), checkOut: localIsoDate(2), guests: 2 });
  const [rooms, setRooms] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [guest, setGuest] = useState({ fullName: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);

  function updateStay(field, value) {
    setStay((s) => ({ ...s, [field]: value }));
    // Changing the stay invalidates the previous search result.
    setRooms(null);
    setSelectedRoom(null);
  }

  async function findRooms(e) {
    e?.preventDefault();
    setFormError(null);
    if (nights < 1) {
      setErrors({ checkOut: 'Check-out must be after check-in' });
      return;
    }
    setErrors({});
    setSearching(true);
    try {
      const result = await apiRequest(`/rooms/availability${toQuery(stay)}`);
      setRooms(result);
      setSelectedRoom(null);
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const reservation = await apiRequest('/reservations', {
        method: 'POST',
        body: {
          roomId: selectedRoom.id,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guestsCount: Number(stay.guests),
          notes: guest.notes || undefined,
          guest: { fullName: guest.fullName, email: guest.email, phone: guest.phone },
        },
      });
      router.push(`/reservations?created=${reservation.id}`);
    } catch (err) {
      // API field errors use paths like "guest.email": map them to our inputs.
      const fieldErrors = {};
      for (const [key, message] of Object.entries(err.fields || {})) {
        fieldErrors[key.replace(/^guest\./, '')] = message;
      }
      setErrors(fieldErrors);
      setFormError(err.message);
      if (err.code === 'ROOM_NOT_AVAILABLE') {
        // Someone booked this room a moment ago: refresh the list so the user can pick another one.
        await findRooms();
        setFormError('That room was just booked by someone else. Please choose another room.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="New reservation" description="Find a free room for the dates, then add the guest details." />

      {formError && (
        <Notice type="error" onClose={() => setFormError(null)}>
          {formError}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Step 1: dates */}
          <form onSubmit={findRooms} className="card space-y-4 p-5" noValidate>
            <h2 className="font-semibold text-slate-900">1. Stay details</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Check-in" error={errors.checkIn}>
                <input
                  type="date"
                  className={`input ${errors.checkIn ? 'input-error' : ''}`}
                  value={stay.checkIn}
                  onChange={(e) => updateStay('checkIn', e.target.value)}
                  required
                />
              </Field>
              <Field label="Check-out" error={errors.checkOut}>
                <input
                  type="date"
                  className={`input ${errors.checkOut ? 'input-error' : ''}`}
                  value={stay.checkOut}
                  min={stay.checkIn}
                  onChange={(e) => updateStay('checkOut', e.target.value)}
                  required
                />
              </Field>
              <Field label="Guests" error={errors.guests || errors.guestsCount}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input"
                  value={stay.guests}
                  onChange={(e) => updateStay('guests', e.target.value)}
                />
              </Field>
            </div>
            <button type="submit" className="btn-primary" disabled={searching}>
              {searching ? 'Searching...' : 'Find available rooms'}
            </button>
          </form>

          {/* Step 2: rooms */}
          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">2. Choose a room</h2>
            {searching && <LoadingState label="Checking availability..." />}
            {!searching && rooms === null && (
              <p className="text-sm text-slate-500">Select dates and click &quot;Find available rooms&quot;.</p>
            )}
            {!searching && rooms && rooms.length === 0 && (
              <EmptyState title="No rooms available" description="Try other dates or fewer guests." />
            )}
            {!searching && rooms && rooms.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {rooms.map((room) => {
                  const active = selectedRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`rounded-lg border p-4 text-left transition ${
                        active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      aria-pressed={active}
                    >
                      <p className="font-semibold text-slate-900">Room {room.number}</p>
                      <p className="text-sm text-slate-500">
                        <span className="capitalize">{room.type}</span> · up to {room.capacity} guest(s)
                      </p>
                      <p className="mt-2 text-sm">
                        {formatMoney(room.nightlyRate)} / night ·{' '}
                        <span className="font-semibold">{formatMoney(room.totalPrice)}</span> total
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Step 3: guest */}
        <form onSubmit={submit} className="card h-fit space-y-4 p-5 lg:col-span-2" noValidate>
          <h2 className="font-semibold text-slate-900">3. Guest details</h2>
          <Field label="Full name" error={errors.fullName}>
            <input
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              value={guest.fullName}
              onChange={(e) => setGuest({ ...guest, fullName: e.target.value })}
              required
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={guest.email}
              onChange={(e) => setGuest({ ...guest, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone (optional)" error={errors.phone}>
            <input className="input" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
          </Field>
          <Field label="Notes (optional)" error={errors.notes}>
            <textarea
              rows={3}
              className="input"
              value={guest.notes}
              onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
            />
          </Field>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            {selectedRoom ? (
              <>
                <p>
                  Room <strong>{selectedRoom.number}</strong> · {nights} night(s)
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(selectedRoom.totalPrice)}</p>
              </>
            ) : (
              <p className="text-slate-500">No room selected yet.</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!selectedRoom || submitting}>
            {submitting ? 'Saving...' : 'Confirm reservation'}
          </button>
        </form>
      </div>
    </>
  );
}
