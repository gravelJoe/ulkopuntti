// Date helpers on Luxon — pure (no storage, no Vite globals), so they load in
// plain Node too. "Now" is DateTime.now(); in dev, utils/clock.js can shift it
// (Settings.now) to simulate other days and weeks.
import { DateTime } from 'luxon';

export const LOCALE = 'en-GB';

/** A Luxon DateTime from a DateTime, a JS Date or an ISO string (local zone). */
export function toDateTime(x) {
  if (DateTime.isDateTime(x)) return x;
  if (x instanceof Date) return DateTime.fromJSDate(x);
  return DateTime.fromISO(String(x));
}

/** Timestamp to store (workouts, anchors): UTC ISO with "Z", same format as before. */
export const nowISO = () => DateTime.now().toUTC().toISO();
