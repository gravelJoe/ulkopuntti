// Display rules for slot.recent (the last 3 sessions of an exercise), shared by
// the workout's "History · last 3" bar and the card's "Last time" line.
// Pure apart from reading gym names from the program store.

import { getGym } from '../program/store.js';
import { formatRelativeDate, formatWeight } from '../utils/format.js';

// A stored Repeat is also what a kept hold week saves, so say what it did.
const RESULT = { success: 'Go up', neutral: 'Same weight', fail: 'Go down' };

/** " · Gym B" when that session was at another gym that still exists; otherwise ''. */
export function otherGym(entryGymId, todayGymId) {
  if (!entryGymId || entryGymId === todayGymId) return '';
  const name = getGym(entryGymId)?.name;
  return name ? ` · ${name}` : '';
}

/** "Sun 6 Dec · 30 kg · 5/5 · Go up" (+ " · Gym B"); the result is left out when there is none. */
export function recentLine(r, todayGymId) {
  const parts = [formatRelativeDate(r.finishedAt), `${formatWeight(r.weight)} kg`, `${r.done}/${r.total}`, RESULT[r.outcome]];
  return parts.filter(Boolean).join(' · ') + otherGym(r.gymId, todayGymId);
}

/** The newest entry actually lifted (a set done), or undefined. Zero-set results are skipped. */
export const lastLifted = (recent) => recent?.find((r) => r.done > 0);

/**
 * [{ id, list }] for the History bar: each slot's selected exercise with its
 * recent sessions, without empty lists, and once per exercise (a workout can
 * have the same exercise in two slots; the first slot wins).
 */
export function historyGroups(slots) {
  const seen = new Set();
  const groups = [];
  for (const slot of slots) {
    const id = slot.selected;
    const list = slot.recent?.[id] ?? [];
    if (list.length === 0 || seen.has(id)) continue;
    seen.add(id);
    groups.push({ id, list });
  }
  return groups;
}
