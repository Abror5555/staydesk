const { z } = require('zod');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

const stayRange = { checkIn: isoDate, checkOut: isoDate };
const checkOutAfterCheckIn = (v) => v.checkOut > v.checkIn;
const checkOutMessage = { message: 'Check-out must be after check-in', path: ['checkOut'] };

const guestInput = z.object({
  fullName: z.string().trim().min(2, 'Name is too short').max(120),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

const createReservationSchema = z
  .object({
    roomId: z.coerce.number().int().positive(),
    guest: guestInput,
    ...stayRange,
    guestsCount: z.coerce.number().int().min(1, 'At least 1 guest').max(10),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(checkOutAfterCheckIn, checkOutMessage);

const availabilityQuerySchema = z
  .object({
    ...stayRange,
    guests: z.coerce.number().int().min(1).max(10).default(1),
  })
  .refine(checkOutAfterCheckIn, checkOutMessage);

const listReservationsQuerySchema = z.object({
  status: z.enum(['confirmed', 'checked_in', 'checked_out', 'cancelled']).optional(),
  search: z.string().trim().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'checked_in', 'checked_out', 'cancelled']),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createReservationSchema,
  availabilityQuerySchema,
  listReservationsQuerySchema,
  updateStatusSchema,
  idParamSchema,
  isoDate,
};
