/**
 * Pure business rules for reservations. No database access here,
 * so every rule is easy to unit test.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Allowed status changes. Anything not listed here is rejected. */
const STATUS_TRANSITIONS = {
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
};

/** Parse a 'YYYY-MM-DD' string as a UTC date so nights are never off by one. */
function toUtcDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Number of nights between check-in and check-out (check-out day is not a night). */
function countNights(checkIn, checkOut) {
  return Math.round((toUtcDate(checkOut) - toUtcDate(checkIn)) / DAY_MS);
}

/** Total price, rounded to cents to avoid floating point noise (e.g. 3 x 89.9). */
function calculateTotal(nightlyRate, checkIn, checkOut) {
  const total = nightlyRate * countNights(checkIn, checkOut);
  return Math.round(total * 100) / 100;
}

function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

module.exports = { STATUS_TRANSITIONS, countNights, calculateTotal, canTransition, toUtcDate };
