// Runs before every test file: point the app at the test database.
require('dotenv').config();

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/staydesk_test';
