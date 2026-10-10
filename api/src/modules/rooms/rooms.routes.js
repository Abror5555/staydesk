const express = require('express');
const { z } = require('zod');
const { validate, asyncHandler } = require('../../lib/validate');
const roomsService = require('./rooms.service');
const reservationsService = require('../reservations/reservations.service');
const { availabilityQuerySchema, idParamSchema } = require('../reservations/reservations.schemas');

const router = express.Router();

const roomType = z.enum(['single', 'double', 'suite']);

const listQuerySchema = z.object({
  type: roomType.optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

const createRoomSchema = z.object({
  number: z.string().trim().min(1).max(10),
  type: roomType,
  capacity: z.coerce.number().int().min(1).max(10),
  nightlyRate: z.coerce.number().min(0).max(100000),
});

const updateRoomSchema = createRoomSchema
  .omit({ number: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await roomsService.listRooms(req.query));
  }),
);

// Must be declared before '/:id' style routes.
router.get(
  '/availability',
  validate(availabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reservationsService.findAvailableRooms(req.query));
  }),
);

router.post(
  '/',
  validate(createRoomSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await roomsService.createRoom(req.body));
  }),
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateRoomSchema),
  asyncHandler(async (req, res) => {
    res.json(await roomsService.updateRoom(req.params.id, req.body));
  }),
);

module.exports = router;
