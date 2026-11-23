import { DateTime } from 'luxon';
import { LOCALE, toDateTime } from './dates.js';

// All dates are shown in the phone's local time, with British wording
// (the locale is passed on every call, never taken from a global setting).
const fmt = (iso, options) => toDateTime(iso).toLocaleString(options, { locale: LOCALE });

/** "Today", "Yesterday", or "Tue 3 Nov" */
export function formatRelativeDate(iso) {
  const date = toDateTime(iso);
  const diffDays = Math.round(DateTime.now().startOf('day').diff(date.startOf('day'), 'days').days);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** True if the ISO timestamp falls on today's date (local time). */
export function isToday(iso) {
  return Boolean(iso) && toDateTime(iso).hasSame(DateTime.now(), 'day');
}

/** 60 → "60", 62.5 → "62.5", 1.25 → "1.25" (up to two decimals, no trailing zeros) */
export function formatWeight(kg) {
  return String(Math.round(kg * 100) / 100);
}

/** "Tuesday 3 November" (+ year if not this year) */
export function formatLongDate(iso) {
  const d = toDateTime(iso);
  const base = fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  return d.year === DateTime.now().year ? base : `${base} ${d.year}`;
}

/** "18:02" */
export function formatTime(iso) {
  return fmt(iso, { hour: '2-digit', minute: '2-digit' });
}

/** "46 min" / "1 h 5 min" */
export function formatDuration(startIso, endIso) {
  const min = Math.max(0, Math.round(toDateTime(endIso).diff(toDateTime(startIso), 'minutes').minutes));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** 90 → "1:30", 600 → "10:00" (m:ss for a number of seconds) */
export function formatSeconds(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "+2.5 kg", "−5 kg", or null when unchanged */
export function formatWeightChange(diff) {
  if (!diff) return null;
  return `${diff > 0 ? '+' : '−'}${formatWeight(Math.abs(diff))} kg`;
}
