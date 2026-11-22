# server/src Blueprint

## System Overview
The Express 5 and Mongoose API server for Puntti. `index.js` loads its configuration from the environment, mounts the JSON API under `/api`, connects to MongoDB, and starts listening. In production it also serves the built front end from `../../dist`.

## Local Interface & Invariants
- `index.js` (entry point, run by `npm run dev` / `npm start` in `server/`)
  - Environment variables:
    - `MONGODB_URI` and `JWT_SECRET` are required. The process exits with code 1 if either is missing.
    - `PORT` defaults to `4000`.
    - `HOST` defaults to `0.0.0.0` in production and `127.0.0.1` otherwise.
  - Routes:
    - `GET /api/health` returns `{ ok: true }`.
    - Routers are mounted at `/api/auth`, `/api/workouts` and `/api/program`.
    - Any other `/api` path returns `404 { error: 'Not found' }`.
  - Express setup: `express.json` with a body limit of `100kb`, `trust proxy` set to 1, and `x-powered-by` disabled.
  - Error handler:
    - Mongoose `ValidationError` and `CastError` return `400 { error: 'Invalid data' }`.
    - Errors with `err.expose` return `err.status` (400 if unset) and `err.message`.
    - Anything else is logged with `console.error` and returns `500 { error: 'Server error' }`.
  - Production only (`NODE_ENV === 'production'`): serves static files from `dist/`, with immutable caching for `assets/` and `no-cache` for everything else. A fallback route `/{*path}` returns `index.html`.
- `devUser.js`: exports `ensureDevUser()`, `DEV_USERNAME` (`'dev'`) and `DEV_PASSWORD` (`'devpassword'`). `index.js` imports it dynamically only when not in production. `ensureDevUser()` only creates the account if it is missing; it never resets its password. The same credentials are hard-coded in `src/screens/WelcomeScreen.jsx` (dev login button), so change both together.

## Subdirectories & System Boundaries
- middleware: [./middleware/README.md](./middleware/README.md). JWT `signToken` and `requireAuth`, which sets `req.userId`.
- models: [./models/README.md](./models/README.md). Mongoose models `User`, `Program` and `Workout`, and their `toJSON` shapes for the client.
- routes: [./routes/README.md](./routes/README.md). Routers for auth (login, password change, `/me`), workout history (CRUD with idempotent upsert by `clientId`) and the user's program (validated `PUT`).

## Global Invariants
- All user data is scoped by `req.userId` from a verified JWT. A user id sent by the client is never trusted.
- 401 means "not logged in" to the client. Other failures use 400, 404, 429 or 500.
- Express 5 forwards errors from async handlers to the single error handler in `index.js`.
- The `dev` account with a known password must never be created in production. The `!isProduction` guard prevents it.

## Global Side Effects
- Connects to MongoDB (`mongoose.connect(MONGODB_URI)`) and reads and writes the `User`, `Program` and `Workout` collections.
- Listens on `HOST:PORT`. Logs to the console.
- Outside production, may create the `dev` user at startup.

## System Verification
- No automated tests. Run: `npm run build` (from the repo root) and `npm run dev --prefix server` to check the server starts.
