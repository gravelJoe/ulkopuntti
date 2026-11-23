// The ONLY module the UI uses to read/write workout data.
//
// Finished workouts go through the active adapter:
//   apiAdapter   — logged in, stored on the server
//   guestAdapter — guest, nothing stored
// auth.js switches between them with setAdapter().
//
// The in-progress workout (draft) always stays on this device, so a weak
// signal at the gym never breaks a workout. Drafts are kept per account.

import { DateTime } from 'luxon';
import { guestAdapter } from './adapters/guest.js';

let adapter = guestAdapter;
let scope = 'guest';
const draftKey = () => `puntti.draft.v2:${scope}`;
const historyKey = () => `puntti.history.v1:${scope}`;

// The old per-place last-weights cache is retired (last weights now come from
// the history cache). Remove its leftover keys once when the app loads.
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('puntti.lastWeights.v3:')) localStorage.removeItem(key);
  }
} catch {
  /* storage unavailable */
}

export function setAdapter(next, nextScope) {
  adapter = next;
  scope = nextScope;
}

export const isGuest = () => adapter.isGuest;
export const currentScope = () => scope;

// ── Program (exercise library + workouts) ────────────────────

const programKey = () => `puntti.program.v1:${scope}`;
export const fetchProgram = () => adapter.getProgram();
export const putProgram = (program) => adapter.saveProgram(program);
export const loadCachedProgram = () => readJson(programKey());
export function cacheProgram(program) {
  try {
    localStorage.setItem(programKey(), JSON.stringify(program));
  } catch {
    /* ignore */
  }
}

// ── Finished workouts ────────────────────────────────────────

/** All finished sessions, newest first. */
export const listSessions = () => adapter.listSessions();
export const getSession = (id) => adapter.getSession(id);
export const saveSession = (session) => adapter.saveSession(session);
export const deleteSession = (id) => adapter.deleteSession(id);

// ── In-progress workout (device-local) ───────────────────────

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadDraft() {
  return readJson(draftKey());
}

export async function saveDraft(draft) {
  try {
    localStorage.setItem(draftKey(), JSON.stringify(draft));
  } catch {
    /* storage full / unavailable */
  }
}

export async function clearDraft() {
  localStorage.removeItem(draftKey());
}

// ── Finished-today marker (device-local) ─────────────────────
// Lets the app skip auto-opening today's workout once it's done,
// without waiting for the server.

const localDay = () => DateTime.now().toISODate();
const finishedKey = () => `puntti.finished.v1:${scope}`;

export function markFinishedToday(workoutId) {
  try {
    localStorage.setItem(finishedKey(), JSON.stringify({ workoutId, day: localDay() }));
  } catch {
    /* ignore */
  }
}

export function wasFinishedToday(workoutId) {
  const f = readJson(finishedKey());
  return f?.workoutId === workoutId && f?.day === localDay();
}

/** Carry a guest's unfinished workout over when they log in mid-workout. */
export function moveDraft(fromScope, toScope) {
  const from = `puntti.draft.v2:${fromScope}`;
  const to = `puntti.draft.v2:${toScope}`;
  const draft = localStorage.getItem(from);
  if (draft && !localStorage.getItem(to)) localStorage.setItem(to, draft);
  localStorage.removeItem(from);
}

// ── Derived queries ──────────────────────────────────────────

/**
 * { sessions, offline } — all finished sessions, newest first.
 * Logged in: a trimmed copy is cached on the device, so plans and last weights
 * still work without a connection. Offline it returns that cache; with no
 * cache, sessions is null (so callers can tell "no data" from "no workouts").
 */
export async function getSessionHistory() {
  try {
    const sessions = await adapter.listSessions();
    if (!adapter.isGuest) {
      const trimmed = sessions.map((s) => ({
        finishedAt: s.finishedAt,
        place: s.place ?? 'outdoor',
        gymId: s.gymId ?? null,
        exercises: s.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          weight: e.weight,
          sets: e.sets,
          ...(e.bar ? { bar: e.bar } : {}),
          ...(e.outcome ? { outcome: e.outcome } : {}),
        })),
      }));
      try {
        localStorage.setItem(historyKey(), JSON.stringify(trimmed));
      } catch {
        /* storage full or unavailable: keep the old cache */
      }
    }
    return { sessions, offline: false };
  } catch {
    return { sessions: readJson(historyKey()), offline: true };
  }
}

/**
 * { exerciseId: { weight, bar } } — from the most recent session containing
 * each exercise, outdoors or at this indoor gym (weights are per gym indoors).
 * Exercises with no set ticked are skipped (a zero-set result isn't a weight).
 */
export function lastWeightsFrom(sessions, place = 'outdoor', gymId = null) {
  const result = {};
  for (const s of sessions ?? []) {
    if ((s.place ?? 'outdoor') !== place) continue;
    if (place === 'indoor' && (s.gymId ?? null) !== gymId) continue;
    for (const ex of s.exercises) {
      if (ex.exerciseId in result || !ex.sets?.some(Boolean)) continue;
      result[ex.exerciseId] = { weight: ex.weight, bar: ex.bar ?? null };
    }
  }
  return result;
}

/**
 * The last n sessions of one exercise at a place (any gym), newest first, for
 * the workout's "History · last 3" bar and the card's "Last time" line:
 * [{ finishedAt, gymId, weight, done, total, outcome }]. Includes entries with
 * a set done or a result (a zero-set Go down counts); untouched entries are
 * skipped. sessions may be null.
 */
export function recentSessionsFrom(sessions, exerciseId, place = 'outdoor', n = 3) {
  const doneOf = (e) => e.sets?.filter(Boolean).length ?? 0;
  const result = [];
  for (const s of sessions ?? []) {
    if (result.length >= n) break;
    if ((s.place ?? 'outdoor') !== place) continue;
    // A session can hold the exercise twice (one entry per slot): prefer the
    // one actually lifted, else one with a result.
    const entries = s.exercises?.filter((e) => e.exerciseId === exerciseId) ?? [];
    const ex = entries.find((e) => doneOf(e) > 0) ?? entries.find((e) => e.outcome);
    if (!ex) continue;
    const done = doneOf(ex);
    result.push({
      finishedAt: s.finishedAt,
      gymId: s.gymId ?? null,
      weight: ex.weight,
      done,
      total: ex.sets?.length ?? 0,
      outcome: ex.outcome ?? null,
    });
  }
  return result;
}

/** { workoutId: ISO date } of the last finished session of each workout. */
export async function getLastSessionDates() {
  const sessions = await adapter.listSessions();
  const result = {};
  for (const s of sessions) if (!(s.workoutId in result)) result[s.workoutId] = s.finishedAt;
  return result;
}
