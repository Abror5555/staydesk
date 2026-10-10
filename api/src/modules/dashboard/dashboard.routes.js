const express = require('express');
const { z } = require('zod');
const { pool } = require('../../db/pool');
const { validate, asyncHandler } = require('../../lib/validate');
const { isoDate } = require('../reservations/reservations.schemas');

const router = express.Router();

const querySchema = z.object({ date: isoDate.optional() });

router.get(
  '/',
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => {
    // The day to report on. Defaults to the database's current date.
    const date = req.query.date || null;

    const { rows } = await pool.query(
      `WITH d AS (SELECT COALESCE($1::date, CURRENT_DATE) AS day)
       SELECT
         (SELECT day FROM d)::text AS date,
         (SELECT COUNT(*)::int FROM rooms WHERE is_active) AS "activeRooms",
         (SELECT COUNT(DISTINCT room_id)::int FROM reservations, d
            WHERE status IN ('confirmed', 'checked_in')
              AND check_in <= d.day AND check_out > d.day) AS "occupiedRooms",
         (SELECT COUNT(*)::int FROM reservations, d
            WHERE status = 'confirmed' AND check_in = d.day) AS "arrivalsToday",
         (SELECT COUNT(*)::int FROM reservations, d
            WHERE status = 'checked_in' AND check_out = d.day) AS "departuresToday",
         (SELECT COALESCE(SUM(total_price), 0) FROM reservations, d
            WHERE status <> 'cancelled'
              AND date_trunc('month', check_in) = date_trunc('month', d.day)) AS "revenueThisMonth"`,
      [date],
    );
    const stats = rows[0];
    stats.revenueThisMonth = Number(stats.revenueThisMonth);
    stats.occupancyRate =
      stats.activeRooms === 0 ? 0 : Math.round((stats.occupiedRooms / stats.activeRooms) * 100);

    const upcoming = await pool.query(
      `SELECT r.id, r.check_in AS "checkIn", r.check_out AS "checkOut", r.status,
              rm.number AS "roomNumber", g.full_name AS "guestName"
       FROM reservations r
       JOIN rooms rm ON rm.id = r.room_id
       JOIN guests g ON g.id = r.guest_id
       WHERE r.status = 'confirmed' AND r.check_in >= $1::date
       ORDER BY r.check_in, r.id
       LIMIT 5`,
      [stats.date],
    );

    res.json({ ...stats, upcomingArrivals: upcoming.rows });
  }),
);

module.exports = router;
