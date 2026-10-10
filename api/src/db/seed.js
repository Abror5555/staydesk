const { pool } = require('./pool');
const { calculateTotal } = require('../modules/reservations/reservation.rules');

/** Date helper: today + n days as 'YYYY-MM-DD' (UTC). */
function dayOffset(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const rooms = [
  ['101', 'single', 1, 79],
  ['102', 'single', 1, 79],
  ['103', 'double', 2, 119],
  ['104', 'double', 2, 119],
  ['201', 'double', 3, 139],
  ['202', 'double', 3, 139],
  ['301', 'suite', 4, 249],
  ['302', 'suite', 5, 289],
];

const guests = [
  ['Emma Johnson', 'emma.johnson@example.com', '+1 415 555 0101'],
  ['Liam Smith', 'liam.smith@example.com', '+1 415 555 0102'],
  ['Olivia Brown', 'olivia.brown@example.com', '+1 415 555 0103'],
  ['Noah Davis', 'noah.davis@example.com', null],
  ['Ava Wilson', 'ava.wilson@example.com', '+1 415 555 0105'],
  ['Lucas Martin', 'lucas.martin@example.com', null],
];

// [roomNumber, guestEmail, checkInOffset, nights, guestsCount, status]
const reservations = [
  ['101', 'emma.johnson@example.com', -2, 4, 1, 'checked_in'],
  ['103', 'liam.smith@example.com', -1, 1, 2, 'checked_in'],
  ['201', 'olivia.brown@example.com', 0, 3, 2, 'confirmed'],
  ['301', 'noah.davis@example.com', 0, 2, 4, 'confirmed'],
  ['104', 'ava.wilson@example.com', 2, 5, 2, 'confirmed'],
  ['302', 'lucas.martin@example.com', 5, 3, 3, 'confirmed'],
  ['202', 'emma.johnson@example.com', -10, 3, 2, 'checked_out'],
  ['102', 'liam.smith@example.com', 7, 2, 1, 'cancelled'],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE reservations, guests, rooms RESTART IDENTITY CASCADE');

    const roomIds = {};
    const rates = {};
    for (const [number, type, capacity, rate] of rooms) {
      const { rows } = await client.query(
        'INSERT INTO rooms (number, type, capacity, nightly_rate) VALUES ($1, $2, $3, $4) RETURNING id',
        [number, type, capacity, rate],
      );
      roomIds[number] = rows[0].id;
      rates[number] = rate;
    }

    const guestIds = {};
    for (const [name, email, phone] of guests) {
      const { rows } = await client.query(
        'INSERT INTO guests (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id',
        [name, email, phone],
      );
      guestIds[email] = rows[0].id;
    }

    for (const [room, email, offset, nights, count, status] of reservations) {
      const checkIn = dayOffset(offset);
      const checkOut = dayOffset(offset + nights);
      await client.query(
        `INSERT INTO reservations (room_id, guest_id, check_in, check_out, guests_count, status, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [roomIds[room], guestIds[email], checkIn, checkOut, count, status, calculateTotal(rates[room], checkIn, checkOut)],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${rooms.length} rooms, ${guests.length} guests, ${reservations.length} reservations.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
