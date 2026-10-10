const express = require('express');
const { validate, asyncHandler } = require('../../lib/validate');
const service = require('./reservations.service');
const {
  createReservationSchema,
  listReservationsQuerySchema,
  updateStatusSchema,
  idParamSchema,
} = require('./reservations.schemas');

const router = express.Router();

router.get(
  '/',
  validate(listReservationsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await service.listReservations(req.query));
  }),
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await service.getReservation(req.params.id));
  }),
);

router.post(
  '/',
  validate(createReservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await service.createReservation(req.body);
    res.status(201).json(reservation);
  }),
);

router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.updateStatus(req.params.id, req.body.status));
  }),
);

module.exports = router;
