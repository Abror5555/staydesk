require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/staydesk',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

module.exports = config;
