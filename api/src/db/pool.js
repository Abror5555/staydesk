const { Pool, types } = require('pg');
const config = require('../config');

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects.
// A hotel night is a calendar date, so converting it to a timestamp in the
// server's time zone would silently shift dates by one day.
types.setTypeParser(1082, (value) => value);

// Return NUMERIC columns (prices) as numbers instead of strings.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const pool = new Pool({ connectionString: config.databaseUrl });

/**
 * Run a function inside a single database transaction.
 * The callback receives a dedicated client; everything is rolled back on error.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
