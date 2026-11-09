// The user's program (exercise library + workouts) and helpers to read it.
//
// Logged in: loaded from the server, cached on the device for offline use.
// Guest / first time: the default program from config/workouts.js.
//
// Program shape:
//   exercises: [{ id, name, sets, step, archived? }]
//   workouts:  [{ id, name, badge, weekday, slots: [{ options: [exerciseId] }], archived? }]
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
      sets: e.sets ?? SETS_PER_EXERCISE,
      step: e.step ?? WEIGHT_STEP,
    })),
    workouts: templateWorkouts.map((w) => ({
      id: w.id,
      name: w.name,
      badge: w.badge ?? w.name.slice(0, 2),
      weekday: w.weekday ?? null,
      slots: w.slots.map((s) => ({ options: s.choice ?? [s.exercise] })),
    })),
  };
}

// ── State ────────────────────────────────────────────────────

let program;
let exerciseById;
let workoutById;
const listeners = new Set();

function setLocal(next) {
  program = next;
  exerciseById = new Map(next.exercises.map((e) => [e.id, e]));
  workoutById = new Map(next.workouts.map((w) => [w.id, w]));
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
export const activeWorkouts = () => program.workouts.filter((w) => !w.archived);

/** Includes deleted (archived) ones, so History and drafts still resolve. */
export const getWorkout = (id) => workoutById.get(id) ?? null;
export const getExercise = (id) => exerciseById.get(id) ?? null;

export const exerciseName = (id) => exerciseById.get(id)?.name ?? id;
export const exerciseStep = (id) => exerciseById.get(id)?.step ?? WEIGHT_STEP;
export const exerciseSets = (id) => exerciseById.get(id)?.sets ?? SETS_PER_EXERCISE;
export const workoutBadge = (id) => workoutById.get(id)?.badge ?? id;

/** "Multifit / Row" */
export const slotLabel = (slot) => slot.options.map(exerciseName).join(' / ');
/** "Squat · Bench press · Multifit / Row" */
export const slotSummary = (workout) => workout.slots.map(slotLabel).join(' · ');

/** The active workout scheduled for this date's weekday, or null. */
export const workoutForDay = (date = new Date()) => activeWorkouts().find((w) => w.weekday === date.getDay()) ?? null;

export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── Loading & saving ─────────────────────────────────────────

/** Called when the account changes (and on app start). */
export async function refreshProgram() {
  const scope = currentScope();
  setLocal(loadCachedProgram() ?? defaultProgram());
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
}

/** Save a whole new program. Shows the change immediately; rolls back on error. */
export async function saveProgram(next) {
  const previous = program;
  setLocal(next);
  try {
    const saved = await putProgram(next);
    setLocal(saved);
    cacheProgram(saved);
    return saved;
  } catch (err) {
    setLocal(previous);
    throw err;
  }
}
