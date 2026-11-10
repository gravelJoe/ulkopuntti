// The user's program (exercise library + workouts) and helpers to read it.
//
// Logged in: loaded from the server, cached on the device for offline use.
// Guest / first time: the default program from config/workouts.js.
//
// Program shape:
//   exercises: [{ id, name, place, kind ('machine'|'barbell'), sets, step, archived? }]
//   workouts:  [{ id, name, badge, place, weekday, slots: [{ options: [exerciseId] }], archived? }]
//   gyms:      [{ id, name, lat?, lon?, radius, plateSource ('gym'|'own'), plates, bars }]
//   ownPlates: [{ weight, pairs }]                 (the user's own plate set)
//   trainingMode: 'outdoor' | 'indoor' | 'both'   (both = GPS picks the place)
// "Deleting" archives, so History can still show old names.

import { useSyncExternalStore } from 'react';
import {
  SETS_PER_EXERCISE,
  WEIGHT_STEP,
  exercises as templateExercises,
  workouts as templateWorkouts,
} from '../config/workouts.js';
import { cacheProgram, currentScope, fetchProgram, loadCachedProgram, putProgram } from '../data/repository.js';

export const WEEKDAYS = [
  { value: 1, short: 'Mo', name: 'Monday' },
  { value: 2, short: 'Tu', name: 'Tuesday' },
  { value: 3, short: 'We', name: 'Wednesday' },
  { value: 4, short: 'Th', name: 'Thursday' },
  { value: 5, short: 'Fr', name: 'Friday' },
  { value: 6, short: 'Sa', name: 'Saturday' },
  { value: 0, short: 'Su', name: 'Sunday' },
];
export const weekdayName = (value) => WEEKDAYS.find((d) => d.value === value)?.name ?? null;

export function defaultProgram() {
  return {
    exercises: Object.entries(templateExercises).map(([id, e]) => ({
      id,
      name: e.name,
      place: 'outdoor',
      kind: 'machine',
      sets: e.sets ?? SETS_PER_EXERCISE,
      step: e.step ?? WEIGHT_STEP,
    })),
    workouts: templateWorkouts.map((w) => ({
      id: w.id,
      name: w.name,
      badge: w.badge ?? w.name.slice(0, 2),
      place: w.place ?? 'outdoor',
      weekday: w.weekday ?? null,
      slots: w.slots.map((s) => ({ options: s.choice ?? [s.exercise] })),
    })),
    gyms: [],
    ownPlates: [],
    trainingMode: 'outdoor',
  };
}

/**
 * Fill defaults, and make sure every workout only uses exercises of its own
 * place: an outdoor exercise used by an indoor workout is moved indoors (or
 * copied, if outdoor workouts still use it).
 */
function normalize(next) {
  let exercises = next.exercises.map((e) => ({ place: 'outdoor', kind: 'machine', ...e }));
  const placeOf = new Map(exercises.map((e) => [e.id, e.place]));
  const usedAt = new Map(); // exerciseId → Set of places of active workouts using it
  for (const w of next.workouts) {
    if (w.archived) continue;
    for (const s of w.slots) for (const id of s.options) {
      if (!usedAt.has(id)) usedAt.set(id, new Set());
      usedAt.get(id).add(w.place ?? 'outdoor');
    }
  }
  const remap = new Map(); // `${place}:${id}` → id to use
  for (const [id, places] of usedAt) {
    for (const place of places) {
      if (placeOf.get(id) === place) continue;
      if (places.size === 1 && placeOf.get(id) !== undefined) {
        exercises = exercises.map((e) => (e.id === id ? { ...e, place } : e)); // only used here: move it
        placeOf.set(id, place);
      } else if (placeOf.has(id)) {
        const orig = exercises.find((e) => e.id === id);
        const copy = { ...orig, id: `${id}_${place}`.slice(0, 40), place };
        if (!placeOf.has(copy.id)) exercises = [...exercises, copy];
        placeOf.set(copy.id, place);
        remap.set(`${place}:${id}`, copy.id);
      }
    }
  }
  const workouts = next.workouts.map((w) => ({
    ...w,
    place: w.place ?? 'outdoor',
    slots: w.slots.map((s) => ({ options: s.options.map((id) => remap.get(`${w.place ?? 'outdoor'}:${id}`) ?? id) })),
  }));
  return {
    ...next,
    exercises,
    workouts,
    gyms: (next.gyms ?? []).map((g) => ({ plateSource: 'gym', plates: [], bars: [], radius: 200, lat: null, lon: null, ...g })),
    ownPlates: next.ownPlates ?? [],
    trainingMode: next.trainingMode ?? 'outdoor',
  };
}

// ── State ────────────────────────────────────────────────────

let program;
let exerciseById;
let workoutById;
const listeners = new Set();

function setLocal(next) {
  program = normalize(next);
  exerciseById = new Map(program.exercises.map((e) => [e.id, e]));
  workoutById = new Map(program.workouts.map((w) => [w.id, w]));
  listeners.forEach((fn) => fn());
}
setLocal(defaultProgram());

export const getProgram = () => program;

export function subscribeProgram(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-renders the caller whenever the program changes. */
export function useProgram() {
  return useSyncExternalStore(subscribeProgram, getProgram);
}

// ── Reading ──────────────────────────────────────────────────

export const activeExercises = () => program.exercises.filter((e) => !e.archived);
export const activeExercisesAt = (place) => activeExercises().filter((e) => e.place === place);
export const activeWorkouts = () => program.workouts.filter((w) => !w.archived);

/** Includes deleted (archived) ones, so History and drafts still resolve. */
export const getWorkout = (id) => workoutById.get(id) ?? null;
export const getExercise = (id) => exerciseById.get(id) ?? null;

export const exerciseName = (id) => exerciseById.get(id)?.name ?? id;
export const exerciseStep = (id) => exerciseById.get(id)?.step ?? WEIGHT_STEP;
export const exerciseSets = (id) => exerciseById.get(id)?.sets ?? SETS_PER_EXERCISE;
export const isBarbell = (id) => exerciseById.get(id)?.kind === 'barbell';
export const workoutBadge = (id) => workoutById.get(id)?.badge ?? id;

/** "Multifit / Row" */
export const slotLabel = (slot) => slot.options.map(exerciseName).join(' / ');
/** "Squat · Bench press · Multifit / Row" */
export const slotSummary = (workout) => workout.slots.map(slotLabel).join(' · ');

export const PLACES = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
];
export const workoutPlace = (w) => w?.place ?? 'outdoor';
export const activeWorkoutsAt = (place) => activeWorkouts().filter((w) => workoutPlace(w) === place);
export const indoorGyms = () => program.gyms;
export const getGym = (id) => program.gyms.find((g) => g.id === id) ?? null;
export const ownPlates = () => program.ownPlates;
/** The plates to use at this gym: its own set, or the user's. */
export const platesAt = (gym) => (gym?.plateSource === 'own' ? program.ownPlates : gym?.plates ?? []);
export const hasLocation = (gym) => gym?.lat !== null && gym?.lat !== undefined && gym?.lon !== null && gym?.lon !== undefined;
export const trainingMode = () => program.trainingMode;

/** The active workout at this place scheduled for this date's weekday, or null. */
export const workoutForDay = (date = new Date(), place = 'outdoor') =>
  activeWorkoutsAt(place).find((w) => w.weekday === date.getDay()) ?? null;

export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── Loading & saving ─────────────────────────────────────────

let loading = Promise.resolve();

/** Called when the account changes (and on app start). */
export function refreshProgram() {
  const scope = currentScope();
  setLocal(loadCachedProgram() ?? defaultProgram());
  loading = (async () => {
    try {
      const remote = await fetchProgram();
      if (currentScope() !== scope) return; // logged in/out meanwhile
      if (remote) {
        setLocal(remote);
        cacheProgram(remote);
      }
    } catch {
      /* offline — keep the cached copy */
    }
  })();
  return loading;
}

/** Resolves when the program has loaded from the server — or after `ms` (slow server / offline). */
export function programLoaded(ms = 3000) {
  return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, ms))]);
}

/** Save a whole new program. Shows the change immediately; rolls back on error. */
export async function saveProgram(next) {
  const previous = program;
  const tidy = normalize(next); // send the same tidied-up shape the app shows
  setLocal(tidy);
  try {
    const saved = await putProgram(tidy);
    setLocal(saved);
    cacheProgram(saved);
    return saved;
  } catch (err) {
    setLocal(previous);
    throw err;
  }
}
