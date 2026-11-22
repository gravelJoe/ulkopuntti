# server

## Overview

The Express 5 + Mongoose backend (its own `package.json`). It serves the JSON
API under `/api` and, in production, the built frontend from `../dist`.
There is no sign-up route: real accounts are created with a command-line
script. Outside production the server also creates a `dev` test account at
startup.

Scripts (`server/package.json`): `dev` (watch mode, needs `.env`), `start`
(`.env` optional), `user` (account script).

## Subdirectories & Boundaries

- src: [./src/README.md](./src/README.md) — API server entry (`index.js`),
  dev user seeding, and its children
  [middleware](./src/middleware/README.md) (JWT `signToken` / `requireAuth`),
  [models](./src/models/README.md) (`User`, `Program`, `Workout`) and
  [routes](./src/routes/README.md) (`/api/auth`, `/api/workouts`,
  `/api/program`).
- scripts: [./scripts/README.md](./scripts/README.md) — `npm run user`:
  create, set password, `--list`, `--delete`, `--rename` accounts directly in
  MongoDB.
