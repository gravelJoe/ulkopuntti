# program

## Overview

Client-side stores for the user's training program and current training place. `store.js` holds the program (exercise library, workouts, gyms, plates, training mode). It is loaded from the server, cached on the device, and starts from the default in `src/config/workouts.js`. `place.js` works out whether the user is training outdoors or indoors, and at which gym. Both stores work with React through `useSyncExternalStore`.

## Interface

- `store.js`
  - Program shape: `{ exercises: [{ id, name, place, kind, sets, step, archived? }], workouts: [{ id, name, badge, place, weekday, slots: [{ options }], archived? }], gyms: [{ id, name, lat?, lon?, radius, plateSource, plates, bars }], ownPlates: [{ weight, pairs }], trainingMode, holdWeeks, alarmTune, ringWhenSilent }`. Exercises may also have `restSeconds` (`null` or 30–600 s in steps of 15).
  - Constants: `WEEKDAYS`, `PLACES`.
  - State: `getProgram()`, `subscribeProgram(fn)`, `useProgram()`.
  - Readers: `activeExercises()`, `activeExercisesAt(place)`, `activeWorkouts()`, `activeWorkoutsAt(place)`, `getWorkout(id)`, `getExercise(id)`, `exerciseName(id)`, `exerciseStep(id)`, `exerciseSets(id)`, `isBarbell(id)`, `workoutBadge(id)`, `slotLabel(slot)`, `slotSummary(workout)`, `workoutPlace(w)`, `workoutForDay(date, place)`, `weekdayName(value)`, `indoorGyms()`, `getGym(id)`, `ownPlates()`, `platesAt(gym)`, `hasLocation(gym)`, `trainingMode()`, `holdWeeks()`, `alarmTune()`, `ringWhenSilent()`, `exerciseRestSeconds(id)` (the exercise's own rest, or `null`; the caller falls back to `getRestSeconds()`).
  - Helpers: `defaultProgram()`, `newId(prefix)`.
  - Loading and saving: `refreshProgram()`, `programLoaded(ms = 3000)`, `saveProgram(next)`.
- `place.js`
  - State `{ place, source, gym, gymId }`. `place` is `'outdoor' | 'indoor'`. `source` is one of `'last' | 'setting' | 'detected' | 'unavailable' | 'no-gyms' | 'chosen'`.
  - `getPlaceState()`, `subscribePlace(fn)`, `usePlace()`.
  - `markAtGym(gymId, name, source = 'detected')`, `detectPlaceOnLaunch()`, `resetPlace()`.

## Invariants

- Every program passes through `normalize` before it becomes the in-memory program (the device cache keeps the raw server copy and is normalized when read). It fills defaults (`place: 'outdoor'`, `kind: 'machine'`, gym `radius: 200`, `plateSource: 'gym'`, `plates: []`, `bars: []`, `lat`/`lon: null`, `ownPlates: []`, `trainingMode: 'outdoor'`, `holdWeeks`, `alarmTune: 'beep'` unless it is a string, `ringWhenSilent: true` unless it is a boolean). An unknown tune id is kept, so an older app never resets a newer tune; it plays as `beep`. A copy made for the other place keeps every field except `progression`, `restSeconds` included. It also makes sure each active workout only uses exercises from its own place. An exercise used only at another place is moved there. One used at both places gets a copy with id `${id}_${place}` (cut to 40 characters), and the slots are remapped to it.
- "Deleting" an exercise or workout sets `archived`. `getWorkout` and `getExercise` still return archived items, so History and drafts can show old names. The `active*` readers leave them out.
- `exerciseName`, `workoutBadge`, `exerciseStep`, and `exerciseSets` fall back to the id, `WEIGHT_STEP`, or `SETS_PER_EXERCISE` when the id is unknown.
- `refreshProgram` first switches to the cached program for the current scope (or `defaultProgram()`), then fetches. It ignores the server response if the account (`currentScope()`) changed while the request was in flight. If the request fails (offline) or the server returns `null`, the local copy stays.
- `saveProgram` is optimistic. It shows the normalized program immediately and sends it to the server. On success it swaps in and caches the server's response; if `putProgram` throws it rolls back to the previous one and rethrows.
- `detectPlaceOnLaunch` runs detection once per launch and account. Call `resetPlace()` after the account or setting changes to run it again. Detection waits for `programLoaded()` first.
- Place rules: `trainingMode` `'outdoor'` means always outdoors and location is never requested. `'indoor'` means always indoors (`source: 'setting'`). With no gyms, `gymId` is `null`. With one gym, that gym is used. With several, GPS chooses if the gyms have locations; otherwise, or if GPS fails, `gymId` stays `null` and the workout screen asks. `'both'` uses GPS to check whether the user is within `radius` of a gym; if none is in range, the place is outdoors (`source: 'detected'`). Without any located gyms, the place is outdoors. In `'both'`, if GPS fails, the last known place is kept and `source` becomes `'unavailable'`.

## Side Effects

- `store.js`: calls `fetchProgram`, `putProgram`, `loadCachedProgram`, `cacheProgram`, and `currentScope` from `src/data/repository.js`. These handle server requests and the on-device cache. When the module loads, it sets the program to `defaultProgram()`.
- `place.js`: reads and writes `localStorage` key `puntti.place.v1:<scope>` with the last place. Calls `getPosition` from `src/utils/geo.js` (browser geolocation, 5000 ms timeout). The position stays on the device.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
