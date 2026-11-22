# routes

## Overview
Express routers for the JSON API. `../index.js` mounts them under `/api/auth`, `/api/workouts` and `/api/program`.

## Interface
- `auth.js` (default export `Router`)
  - `POST /login`: body `{ username, password }`. Returns `{ token, user }`, or 401 for bad credentials, or 429 when locked.
  - `POST /password` (`requireAuth`): body `{ currentPassword, newPassword }`. Returns `{ ok: true }`. Returns 400 when the current password is wrong, the new one is not 8–200 characters, or the new one is unchanged; 429 when the username is locked; 401 `Account not found` if the user no longer exists.
  - `GET /me` (`requireAuth`): returns `{ user }`, or 401 `Account not found` if the user no longer exists.
- `workouts.js` (default export `Router`; every route uses `requireAuth`)
  - `GET /`: returns `{ workouts }`, newest `finishedAt` first, at most 1000.
  - `GET /:id`: looks up by `clientId` and returns `{ workout }` or 404.
  - `POST /`: body `{ id, workoutId, place, gymId, startedAt, finishedAt, exercises }`. Returns `400 { error: 'Missing id' }` without a non-empty string `id`. Upserts by `{ userId, clientId: id }` and returns `201 { workout }`, also when it updated an existing workout.
  - `DELETE /:id`: returns 204.
- `program.js` (default export `Router`; every route uses `requireAuth`)
  - `GET /`: returns `{ program }`. `program` is `null` until the user's first save; the client then uses its default program.
  - `PUT /`: validates the body with `clean()`, then upserts the user's `Program` and returns `{ program }`.
- Dependencies: [models](../models/README.md) and [middleware](../middleware/README.md).

## Invariants
- No public sign-up. Accounts are created with `npm run user -- <username>` (`server/scripts/user.js`).
- Login lockout: after `MAX_FAILURES` (10) failures within `WINDOW_MS` (15 minutes, counted from the first failure, not sliding), that username gets 429. A wrong current password on `POST /password` also counts as a failure. The counter lives in an in-memory `Map` for each process. It is cleared by a successful login or a password change.
- Login runs `bcrypt.compare` against `DUMMY_HASH` when the username does not exist, so an unknown user takes as long to reject as a wrong password.
- A wrong current password on `POST /password` returns 400, not 401, so the client does not log the user out.
- Every workout and program query is filtered by `req.userId`. A `userId` sent by the client is never used, and only whitelisted fields are copied.
- `workouts.js` `POST /` sets `runValidators: true`, so the `Workout` schema limits also apply on upsert.
- Limits enforced by `program.js` `clean()`:
  - IDs must match `/^[A-Za-z0-9_-]{1,40}$/` and be unique within their list.
  - At most 300 exercises, 50 workouts and 20 gyms.
  - Exercise `sets` must be 1–10 and `step` must be 0.25–50.
  - Among non-archived workouts, each place can have at most one workout per `weekday` (0–6).
  - A non-archived workout's slots may only use exercises from the same `place`.
  - At most 20 slots per workout; each slot has 1–6 options, and every option must be a known exercise (also in archived workouts). Archived workouts get `weekday: null`.
  - Names: exercise, workout and gym 1–40 characters, badge 1–3, bar name 1–30.
  - Gym `radius` must be 50–2000 m (default 200), `lat`/`lon` within ±90/±180 when given, at most 10 bars per gym, bar weight 0–100 kg.
  - Plate weights must be greater than 0, at most 50 kg and a multiple of 0.05, with 0–30 pairs per size, no duplicate sizes and at most 20 sizes per list.
  - Missing or invalid values fall back to `place: 'outdoor'`, `kind: 'machine'`, `plateSource: 'gym'`, `trainingMode: 'outdoor'`.
  - Unknown fields are dropped.
- Validation failures throw errors with `status = 400` and `expose = true`. The error handler in `../index.js` returns these as JSON.

## Side Effects
- Reads and writes the MongoDB `User`, `Workout` and `Program` collections. This includes upserts, `deleteOne`, and password hash updates through `bcrypt.hash`.
- Keeps in-memory login-failure state in `failures` in `auth.js`.

## Verification
- No automated tests. Run: `npm run build` (from the repo root) and `npm run dev --prefix server` to check the server starts.
