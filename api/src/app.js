const express = require('express');
const cors = require('cors');
const config = require('./config');
const { pool } = require('./db/pool');
const { errorHandler, notFoundRoute } = require('./middleware/errorHandler');
const roomsRoutes = require('./modules/rooms/rooms.routes');
const guestsRoutes = require('./modules/guests/guests.routes');
const reservationsRoutes = require('./modules/reservations/reservations.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/rooms', roomsRoutes);
  app.use('/api/guests', guestsRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
