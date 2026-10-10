const { pool, withTransaction } = require('../../db/pool');
const { notFound, conflict, unprocessable } = require('../../lib/errors');
const { calculateTotal, canTransition, countNights } = require('./reservation.rules');

// Two stays overlap when one starts before the other ends: [a, b) and [c, d) overlap if a < d and c < b.
const OVERLAP_SQL = `
  SELECT 1 FROM reservations r
  WHERE r.room_id = $1
    AND r.status <> 'cancelled'
    AND r.check_in < $3
    AND r.check_out > $2
  LIMIT 1`;

const RESERVATION_SELECT = `
  SELECT r.id, r.check_in AS "checkIn", r.check_out AS "checkOut",
         r.guests_count AS "guestsCount", r.status, r.total_price AS "totalPrice",
         r.notes, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
         json_build_object('id', rm.id, 'number', rm.number, 'type', rm.type) AS room,
         json_build_object('id', g.id, 'fullName', g.full_name, 'email', g.email, 'phone', g.phone) AS guest
  FROM reservations r
  JOIN rooms rm ON rm.id = r.room_id
  JOIN guests g ON g.id = r.guest_id`;

async function findAvailableRooms({ checkIn, checkOut, guests }) {
  const { rows } = await pool.query(
    `SELECT rm.id, rm.number, rm.type, rm.capacity, rm.nightly_rate AS "nightlyRate"
     FROM rooms rm
     WHERE rm.is_active
       AND rm.capacity >= $3
       AND NOT EXISTS (
         SELECT 1 FROM reservations r
         WHERE r.room_id = rm.id AND r.status <> 'cancelled'
           AND r.check_in < $2 AND r.check_out > $1
       )
     ORDER BY rm.nightly_rate, rm.number`,
    [checkIn, checkOut, guests],
  );
  const nights = countNights(checkIn, checkOut);
  return rows.map((room) => ({
    ...room,
    nights,
    totalPrice: calculateTotal(room.nightlyRate, checkIn, checkOut),
  }));
}

async function listReservations({ status, search, from, to, page, pageSize }) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (status) add('r.status = ?', status);
  if (from) add('r.check_out > ?', from);
  if (to) add('r.check_in < ?', to);
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    where.push(`(g.full_name ILIKE ${p} OR g.email ILIKE ${p} OR rm.number ILIKE ${p})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations r JOIN rooms rm ON rm.id = r.room_id JOIN guests g ON g.id = r.guest_id
     ${whereSql}`,
    params,
  );

  const offset = (page - 1) * pageSize;
  const { rows } = await pool.query(
    `${RESERVATION_SELECT} ${whereSql}
     ORDER BY r.check_in DESC, r.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset],
  );

  const total = countResult.rows[0].total;
  return { items: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getReservation(id, client = pool) {
  const { rows } = await client.query(`${RESERVATION_SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw notFound('Reservation');
  return rows[0];
}

async function createReservation(input) {
  return withTransaction(async (client) => {
    // Lock the room row: concurrent bookings for the same room now wait for each
    // other instead of both passing the availability check at the same time.
    const roomResult = await client.query(
      'SELECT id, capacity, nightly_rate AS "nightlyRate", is_active AS "isActive" FROM rooms WHERE id = $1 FOR UPDATE',
      [input.roomId],
    );
    const room = roomResult.rows[0];
    if (!room) throw notFound('Room');
    if (!room.isActive) throw unprocessable('ROOM_INACTIVE', 'This room is not available for booking');
    if (input.guestsCount > room.capacity) {
      throw unprocessable('CAPACITY_EXCEEDED', `This room fits up to ${room.capacity} guest(s)`, {
        guestsCount: `Maximum ${room.capacity} for this room`,
      });
    }

    const overlap = await client.query(OVERLAP_SQL, [input.roomId, input.checkIn, input.checkOut]);
    if (overlap.rowCount > 0) {
      throw conflict('ROOM_NOT_AVAILABLE', 'This room is already booked for the selected dates');
    }

    // Returning guests are matched by email; their name/phone are refreshed.
    const guestResult = await client.query(
      `INSERT INTO guests (full_name, email, phone)
       VALUES ($1, $2, NULLIF($3, ''))
       ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             phone = COALESCE(EXCLUDED.phone, guests.phone)
       RETURNING id`,
      [input.guest.fullName, input.guest.email, input.guest.phone || ''],
    );

    const totalPrice = calculateTotal(room.nightlyRate, input.checkIn, input.checkOut);
    const inserted = await client.query(
      `INSERT INTO reservations (room_id, guest_id, check_in, check_out, guests_count, total_price, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.roomId,
        guestResult.rows[0].id,
        input.checkIn,
        input.checkOut,
        input.guestsCount,
        totalPrice,
        input.notes || null,
      ],
    );
    return getReservation(inserted.rows[0].id, client);
  });
}

async function updateStatus(id, nextStatus) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT status FROM reservations WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw notFound('Reservation');
    const current = rows[0].status;
    if (current === nextStatus) return getReservation(id, client);
    if (!canTransition(current, nextStatus)) {
      throw unprocessable('INVALID_STATUS_CHANGE', `Cannot change status from "${current}" to "${nextStatus}"`);
    }
    await client.query('UPDATE reservations SET status = $1, updated_at = now() WHERE id = $2', [nextStatus, id]);
    return getReservation(id, client);
  });
}

module.exports = { findAvailableRooms, listReservations, getReservation, createReservation, updateStatus };
