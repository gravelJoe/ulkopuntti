// The ONLY module the UI uses to read/write workout data.
//
// Finished workouts go through the active adapter:
//   apiAdapter   — logged in, stored on the server
//   guestAdapter — guest, nothing stored
// auth.js switches between them with setAdapter().
//
// The in-progress workout (draft) always stays on this device, so a weak
// signal at the gym never breaks a workout. Drafts are kept per account.

import { guestAdapter } from './adapters/guest.js';

let adapter = guestAdapter;
let scope = 'guest';
const draftKey = () => `puntti.draft.v2:${scope}`;
const lastWeightsKey = (place, gymId) => `puntti.lastWeights.v3:${scope}:${place}:${gymId ?? '-'}`;

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

const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
 * { exerciseId: { weight, bar } } — from the most recent session containing
 * each exercise, outdoors or at this indoor gym (weights are per gym indoors).
 * Cached on the device, so prefill still works without a connection.
 */
export async function getLastWeights(place = 'outdoor', gymId = null) {
  try {
    const sessions = await adapter.listSessions();
    const result = {};
    for (const s of sessions) {
      if ((s.place ?? 'outdoor') !== place) continue;
      if (place === 'indoor' && (s.gymId ?? null) !== gymId) continue;
      for (const ex of s.exercises) {
        if (!(ex.exerciseId in result)) result[ex.exerciseId] = { weight: ex.weight, bar: ex.bar ?? null };
      }
    }
    try {
      localStorage.setItem(lastWeightsKey(place, gymId), JSON.stringify(result));
    } catch {
      /* ignore */
    }
    return result;
  } catch {
    return readJson(lastWeightsKey(place, gymId)) ?? {};
  }
}

/** { workoutId: ISO date } of the last finished session of each workout. */
export async function getLastSessionDates() {
  const sessions = await adapter.listSessions();
  const result = {};
  for (const s of sessions) if (!(s.workoutId in result)) result[s.workoutId] = s.finishedAt;
  return result;
}
