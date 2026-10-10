const { pool } = require('../../db/pool');
const { notFound } = require('../../lib/errors');

const ROOM_COLUMNS = `id, number, type, capacity, nightly_rate AS "nightlyRate",
  is_active AS "isActive", created_at AS "createdAt"`;

async function listRooms({ type, active }) {
  const where = [];
  const params = [];
  if (type) {
    params.push(type);
    where.push(`type = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(active);
    where.push(`is_active = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT ${ROOM_COLUMNS} FROM rooms ${whereSql} ORDER BY number`, params);
  return rows;
}

async function createRoom({ number, type, capacity, nightlyRate }) {
  const { rows } = await pool.query(
    `INSERT INTO rooms (number, type, capacity, nightly_rate)
     VALUES ($1, $2, $3, $4) RETURNING ${ROOM_COLUMNS}`,
    [number, type, capacity, nightlyRate],
  );
  return rows[0];
}

async function updateRoom(id, changes) {
  const columns = { type: 'type', capacity: 'capacity', nightlyRate: 'nightly_rate', isActive: 'is_active' };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (changes[key] !== undefined) {
      params.push(changes[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (sets.length === 0) {
    const { rows } = await pool.query(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id = $1`, [id]);
    if (!rows[0]) throw notFound('Room');
    return rows[0];
  }
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE rooms SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${ROOM_COLUMNS}`,
    params,
  );
  if (!rows[0]) throw notFound('Room');
  return rows[0];
}

module.exports = { listRooms, createRoom, updateRoom };
