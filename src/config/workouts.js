// ─────────────────────────────────────────────────────────────
// Workout configuration — edit this file to change the program.
// ─────────────────────────────────────────────────────────────

export const SETS_PER_EXERCISE = 5;
export const REST_SECONDS = 120;
export const REST_FAST_FORWARD_SECONDS = 30; // the "−30 s" button on the rest timer
export const WEIGHT_STEP = 5; // kg, per tap on − / + (an exercise can override with `step`)
export const DEFAULT_WEIGHT = 20; // kg, used when an exercise has no history

// Every exercise that can appear in a workout.
// The key is the permanent id stored in history — don't rename keys
// once you have data, only the display `name`.
// Optional `step` overrides WEIGHT_STEP for that exercise.
export const exercises = {
  squat: { name: 'Squat' },
  latPulldown: { name: 'Lat pulldown', step: 2.5 },
  upperPress: { name: 'Upper press' },
  bench: { name: 'Bench press' },
  multifit: { name: 'Multifit' },
  row: { name: 'Row' },
};

// `id` is stored in history — keep it stable. `name` and `badge` (the short
// label in the coloured square) can be changed freely.
// `weekday` (0 = Sunday, 1 = Monday … 6 = Saturday): on that day the app
// opens straight into this workout.
// Each slot is either a fixed exercise ({ exercise }) or a choice the
// user makes on the day ({ choice: [...] }; the first one is the default).
export const workouts = [
  {
    id: 'A',
    name: 'Monday',
    badge: 'Mo',
    weekday: 1,
    slots: [{ exercise: 'squat' }, { exercise: 'latPulldown' }, { exercise: 'upperPress' }],
  },
  {
    id: 'B',
    name: 'Thursday',
    badge: 'Th',
    weekday: 4,
    slots: [{ exercise: 'squat' }, { exercise: 'bench' }, { choice: ['multifit', 'row'] }],
  },
];

// ── Helpers ──────────────────────────────────────────────────

export function getWorkout(id) {
  return workouts.find((w) => w.id === id) ?? null;
}

/** The workout scheduled for this date's weekday, or null. */
export function workoutForDay(date = new Date()) {
  return workouts.find((w) => w.weekday === date.getDay()) ?? null;
}

/** kg per tap on − / + for this exercise. */
export function exerciseStep(id) {
  return exercises[id]?.step ?? WEIGHT_STEP;
}

/** Short label for the coloured square, e.g. "Mo". */
export function workoutBadge(id) {
  return getWorkout(id)?.badge ?? id;
}

export function exerciseName(id) {
  return exercises[id]?.name ?? id;
}

/** "Squat · Bench press · Multifit / Row" */
export function slotSummary(workout) {
  return workout.slots
    .map((slot) =>
      slot.choice ? slot.choice.map(exerciseName).join(' / ') : exerciseName(slot.exercise),
    )
    .join(' · ');
}
