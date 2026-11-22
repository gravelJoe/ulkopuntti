# Puntti

Mobile-first workout log for outdoor and indoor gyms. React + Vite frontend, Express + MongoDB backend, username/password login (JWT). Guests can use the app without saving.

## Run locally

Requires Node 22+ and MongoDB (`brew install mongodb/brew/mongodb-community && brew services start mongodb/brew/mongodb-community`).

```sh
npm install && npm install --prefix server
cp server/.env.example server/.env      # then set a long random JWT_SECRET

npm run server     # API on 127.0.0.1:4000
npm run dev        # app on https://<your-mac-ip>:5173 (open on your phone, same Wi-Fi)
```

`npm run dev:http` serves without HTTPS (no screen wake lock).

## Accounts

There is no sign-up in the app. Create accounts from the command line:

```sh
npm run user -- <username>            # create, or set a new password
npm run user -- --list
npm run user -- --delete <username>
npm run user -- --rename <old> <new>  # keeps password, workouts, program
```

Against the production database: `MONGODB_URI="mongodb+srv://…" npm run user -- <username>`.

## Deploy (Render + MongoDB Atlas)

1. MongoDB Atlas: create a free cluster, a database user, allow network access from anywhere (`0.0.0.0/0`), and copy the connection string (add `/puntti` before the `?`).
2. Render: **New → Blueprint**, pick this repo. `render.yaml` sets everything up; paste the Atlas string as `MONGODB_URI`.
3. Create the accounts against the Atlas database (see above).

In production the Express server also serves the built app from `dist/`.

## Where things are

| | |
|---|---|
| `src/config/workouts.js` | Workouts, sets, rest time, weight step |
| `src/data/repository.js` | The only data access the UI uses |
| `src/data/adapters/` | `api` (logged in) and `guest` (saves nothing) |
| `src/data/auth.js` | Login state |
| `server/src/` | Express app, models, routes |
| `server/scripts/user.js` | Account management |

---

# Puntti Blueprint

## System Overview

Two deployable parts in one repo:

- **Frontend** ([src](./src/README.md)): React 19 SPA built by Vite. Screens use
  the program store and `data/repository.js`; the repository delegates to an
  adapter (`apiAdapter` when logged in, `guestAdapter` for guests) and keeps
  drafts, caches and last weights in `localStorage`, scoped per account.
- **Backend** ([server](./server/README.md)): Express 5 + Mongoose on MongoDB.
  JWT (30-day Bearer) auth, per-user workouts and one program document per
  user. In production it also serves `dist/`.

```
phone ──► Vite dev server (:5173, HTTPS) ──/api proxy──► Express (:4000) ──► MongoDB
          production: Express serves dist/ and /api on Render ──► MongoDB Atlas
```

## Local Interface & Invariants

- `vite.config.js`: React plugin; self-signed HTTPS via `basicSsl()` unless
  `HTTP` is set (`npm run dev:http`); `server.host: true`, port 5173; proxies
  `/api` to `http://127.0.0.1:4000`.
- `package.json` scripts: `dev`, `dev:http`, `server`, `build`, `preview`,
  `user`; Node >= 22.
- `render.yaml`: Render blueprint; health check `/api/health`; env
  `MONGODB_URI` (set by hand) and `JWT_SECRET` (generated).

## Subdirectories & System Boundaries

- src: [./src/README.md](./src/README.md) — frontend app, routes and entry
  gate; children components, config, data (+ adapters), hooks, program,
  screens, utils, workout.
- server: [./server/README.md](./server/README.md) — API server
  ([src](./server/src/README.md)) and the account script
  ([scripts](./server/scripts/README.md)).
- `public/` — static icons, manifest and welcome photo; no code.

## Global Invariants

- No sign-up in the app: accounts exist only via `npm run user`
  (`server/scripts/user.js`); usernames match `/^[a-z0-9_.-]{3,20}$/`.
- Every server query is scoped to the token's user (`req.userId`).
- The UI reads and writes workout data only through `src/data/repository.js`;
  guests never save to the server.
- `PUT /api/program` validates the whole program (`routes/program.js` `clean()`);
  the client normalizes it first (`program/store.js` `normalize()`), so an
  indoor workout uses only indoor exercises and each place has at most one
  workout per weekday.
- Retried workout saves are idempotent (unique `{userId, clientId}`).
- The device's location is never sent to the server; only gym coordinates the
  user saves are stored.

## Global Side Effects

- MongoDB collections: users, workouts, programs.
- Browser `localStorage` (`puntti.*` keys), geolocation, wake lock, Web Audio
  and vibration on the phone.
- Outside production the server creates a `dev` test account.

## System Verification

- No automated tests. Run: `npm run build` (frontend compiles) and
  `npm run server` (API starts against local MongoDB).
