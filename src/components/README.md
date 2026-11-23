# Components

## Overview

Shared React (JSX) UI components for the workout screens. Most components are
presentational and controlled: they receive values and callbacks as props and do
not own persistent state. The exceptions are `ExercisePicker` (creates new
exercises through the program store) and `ConfirmProvider` (owns the active
confirm dialog). Weight display goes through `formatWeight` from
`../utils/format.js`. Plate maths and colours come from `../utils/plates.js`.

## Interface

| File | Export | Purpose |
| --- | --- | --- |
| `ui.jsx` | `NavBar({ backLabel = 'Back', backTo = '/', onBack })` | iOS-style back bar. Calls `onBack` if given, otherwise `navigate(backTo)` (react-router). |
| `ui.jsx` | `LargeTitle({ title, subtitle })` | Large page heading with optional subtitle. |
| `ui.jsx` | `InsetGroup({ header, footer, padded, children })` | Grouped list section. |
| `ui.jsx` | `ListRow({ onClick, chevron, leading, className, children, ...rest })` | List row. Renders a `<button>` when `onClick` is set, otherwise a `<div>`. Extra props (e.g. `aria-expanded`, `aria-controls`) go to that element. |
| `ui.jsx` | `SegmentedControl({ options, value, onChange, label, disabled })` | `options: [{ value, label }]`. Calls `onChange(value)`. |
| `ConfirmDialog.jsx` | `ConfirmProvider({ children })` | Context provider that renders the active dialog. Mounted in `src/App.jsx`. |
| `ConfirmDialog.jsx` | `useConfirm()` | Returns `confirm({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive })`, which returns a `Promise`. |
| `WeightStepper.jsx` | `default WeightStepper({ value, onChange, label, step = WEIGHT_STEP })` | Minus/plus weight stepper. Tap the value to type an exact number. |
| `ExerciseCard.jsx` | `default ExerciseCard({ slot, slotIndex, currentIndex, dispatch, onToggleSet, cardRef, indoor, gym, gymId = null, progressive })` | One workout slot: "Last time" line, exercise choice, weight stepper, optional barbell helper, set buttons. `gymId` is today's gym, for the " · Gym B" suffix. |
| `RecentHistory.jsx` | `default RecentHistory({ slots, gymId = null })` | Workout-level "History · last 3" bar that opens to the last 3 sessions of each exercise (from `slot.recent`). Renders nothing when no exercise has history. Display rules come from `../workout/recent.js`. |
| `BarbellHelper.jsx` | `default BarbellHelper({ weight, gym, plates, barId, onBar, onWeight })` | Indoor barbell bar picker and per-side plate loading, using `solvePlates`. |
| `ExercisePicker.jsx` | `default ExercisePicker({ current = null, title = 'Add exercise', place = 'outdoor', onDone, onCancel })` | Full-screen exercise picker that can also create a new exercise. Calls `onDone([exerciseId])`. |
| `PlateListEditor.jsx` | `default PlateListEditor({ plates, onChange })` | Controlled editor for `[{ weight, pairs }]` plate sets. |
| `RestTimerOverlay.jsx` | `default RestTimerOverlay({ timer, remainingMs, playing, endedAgoMs, onFastForward, onExtend, onSkip })` | Full-screen rest countdown. `timer.info: { justDone, next: { name, set, weight } \| null }`. When finished: "Stop alarm" while `playing`, otherwise "Back to workout"; "Rest ended m:ss ago" when `endedAgoMs` is over 5 s. |
| `RestStepper.jsx` | `default RestStepper({ label, value, onChange, emptyLabel })` | − / + rest length in seconds (`REST_MIN_SECONDS`..`REST_MAX_SECONDS`, steps of `REST_STEP_SECONDS`). `null` shows `emptyLabel`, muted, and − / + start from `getRestSeconds()`. `label` names it for screen readers. No reset link: each screen has its own. |

`Plate` (`BarbellHelper.jsx`) and `ConfirmDialog` (`ConfirmDialog.jsx`) are
file-private.

`ExerciseCard` dispatches these actions to its `dispatch` prop:
`{ type: 'select', slot, exerciseId }`, `{ type: 'setWeight', slot, weight }`
and `{ type: 'setBar', slot, barId }`.

## Invariants

- `confirm()` resolves `true` (confirm button), `false` (cancel button) or
  `null` (backdrop tap or Escape). Pass `cancelLabel: null` for a one-button
  alert. Without a `ConfirmProvider`, the default context resolves `false`.
  Only one dialog is shown at a time: calling `confirm()` while one is open
  replaces it, and the replaced dialog resolves `null` (dismissed).
  The cancel button (or the only button) gets focus when the dialog opens.
- `WeightStepper` passes every value through `clampWeight` from
  `../workout/session.js` (0 to 999 kg, rounded to 0.01). The decrease button
  is disabled when `value <= 0`. Typed text accepts `,` as a decimal separator.
  Non-numeric input is ignored.
- `ExerciseCard` reads `slot.selected`, `slot.weight[id]`, `slot.sets[id]`,
  `slot.lastWeight[id]`, `slot.options`, optional `slot.bar[id]` and
  optional `slot.recent[id]`. "Last time" uses the newest entry in
  `slot.recent` with a set done, otherwise `slot.lastWeight`. Once
  any set is done, the exercise choice is locked: `SegmentedControl` with
  `disabled` disables every option except the selected one. The
  `BarbellHelper` only renders when `indoor && isBarbell(exerciseId)`.
- `BarbellHelper` uses the bar whose id is `barId`, otherwise the gym's first
  bar. It shows a hint instead of plates when `gym` is null, the gym has no
  bars, or `plates` is empty. When the weight cannot be built exactly, it offers
  `result.lower` / `result.higher` as suggestions.
- `ExercisePicker` lists active exercises for `place`, sorted by name. Creating
  a name that matches an existing one (case-insensitive) picks the existing
  exercise. New exercises get `SETS_PER_EXERCISE` sets. Indoor exercises use the
  chosen kind (`barbell` or `machine`), outdoor ones are always `machine`.
  `barbell` gets `step: 1`, others get `WEIGHT_STEP`.
- `PlateListEditor` keeps `pairs` between 0 and 30. It rejects weights that fail
  `isValidPlateWeight` and duplicate weights. It is deliberately not a `<form>`
  because it is nested inside other forms (for example the gym editor).
- `RestTimerOverlay` renders nothing when `timer` is falsy. Times use
  `formatSeconds` from `../utils/format.js`. The adjust buttons
  use `REST_FAST_FORWARD_SECONDS` and `REST_EXTEND_SECONDS` from
  `../config/workouts.js`.

## Side Effects

- `ExercisePicker` calls `saveProgram` in `../program/store.js` when creating an
  exercise. That updates the program store at once, persists it through
  `putProgram` (`src/data/repository.js`), and rolls back on error (the picker
  shows `err.message`). It also subscribes to the store with `useProgram()`.
- `ConfirmDialog` adds a `keydown` listener on `document` while a dialog is open
  and removes it when the dialog closes.
- `NavBar` navigates with react-router's `useNavigate` when no `onBack` is
  given.
- Other components have no side effects beyond calling their prop callbacks.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
