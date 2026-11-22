# models

## Overview
Mongoose schemas and models for the MongoDB collections. Each model's `toJSON` transform defines the exact shape the client receives.

## Interface
- `User`, `USERNAME_PATTERN` (`User.js`)
  - Fields: `username` (required, unique, lowercase, trimmed, must match `/^[a-z0-9_.-]{3,20}$/`) and `passwordHash` (required). Has timestamps.
  - `toJSON` returns `{ id, username }`, so `passwordHash` is never serialized.
- `Program` (`Program.js`): one document per user.
  - Fields: `userId` (ref `User`, required, unique), plus `exercises`, `workouts`, `gyms` and `ownPlates` stored as `[Mixed]` with default `[]`.
  - `trainingMode`: one of `'outdoor' | 'indoor' | 'both'`, default `'outdoor'`.
  - Schema options: `timestamps: true`, `minimize: false`.
  - `toJSON` returns `{ exercises, workouts, gyms, ownPlates, trainingMode }`. Only `gyms`, `ownPlates` and `trainingMode` get fallbacks; `exercises` and `workouts` are passed through as stored.
- `Workout` (`Workout.js`): a completed workout session.
  - Fields: `userId`, `clientId` (max 64) and `workoutId` (max 40), all required; `place` (`'outdoor' | 'indoor'`, default `'outdoor'`), `gymId` (max 40, default `null`), `startedAt` and `finishedAt` (both required), and `exercises`. Has timestamps.
  - Each entry in `exercises` has `exerciseId` (required, max 40), `weight` (required, 0–999), `sets` (required, an array of 1–20 `Boolean`) and an optional `bar { name (max 30), weight (0–100) }`.
  - `toJSON` returns `{ id: clientId, workoutId, place, gymId, startedAt, finishedAt, exercises }`, with the dates as ISO strings.

## Invariants
- Usernames are stored lowercase, so login is case-insensitive.
- `Program.userId` is unique: each user has at most one program.
- `Program` stores its array contents as `Mixed`, so Mongoose does not check their shape. All shape validation happens in `clean()` in [routes/program.js](../routes/README.md) and must stay there.
- `Workout` has a unique index on `{ userId, clientId }`, so there is at most one document per client id. The update-on-repeat behaviour that makes retries safe comes from the upsert in [routes/workouts.js](../routes/README.md).
- `Workout` has an index on `{ userId, finishedAt: -1 }` for history listing.
- A workout may hold at most 20 exercises.

## Side Effects
- Importing a model file registers that model with the global `mongoose` instance (`User`, `Program`, `Workout` collections).
- Mongoose creates the indexes above when it connects.

## Verification
- No automated tests. Run: `npm run build` (from the repo root) and `npm run dev --prefix server` to check the server starts.
