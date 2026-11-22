# workout

## Overview

Logic for a workout in progress. It builds a session with weights prefilled from history, updates it through a reducer, reports progress, and turns it into the shape that gets saved. Apart from loading the last weights in `createSession`, the functions have no side effects. Every set of an exercise uses the same weight.

## Interface

- `session.js`
  - `slotOptions(slot)`: exercise ids for a slot. Accepts `options`, the template `choice`, or `exercise`.
  - `clampWeight(kg)`: rounds to 0.01 and clamps to the range 0..999.
  - `createSession(workout, gymId = null)` (async): returns the in-progress state `{ workoutId, place, gymId, startedAt, slots: [{ options, selected, weight, sets, lastWeight, bar }] }`. `weight`, `sets`, `lastWeight`, and `bar` are maps keyed by exercise id.
  - `sessionReducer(state, action)`: handles the actions `load` (`session`), `select` (`slot`, `exerciseId`), `setBar` (`slot`, `barId`), `setWeight` (`slot`, `weight`), and `toggleSet` (`slot`, `index`).
  - `progress(state)`: `{ done, total }` sets, counted over the selected exercise of each slot.
  - `nextSet(state)`: `{ slot, index }` of the first set not yet done, or `null`.
  - `toSavedSession(state)`: returns `{ id, workoutId, place, gymId, startedAt, finishedAt, exercises: [{ exerciseId, weight, sets, bar? }] }`.

## Invariants

- `setBar`, `setWeight`, and `toggleSet` only change the slot's currently `selected` exercise. `setWeight` stores the value as given, so callers must use `clampWeight`. `lastWeight` entries are `null` without history.
- Prefilled weight is the last logged weight for that exercise at the same place, and indoors at the same gym (`getLastWeights(place, gymId)`). Without history it is `DEFAULT_WEIGHT`. Outdoors, `gymId` is always `null`.
- The number of sets comes from `exerciseSets(id)`, and all sets start as not done.
- Barbell exercises (`isBarbell`) start with the bar used last time at this gym, matched by name, or else the gym's first bar. Other exercises get bar `null`.
- `toSavedSession` saves only each slot's selected exercise (sets on a non-selected option are dropped) and leaves out exercises with no sets done, so they don't affect future prefill. It saves the bar as `{ name, weight }`, not as an id.
- Saved session ids use `crypto.randomUUID()` when available. Otherwise, for example on plain-HTTP LAN dev, they use a timestamp plus a random string.

## Side Effects

- `createSession`: reads the last weights through `getLastWeights` in `src/data/repository.js`, and reads program data (`exerciseSets`, `getGym`, `isBarbell`) from `src/program/store.js`.
- `toSavedSession`: reads the current time and looks up gym bars through `getGym`. It does not save anything itself.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
