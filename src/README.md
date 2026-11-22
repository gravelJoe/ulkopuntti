# src — Frontend app

## Overview

The React 19 + Vite single-page app. `main.jsx` mounts `<App />` inside
`StrictMode` and a `HashRouter` and loads the global stylesheets. `App.jsx`
holds the route table and the entry gate (welcome screen vs. the app).
Everything else lives in the subfolders below.

## Interface

- `main.jsx`: entry point; renders into `#root`; imports `styles/tokens.css`,
  `styles/base.css`, `styles/components.css`.
- `App.jsx:App` (default export): wraps all routes in `ConfirmProvider`,
  calls `verify()` once on mount, subscribes to the program via
  `useProgram()`, and passes `theme`/`setTheme` from `useTheme()` to
  `SettingsScreen`.
- `App.jsx:ScrollToTop` (file-local): scrolls to the top on every pathname
  change.
- Routes: `/welcome`, `/`, `/workout/:workoutId`, `/history`,
  `/history/:sessionId`, `/account/password`, `/settings`,
  `/settings/workouts[/:editId]`, `/settings/exercises[/:exerciseId]`,
  `/settings/places[/:gymId]`, `/settings/plates`.
- Subfolders:
  - [components](./components/README.md) — shared UI pieces (nav bar, list
    rows, confirm dialog, weight stepper, rest timer, plate helper, pickers).
  - [config](./config/README.md) — constants and the starting program.
  - [data](./data/README.md) — repository, auth, HTTP client, preferences;
    [adapters](./data/adapters/README.md) for logged-in and guest storage.
  - [hooks](./hooks/README.md) — `useAuth`, `useRestTimer`, `useTheme`,
    `useWakeLock`.
  - [program](./program/README.md) — program store and training-place
    detection.
  - [screens](./screens/README.md) — one component per route.
  - [utils](./utils/README.md) — alert, formatting, geolocation, plate maths.
  - [workout](./workout/README.md) — in-progress session reducer and save
    shape.
  - `styles/` — CSS only (design tokens, base, components); no contract.

## Invariants

- [App.jsx] Every route except `/welcome` is mounted only when
  `useAuth().entered` is true (logged in or chose guest); otherwise every path
  redirects to `/welcome`. Unknown paths inside the app redirect to `/`.
- [main.jsx] The app uses `HashRouter`, so routes live after `#` and the
  server needs no route-specific handling.
- The UI reaches workout data only through `data/repository.js`
  (see [data](./data/README.md)).

## Side Effects

- [App.jsx] `verify()` checks the stored login with the server on launch.
- [App.jsx:ScrollToTop] `window.scrollTo(0, 0)` on navigation.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
