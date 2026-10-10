const { api, pool, resetDb, createRoom } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('rooms API', () => {
  test('creates and lists rooms', async () => {
    await createRoom({ number: '201', type: 'suite', capacity: 4, nightlyRate: 250 });
    await createRoom({ number: '101', type: 'single', capacity: 1, nightlyRate: 80 });

    const res = await api().get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.number)).toEqual(['101', '201']);
    expect(res.body[0]).toMatchObject({ type: 'single', capacity: 1, nightlyRate: 80, isActive: true });
  });

  test('filters rooms by type', async () => {
    await createRoom({ number: '101', type: 'single', capacity: 1 });
    await createRoom({ number: '301', type: 'suite', capacity: 4 });

    const res = await api().get('/api/rooms?type=suite');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].number).toBe('301');
  });

  test('rejects invalid room data with field errors', async () => {
    const res = await api().post('/api/rooms').send({ number: '', type: 'penthouse', capacity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['number', 'type', 'capacity', 'nightlyRate']),
    );
  });

  test('rejects a duplicate room number with 409', async () => {
    await createRoom({ number: '101' });
    const res = await api()
      .post('/api/rooms')
      .send({ number: '101', type: 'double', capacity: 2, nightlyRate: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE');
  });

  test('deactivates a room', async () => {
    const room = await createRoom();
    const res = await api().patch(`/api/rooms/${room.id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  test('returns 404 for an unknown room', async () => {
    const res = await api().patch('/api/rooms/9999').send({ capacity: 3 });
    expect(res.status).toBe(404);
  });
});
