// ─────────────────────────────────────────────────────────────
// App constants and the STARTING program.
//
// Each account gets a copy of `exercises` + `workouts` below the first time
// it opens the app; after that, users edit their own program in
// Settings → Workouts / Exercises (stored on the server). Guests always use
// this default. Read the live program through src/program/store.js.
// ─────────────────────────────────────────────────────────────

export const SETS_PER_EXERCISE = 5; // default for new exercises
export const REST_SECONDS = 120; // default; each user can change it in Settings
export const REST_FAST_FORWARD_SECONDS = 30; // the "−30 s" button on the rest timer
export const REST_EXTEND_SECONDS = 10; // the "+10 s" button on the rest timer
export const WEIGHT_STEP = 5; // kg per tap on − / +, default for new exercises
export const DEFAULT_WEIGHT = 20; // kg, used when an exercise has no history
export const INCREASE_DEFAULT = 1; // kg per week, indoor progression (per exercise, editable)
export const HOLD_WEEKS_DEFAULT = 1; // weeks a lowered weight is held after a Go down
export const RING_WHEN_SILENT_DEFAULT = true; // play the rest alarm in iPhone silent mode (pauses music)

// Starting exercise library. Keys are the ids stored in history.
export const exercises = {
  squat: { name: 'Squat' },
  latPulldown: { name: 'Lat pulldown', step: 2.5 },
  upperPress: { name: 'Upper press' },
  bench: { name: 'Bench press' },
  multifit: { name: 'Multifit' },
  row: { name: 'Row' },
};

// Starting workouts. `weekday`: 0 = Sunday, 1 = Monday … 6 = Saturday.
// A slot is a fixed exercise ({ exercise }) or a choice made on the day ({ choice }).
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
