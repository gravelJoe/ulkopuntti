const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today", "Yesterday", or "Tue 3 Nov" */
export function formatRelativeDate(iso) {
  const date = new Date(iso);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return dayFormat.format(date);
}

/** 60 → "60", 62.5 → "62.5" */
export function formatWeight(kg) {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

const longDateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** "Tuesday 3 November" (+ year if not this year) */
export function formatLongDate(iso) {
  const d = new Date(iso);
  const base = longDateFormat.format(d);
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "18:02" */
export function formatTime(iso) {
  return timeFormat.format(new Date(iso));
}

/** "46 min" / "1 h 5 min" */
export function formatDuration(startIso, endIso) {
  const min = Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** "+2.5 kg", "−5 kg", or null when unchanged */
export function formatWeightChange(diff) {
  if (!diff) return null;
  return `${diff > 0 ? '+' : '−'}${formatWeight(Math.abs(diff))} kg`;
}
