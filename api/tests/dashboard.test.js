const { api, pool, resetDb, createRoom, reservationPayload } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('GET /api/dashboard', () => {
  test('reports occupancy, arrivals, departures and monthly revenue for a given day', async () => {
    const r1 = await createRoom({ number: '101', nightlyRate: 100 });
    const r2 = await createRoom({ number: '102', nightlyRate: 100 });
    await createRoom({ number: '103', nightlyRate: 100 });
    await createRoom({ number: '104', nightlyRate: 100 });

    // In-house guest leaving on 2030-05-12
    const stay = await api()
      .post('/api/reservations')
      .send(reservationPayload(r1.id, { checkIn: '2030-05-10', checkOut: '2030-05-12' }));
    await api().patch(`/api/reservations/${stay.body.id}/status`).send({ status: 'checked_in' });

    // Arrival on 2030-05-12
    await api()
      .post('/api/reservations')
      .send(
        reservationPayload(r2.id, {
          checkIn: '2030-05-12',
          checkOut: '2030-05-15',
          guest: { fullName: 'Arriving Guest', email: 'arrive@example.com' },
        }),
      );

    const res = await api().get('/api/dashboard?date=2030-05-12');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      date: '2030-05-12',
      activeRooms: 4,
      occupiedRooms: 1,
      occupancyRate: 25,
      arrivalsToday: 1,
      departuresToday: 1,
      revenueThisMonth: 500,
    });
    expect(res.body.upcomingArrivals).toEqual([
      expect.objectContaining({ roomNumber: '102', guestName: 'Arriving Guest' }),
    ]);
  });

  test('handles an empty hotel without dividing by zero', async () => {
    const res = await api().get('/api/dashboard?date=2030-01-01');
    expect(res.body).toMatchObject({ activeRooms: 0, occupancyRate: 0, revenueThisMonth: 0 });
  });
});
