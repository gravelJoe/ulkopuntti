# Data Layer

## Overview

Data access for the frontend: login state, the API client, workout and program
storage, and device-local preferences. `repository.js` is the only module the
UI should use to read or write workout data. It sends finished workouts and the
program to the active storage adapter (server or guest). The in-progress
workout (draft), the program cache, the last-used weights, and the
finished-today marker stay in `localStorage`, scoped per account. `auth.js`
keeps track of who is logged in and switches the adapter when that changes.

## Interface

### `repository.js`: workout and program data

- `setAdapter(next, nextScope)`: set the active adapter and the storage scope
  (`'guest'` or `user:<id>`). Only `auth.js` calls this.
- `isGuest()`, `currentScope()`
- Program: `fetchProgram()`, `putProgram(program)` (through the adapter);
  `loadCachedProgram()`, `cacheProgram(program)` (in `localStorage`)
- Finished workouts (through the adapter): `listSessions()` (newest first),
  `getSession(id)`, `saveSession(session)`, `deleteSession(id)`
- Draft (in `localStorage`): `loadDraft()`, `saveDraft(draft)`, `clearDraft()`,
  `moveDraft(fromScope, toScope)`
- Finished-today marker: `markFinishedToday(workoutId)`,
  `wasFinishedToday(workoutId)`
- Derived queries: `getLastWeights(place = 'outdoor', gymId = null)` returns
  `{ exerciseId: { weight, bar } }`; `getLastSessionDates()` returns
  `{ workoutId: finishedAt }`

### `auth.js`: login state

- `getUser()` returns `{ id, username }` or `null`. `hasEntered()` is true when
  logged in or after the user chose to continue as a guest.
- `login(username, password)`, `logout()`, `continueAsGuest()`,
  `changePassword(currentPassword, newPassword)`, `verify()`
- `subscribe(fn)` registers a listener for auth changes and returns a function
  that unsubscribes it.

### `http.js`: API client

- `apiFetch(path, { method = 'GET', body, auth = true })` sends a JSON request
  and returns the parsed body, or `null` for a 204 response.
- `ApiError` (`message`, `status`). `status` is `0` when there is no
  connection.
- `configureHttp({ tokenProvider, unauthorizedHandler })` sets where the token
  comes from and what runs on a 401. `auth.js` calls it.

### `preferences.js`: device-local UI settings

- `getThemePreference()` returns `'system'`, `'light'`, or `'dark'`.
  `setThemePreference(value)` sets it.
- `getRestSeconds()`, `setRestSeconds(seconds)`
- `REST_MIN_SECONDS` (30), `REST_MAX_SECONDS` (600), `REST_STEP_SECONDS` (15)

### Subdirectories

- [adapters](./adapters/README.md): `apiAdapter` (server) and `guestAdapter`
  (stores nothing). Both have the same interface.

## Invariants

- The UI reads and writes workout data only through `repository.js`
  (`repository.js` header comment).
- Logged in means `apiAdapter` with scope `user:<id>`. Logged out means
  `guestAdapter` with scope `guest` (`auth.js:apply`). Before `auth.js` loads,
  the repository starts with `guestAdapter` and scope `'guest'`.
- Every scoped `localStorage` key ends with the current scope:
  `puntti.draft.v2:<scope>`, `puntti.program.v1:<scope>`,
  `puntti.finished.v1:<scope>`, and
  `puntti.lastWeights.v3:<scope>:<place>:<gymId|->`. Changing a key's format
  needs a version bump.
- The draft never goes through an adapter. It stays on the device so a weak
  connection cannot break a workout in progress.
- `login` calls `moveDraft('guest', 'user:<id>')` before it switches scope.
  `moveDraft` never overwrites a draft that already exists in the target scope,
  and it always deletes the source draft.
- `getLastWeights` and `getLastSessionDates` keep the first match for each id,
  so they depend on `listSessions()` returning sessions newest first. Sessions
  with no `place` count as `'outdoor'`. Indoor weights are tracked per `gymId`.
- `http.js` must not import `auth.js`, to avoid a circular import. `auth.js`
  passes in the token and the 401 handler through `configureHttp`.
- A 401 on a request that sent a token calls `logout()`
  (`http.js:apiFetch`, `auth.js` `configureHttp` call). `verify()` stays logged
  in when it cannot reach the server.
- `login`, `logout` and `continueAsGuest` run `apply()`. `apply()` switches the
  adapter, calls `refreshProgram()` and `resetPlace()` from `../program/`, and
  then notifies subscribers. `verify()` updates and saves the user from the
  server without running `apply()`; it notifies subscribers only when the
  username changed (for example after a rename).
- `login()` and `logout()` clear `puntti.guest.v1`; `continueAsGuest()` sets it.
  After `logout()`, `hasEntered()` is false (back to the welcome screen).
- `getRestSeconds` returns the configured `REST_SECONDS` from
  `../config/workouts.js` when the stored value is missing or outside
  30 to 600. Setting the theme to `'system'` or the rest time back to the
  default deletes the stored key.

## Side Effects

- `localStorage` keys:
  - `puntti.auth.v1` (`{ token, user }`) and `puntti.guest.v1` (`auth.js`)
  - The scoped keys listed under Invariants (`repository.js`)
  - `puntti.theme` and `puntti.restSeconds` (`preferences.js`)
- Most writes are wrapped in try/catch and fail silently. `clearDraft` and
  `moveDraft` are not wrapped: `clearDraft` (async) rejects and `moveDraft`
  throws if storage is unavailable. `loadDraft`, `saveDraft` and `clearDraft`
  return promises.
- `getLastWeights` caches each result and returns that cache (or `{}`) when
  `listSessions()` fails offline. `getLastSessionDates` has no fallback.
- Network: `apiFetch` calls `fetch` with a `Bearer` token. Endpoints used here:
  `POST /api/auth/login`, `POST /api/auth/password`, `GET /api/auth/me`, plus
  the workout and program endpoints in [adapters](./adapters/README.md).
- Importing `auth.js` has side effects. It calls `configureHttp`, deletes the
  old `puntti.sessions.v1` and `puntti.draft.v1` keys, and runs `apply()`. That
  sets the adapter and triggers `refreshProgram()` and `resetPlace()`.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
