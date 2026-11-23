# config

## Overview

App-wide constants and the starting training program. Each account gets a copy of this program the first time it opens the app. After that, users edit their own program, which is stored on the server. Guests always use this default. Read the live program through `src/program/store.js`, not from here.

## Interface

- `workouts.js`
  - `SETS_PER_EXERCISE` (5): default number of sets for new exercises.
  - `REST_SECONDS` (120): default of the global rest length (`getRestSeconds()`), which each user can change in Settings. It is used when an exercise has no `restSeconds` of its own.
  - `REST_FAST_FORWARD_SECONDS` (30): the "-30 s" button on the rest timer.
  - `REST_EXTEND_SECONDS` (10): the "+10 s" button on the rest timer.
  - `WEIGHT_STEP` (5): kg added or removed per tap. This is the default for new exercises.
  - `DEFAULT_WEIGHT` (20): kg used when an exercise has no history.
  - `RING_WHEN_SILENT_DEFAULT` (`true`): the rest alarm plays in iPhone silent mode (pauses music).
  - `exercises`: starting exercise library, an object keyed by exercise id (`squat`, `latPulldown`, `upperPress`, `bench`, `multifit`, `row`). Each value is `{ name, step? }`.
  - `workouts`: starting workouts, `[{ id, name, badge, weekday, slots }]`. A slot is either `{ exercise }` or `{ choice: [ids] }`.

## Invariants

- The keys of `exercises` are the exercise ids stored in workout history. Renaming a key breaks the link to existing history.
- `weekday` uses JavaScript `Date#getDay` numbering: 0 = Sunday through 6 = Saturday.
- Every id named in a workout slot (`exercise` or `choice`) must be a key in `exercises`.
- `src/program/store.js` (`defaultProgram`) turns this template into the stored shape: slots become `{ options: [...] }`. Exercises always get `place: 'outdoor'` and `kind: 'machine'` (any value here is ignored), `sets` defaults to `SETS_PER_EXERCISE` and `step` to `WEIGHT_STEP`. Workouts may also set `place` (default `'outdoor'`); `badge` defaults to the first two letters of the name and `weekday` to `null`. It adds `gyms: []`, `ownPlates: []`, `trainingMode: 'outdoor'`, `alarmTune: 'beep'` and `ringWhenSilent: RING_WHEN_SILENT_DEFAULT`.

## Side Effects

- None. The module only exports static data.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
