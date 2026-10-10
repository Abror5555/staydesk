const request = require('supertest');
const { createApp } = require('../src/app');
const { pool } = require('../src/db/pool');

const app = createApp();
const api = () => request(app);

async function resetDb() {
  await pool.query('TRUNCATE reservations, guests, rooms RESTART IDENTITY CASCADE');
}

async function createRoom(overrides = {}) {
  const res = await api()
    .post('/api/rooms')
    .send({ number: '101', type: 'double', capacity: 2, nightlyRate: 100, ...overrides });
  if (res.status !== 201) throw new Error(`createRoom failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

function reservationPayload(roomId, overrides = {}) {
  return {
    roomId,
    guest: { fullName: 'Test Guest', email: 'guest@example.com', phone: '+1 555 0100' },
    checkIn: '2030-05-10',
    checkOut: '2030-05-13',
    guestsCount: 2,
    ...overrides,
  };
}

module.exports = { app, api, pool, resetDb, createRoom, reservationPayload };
