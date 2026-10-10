const { api, pool, resetDb, createRoom, reservationPayload } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/reservations', () => {
  test('creates a reservation and calculates the total price', async () => {
    const room = await createRoom({ nightlyRate: 120 });
    const res = await api().post('/api/reservations').send(reservationPayload(room.id));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      checkIn: '2030-05-10',
      checkOut: '2030-05-13',
      status: 'confirmed',
      totalPrice: 360,
      room: { id: room.id, number: '101' },
      guest: { fullName: 'Test Guest', email: 'guest@example.com' },
    });
  });

  test('reuses an existing guest matched by email (case-insensitive)', async () => {
    const room = await createRoom();
    await api().post('/api/reservations').send(reservationPayload(room.id));
    const second = await api()
      .post('/api/reservations')
      .send(
        reservationPayload(room.id, {
          checkIn: '2030-06-01',
          checkOut: '2030-06-02',
          guest: { fullName: 'Test Guest Jr', email: 'GUEST@example.com' },
        }),
      );

    expect(second.status).toBe(201);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM guests');
    expect(rows[0].n).toBe(1);
    expect(second.body.guest.fullName).toBe('Test Guest Jr');
  });

  test('returns field errors for invalid input', async () => {
    const room = await createRoom();
    const res = await api()
      .post('/api/reservations')
      .send(reservationPayload(room.id, { checkIn: '2030-05-13', checkOut: '2030-05-10', guestsCount: 0 }));

    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({
      checkOut: 'Check-out must be after check-in',
      guestsCount: 'At least 1 guest',
    });
  });

  test('rejects more guests than the room capacity', async () => {
    const room = await createRoom({ capacity: 2 });
    const res = await api().post('/api/reservations').send(reservationPayload(room.id, { guestsCount: 3 }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CAPACITY_EXCEEDED');
  });

  test('rejects an overlapping booking for the same room', async () => {
    const room = await createRoom();
    await api().post('/api/reservations').send(reservationPayload(room.id));

    const res = await api()
      .post('/api/reservations')
      .send(reservationPayload(room.id, { checkIn: '2030-05-12', checkOut: '2030-05-15' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_NOT_AVAILABLE');
  });

  test('allows back-to-back stays (check-out day = next check-in day)', async () => {
    const room = await createRoom();
    await api().post('/api/reservations').send(reservationPayload(room.id));

    const res = await api()
      .post('/api/reservations')
      .send(reservationPayload(room.id, { checkIn: '2030-05-13', checkOut: '2030-05-14' }));
    expect(res.status).toBe(201);
  });

  test('a cancelled reservation frees the room again', async () => {
    const room = await createRoom();
    const first = await api().post('/api/reservations').send(reservationPayload(room.id));
    await api().patch(`/api/reservations/${first.body.id}/status`).send({ status: 'cancelled' });

    const res = await api().post('/api/reservations').send(reservationPayload(room.id));
    expect(res.status).toBe(201);
  });

  test('two simultaneous requests for the same room: exactly one succeeds', async () => {
    const room = await createRoom();
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        api()
          .post('/api/reservations')
          .send(reservationPayload(room.id, { guest: { fullName: `Guest ${i}`, email: `g${i}@example.com` } })),
      ),
    );

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM reservations WHERE status <> 'cancelled'");
    expect(rows[0].n).toBe(1);
  });

  test('the database itself blocks overlaps that bypass the API', async () => {
    const room = await createRoom();
    await api().post('/api/reservations').send(reservationPayload(room.id));
    const guest = await pool.query('SELECT id FROM guests LIMIT 1');

    await expect(
      pool.query(
        `INSERT INTO reservations (room_id, guest_id, check_in, check_out, guests_count, total_price)
         VALUES ($1, $2, '2030-05-11', '2030-05-12', 1, 100)`,
        [room.id, guest.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: '23P01' });
  });
});

describe('GET /api/rooms/availability', () => {
  test('returns only free rooms that fit the group, with total price', async () => {
    const booked = await createRoom({ number: '101', capacity: 2, nightlyRate: 100 });
    await createRoom({ number: '102', capacity: 2, nightlyRate: 90 });
    await createRoom({ number: '103', capacity: 1, nightlyRate: 50 });
    await api().post('/api/reservations').send(reservationPayload(booked.id));

    const res = await api().get('/api/rooms/availability?checkIn=2030-05-11&checkOut=2030-05-12&guests=2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ number: '102', nights: 1, totalPrice: 90 })]);
  });

  test('validates the date range', async () => {
    const res = await api().get('/api/rooms/availability?checkIn=2030-05-12&checkOut=2030-05-12');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/reservations/:id/status', () => {
  test('follows the allowed status workflow', async () => {
    const room = await createRoom();
    const { body } = await api().post('/api/reservations').send(reservationPayload(room.id));

    const checkIn = await api().patch(`/api/reservations/${body.id}/status`).send({ status: 'checked_in' });
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.status).toBe('checked_in');

    const cancel = await api().patch(`/api/reservations/${body.id}/status`).send({ status: 'cancelled' });
    expect(cancel.status).toBe(422);
    expect(cancel.body.error.code).toBe('INVALID_STATUS_CHANGE');

    const checkOut = await api().patch(`/api/reservations/${body.id}/status`).send({ status: 'checked_out' });
    expect(checkOut.body.status).toBe('checked_out');
  });

  test('returns 404 for an unknown reservation', async () => {
    const res = await api().patch('/api/reservations/999/status').send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/reservations', () => {
  test('filters by status and search, and paginates', async () => {
    const room1 = await createRoom({ number: '101' });
    const room2 = await createRoom({ number: '102' });
    for (let i = 0; i < 3; i += 1) {
      await api()
        .post('/api/reservations')
        .send(
          reservationPayload(room1.id, {
            checkIn: `2030-07-0${i * 2 + 1}`,
            checkOut: `2030-07-0${i * 2 + 2}`,
            guest: { fullName: `Alice ${i}`, email: `alice${i}@example.com` },
          }),
        );
    }
    const bob = await api()
      .post('/api/reservations')
      .send(reservationPayload(room2.id, { guest: { fullName: 'Bob Stone', email: 'bob@example.com' } }));
    await api().patch(`/api/reservations/${bob.body.id}/status`).send({ status: 'cancelled' });

    const page1 = await api().get('/api/reservations?pageSize=2&page=1');
    expect(page1.body).toMatchObject({ total: 4, totalPages: 2, page: 1 });
    expect(page1.body.items).toHaveLength(2);

    const cancelled = await api().get('/api/reservations?status=cancelled');
    expect(cancelled.body.items.map((r) => r.guest.fullName)).toEqual(['Bob Stone']);

    const search = await api().get('/api/reservations?search=alice');
    expect(search.body.total).toBe(3);
  });
});
