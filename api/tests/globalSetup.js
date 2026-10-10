require('dotenv').config();
const { migrate } = require('../src/db/migrate');

// Runs once before the whole test suite: make sure the test schema is current.
module.exports = async () => {
  const url = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/staydesk_test';
  await migrate(url, { log: false });
};
