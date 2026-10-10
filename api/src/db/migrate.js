const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Apply every *.sql file in db/migrations that has not been applied yet.
 * Applied file names are stored in the schema_migrations table, so the
 * command is safe to run many times.
 */
async function migrate(connectionString = config.databaseUrl, { log = true } = {}) {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        if (log) console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    if (log) console.log('Database is up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { migrate };
