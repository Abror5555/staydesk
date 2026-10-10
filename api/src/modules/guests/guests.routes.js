const express = require('express');
const { z } = require('zod');
const { pool } = require('../../db/pool');
const { validate, asyncHandler } = require('../../lib/validate');

const router = express.Router();

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      where = 'WHERE g.full_name ILIKE $1 OR g.email ILIKE $1';
    }
    const { rows } = await pool.query(
      `SELECT g.id, g.full_name AS "fullName", g.email, g.phone,
              COUNT(r.id)::int AS "staysCount"
       FROM guests g
       LEFT JOIN reservations r ON r.guest_id = g.id AND r.status <> 'cancelled'
       ${where}
       GROUP BY g.id
       ORDER BY g.full_name
       LIMIT 50`,
      params,
    );
    res.json(rows);
  }),
);

module.exports = router;
