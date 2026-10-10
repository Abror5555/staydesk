const {
  countNights,
  calculateTotal,
  canTransition,
} = require('../src/modules/reservations/reservation.rules');

describe('reservation rules', () => {
  test('counts nights between dates (check-out day is not a night)', () => {
    expect(countNights('2030-05-10', '2030-05-13')).toBe(3);
    expect(countNights('2030-05-10', '2030-05-11')).toBe(1);
  });

  test('counts nights correctly across month and DST boundaries', () => {
    expect(countNights('2030-02-27', '2030-03-02')).toBe(3);
    expect(countNights('2030-03-30', '2030-04-02')).toBe(3);
    expect(countNights('2030-10-26', '2030-10-29')).toBe(3);
  });

  test('calculates total price rounded to cents', () => {
    expect(calculateTotal(89.9, '2030-05-10', '2030-05-13')).toBe(269.7);
    expect(calculateTotal(100, '2030-05-10', '2030-05-12')).toBe(200);
  });

  test('allows only valid status transitions', () => {
    expect(canTransition('confirmed', 'checked_in')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('checked_in', 'checked_out')).toBe(true);
    expect(canTransition('checked_in', 'cancelled')).toBe(false);
    expect(canTransition('checked_out', 'confirmed')).toBe(false);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
  });
});
