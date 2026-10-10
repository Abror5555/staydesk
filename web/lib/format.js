const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMoney(value) {
  return money.format(Number(value) || 0);
}

/** '2030-05-10' -> 'May 10, 2030'. Parsed as UTC so the day never shifts. */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  return shortDate.format(new Date(`${isoDate}T00:00:00Z`));
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`);
  return Math.max(0, Math.round(diff / 86400000));
}

/** Today (or today + n days) as 'YYYY-MM-DD' in the user's local calendar. */
export function localIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const STATUS_LABELS = {
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
};
