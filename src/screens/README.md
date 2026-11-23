# screens

## Overview

Route-level React screens for the Puntti workout log. Each file default-exports
one screen component that `src/App.jsx` mounts on a `react-router-dom` route.
Screens compose shared UI from `src/components/` and read or write state through
`src/program/store.js` (the training program), `src/data/repository.js`
(sessions, drafts, guest state), `src/data/preferences.js`, `src/program/place.js`
(indoor/outdoor detection) and `src/hooks/useAuth.js`. Screens hold no business
logic of their own beyond form validation and navigation. The session state
machine lives in `src/workout/session.js`.

## Interface

Default exports, with the route each one is mounted on in `src/App.jsx`:

| File | Component | Route | Purpose |
| --- | --- | --- | --- |
| `WelcomeScreen.jsx` | `WelcomeScreen` | `/welcome` | Log in, continue as guest, or (dev builds only) log in as the test user. Redirects to `location.state.returnTo` (default `/`). |
| `HomeScreen.jsx` | `HomeScreen` | `/` | Resume or discard the in-progress draft, start a workout for the current place, link to History and Settings. Auto-opens today's workout. |
| `WorkoutScreen.jsx` | `WorkoutScreen` | `/workout/:workoutId` | Live workout: tick sets, rest timer between sets of the same exercise, gym picker for indoor workouts, finish and save. |
| `HistoryScreen.jsx` | `HistoryScreen` | `/history` | List of saved sessions (`listSessions`). Guests get a log-in prompt. |
| `SessionDetailScreen.jsx` | `SessionDetailScreen` | `/history/:sessionId` | One session with per-exercise weight change versus the previous session; delete. |
| `SettingsScreen.jsx` | `SettingsScreen({ theme, setTheme })` | `/settings` | Program links, training place mode, default rest timer, rest alarm (tune, "Ring even when silent", Test sound), theme, account and logout. |
| `ChangePasswordScreen.jsx` | `ChangePasswordScreen` | `/account/password` | Change the account password via `useAuth().changePassword`. |
| `WorkoutsScreen.jsx` | `WorkoutsScreen` | `/settings/workouts` | Workouts sorted Monday-first by `weekday`. Grouped into Outdoor/Indoor only in "both" mode; otherwise shows the current mode's workouts with a count of hidden ones. |
| `WorkoutEditScreen.jsx` | `WorkoutEditScreen` | `/settings/workouts/:editId` | Create (`editId === 'new'`) or edit a workout: name, badge, weekday, exercise slots (via `ExercisePicker`). The place picker only shows in "both" mode. |
| `ExercisesScreen.jsx` | `ExercisesScreen` | `/settings/exercises` | Exercises for one place, sorted by name. The outdoor/indoor tab (`?place=`) only appears in "both" mode or when both places have exercises; otherwise the place follows `trainingMode()`. |
| `ExerciseEditScreen.jsx` | `ExerciseEditScreen` | `/settings/exercises/:exerciseId` | Create (`'new'`) or edit an exercise: name, sets (1-10), weight step (choices fixed per kind), and its own rest length (or the default). Place can only be chosen for a new exercise in "both" mode; kind (barbell/machine) only for indoor exercises. |
| `PlacesScreen.jsx` | `PlacesScreen` | `/settings/places` | Indoor gyms list and link to own plates. |
| `GymEditScreen.jsx` | `GymEditScreen` | `/settings/places/:gymId` | Create (`'new'`) or edit a gym: name, plate source (`gym`/`own`), plates, bars, optional location and detection radius. |
| `OwnPlatesScreen.jsx` | `OwnPlatesScreen` | `/settings/plates` | Edit the user's own plate set (`program.ownPlates`). |

File-local helpers (not exported): `doneToday` and the module-level
`autoOpenChecked` flag (`HomeScreen.jsx`); `RestTimerSetting`,
`AlarmSetting`, `TrainingPlaceSetting` (`SettingsScreen.jsx`); `autoBadge`
(`WorkoutEditScreen.jsx`); `dayOrder` (`WorkoutsScreen.jsx`).

## Invariants

- All routes except `/welcome` are only mounted once the user has entered the
  app (logged in or chosen guest mode). Otherwise `App.jsx` redirects everything
  to `/welcome`.
- The program editors (`WorkoutsScreen`, `WorkoutEditScreen`, `ExercisesScreen`,
  `ExerciseEditScreen`, `PlacesScreen`, `GymEditScreen`, `OwnPlatesScreen`) need
  a logged-in `user` and redirect guests to `/settings`. `ChangePasswordScreen`
  redirects guests to `/`.
- An unknown or archived id redirects to the list screen (`/settings/workouts`,
  `/settings/exercises`, `/settings/places`). An unknown `workoutId` in
  `WorkoutScreen` redirects to `/`. An unknown `sessionId` redirects to
  `/history`.
- Program edits always write the whole program:
  `saveProgram({ ...getProgram(), <changed field> })`.
- Deleting a workout or exercise archives it (`archived: true`) instead of
  removing it, so past sessions in History still resolve. Deleting an exercise
  also removes it from every workout slot and drops slots left empty. Deleting a
  workout also clears its `weekday`. Gyms are removed outright.
- One workout per weekday per place: saving a workout with a `weekday` clears
  that weekday from any other workout at the same `workoutPlace`
  (`WorkoutEditScreen.handleSave`).
- Changing a workout's place clears its slots, after confirmation. Indoor and
  outdoor exercises are separate lists.
- Exercise names must be unique (case-insensitive) within a place
  (`activeExercisesAt(place)`). Outdoor exercises are always `kind: 'machine'`.
- Passwords need at least `MIN_PASSWORD` (8) characters, and the new password
  must be typed the same twice (`ChangePasswordScreen`).
- Workout badge: 1-3 characters (input `maxLength`), auto-derived from the name
  by `autoBadge` (first two characters) until edited. A workout needs a name, a badge and at least one slot.
- Bar weights must be between 0 and 100 kg. A comma decimal separator is
  accepted (`GymEditScreen.addBar`).
- Rest lengths (the global one in `RestTimerSetting`, an exercise's own in
  `ExerciseEditScreen`) use `RestStepper`: `REST_MIN_SECONDS`..`REST_MAX_SECONDS`
  in steps of `REST_STEP_SECONDS`. An exercise's rest is saved as
  `restSeconds`, `null` for "use the default".
- `WorkoutScreen` starts a rest only when the ticked exercise still has undone
  sets, for `exerciseRestSeconds(id) ?? getRestSeconds()` seconds. Completing an
  exercise or the workout starts none and stops any rest or tune.
- `AlarmSetting` (logged in) reloads the program when it opens and keeps the
  tune rows and the On/Off control disabled until `programLoaded()` resolves
  (3 s at most) and while saving. It ignores taps on the option already
  selected. Guests get "Log in to choose a tune" and Test sound.
- `HomeScreen` auto-opens today's workout (`workoutForDay(new Date(), place)`)
  at most once per app launch, guarded by `autoOpenChecked`. Any user tap
  cancels it. It does not open if a different workout's draft is in progress or
  if `doneToday` is true. `doneToday` waits at most 1.5 s for the server.
- A draft is only offered for resume on Home if at least one set is done
  (`progress(d).done > 0`).
- `WorkoutScreen` loads its session keyed on `workoutId`, not the workout
  object, so a program refresh does not restart a workout in progress. It
  resumes a matching draft. Otherwise it creates a session, and for indoor
  workouts with several gyms and none detected it asks which gym first. The gym
  can only be changed before any set is done.
- Ticking the very last set saves automatically and returns to `/` with
  `savedWorkout`. Finishing by hand (enabled once a set is done) confirms if
  sets are left and goes to `/history/:id` with `justFinished`. A failed save
  offers Try again / Not now and keeps the draft. Leaving with zero sets done
  clears the draft.
- Saving a finished session reuses one `toSavedSession(state)` object for every
  retry, so retries do not create duplicates. Guests are never saved: they are
  offered log-in or discard.
- Starting a different workout while a draft exists asks to discard the draft
  first (`HomeScreen`).
- The dev-login button in `WelcomeScreen` only renders when
  `import.meta.env.DEV` is true.

## Side Effects

- Server writes through `saveProgram` (`src/program/store.js`) from
  `WorkoutEditScreen`, `ExerciseEditScreen`, `GymEditScreen`,
  `OwnPlatesScreen` and `SettingsScreen` (`TrainingPlaceSetting` saves
  `trainingMode` and may move workouts to the new place).
- Session data through `src/data/repository.js`: `listSessions`
  (`HistoryScreen`, `SessionDetailScreen`), `deleteSession`
  (`SessionDetailScreen`), `saveSession` (`WorkoutScreen`), `getLastSessionDates`
  (`HomeScreen`).
- Draft and "finished today" state through `loadDraft`, `saveDraft` (on every
  session change in `WorkoutScreen`), `clearDraft` and `markFinishedToday` /
  `wasFinishedToday`.
- Auth through `useAuth()`: `login`, `continueAsGuest` (`WelcomeScreen`),
  `logout` (`SettingsScreen`), `changePassword` (`ChangePasswordScreen`).
- Geolocation: `GymEditScreen` calls `getPosition(15000)` (`src/utils/geo.js`)
  and, only if a location was taken during that edit, `markAtGym` after saving.
  `HomeScreen` and `WorkoutScreen` call `detectPlaceOnLaunch`. `SettingsScreen`
  calls `resetPlace()` and then `detectPlaceOnLaunch()` only after the training
  mode changes, and `WorkoutScreen.chooseGym` calls
  `markAtGym(id, name, 'chosen')`.
- `SettingsScreen` shows guests a Log in prompt instead of the Program and
  training-place sections. Switching to a single place that has no workouts
  offers to move all workouts there.
- Rest timer preference: `setRestSeconds` (`SettingsScreen`) and
  `getRestSeconds` (`WorkoutScreen`, `ExerciseEditScreen`, `RestStepper`) in
  `src/data/preferences.js`. The alarm settings are saved in the program
  (`saveProgram`, `SettingsScreen`); Test sound uses `playTune`/`stopTune`.
- `WorkoutScreen` keeps the screen awake with `useWakeLock(true)` and runs the
  rest timer through `useRestTimer`.
- Theme changes go through the `setTheme` prop passed from `App.jsx`.
- Navigation state handed between screens: `returnTo` (to `WelcomeScreen`),
  `savedWorkout` (to `HomeScreen`, cleared after showing, with a 5 s banner
  timeout), `justFinished` (to `SessionDetailScreen`), and `place` (to the
  workout and exercise editors).

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
