# Storage Adapters

## Overview

Backends for finished workouts and the user's program. `repository.js` holds one
adapter at a time and sends every workout and program read or write to it.
`auth.js` picks the adapter: `apiAdapter` when logged in, `guestAdapter` when
not. Both adapters export the same object shape, so the repository does not
need to know which one is active.

## Interface

Both adapters export an object with these members (`api.js:apiAdapter`,
`guest.js:guestAdapter`):

| Member | `apiAdapter` (`api.js`) | `guestAdapter` (`guest.js`) |
| --- | --- | --- |
| `isGuest` | `false` | `true` |
| `listSessions()` | `GET /api/workouts`, returns `.workouts` | `[]` |
| `getSession(id)` | `GET /api/workouts/:id`, returns `.workout`; `null` on 404 | `null` |
| `saveSession(session)` | `POST /api/workouts`, returns `.workout` | returns `session` unchanged |
| `deleteSession(id)` | `DELETE /api/workouts/:id` | no-op |
| `getProgram()` | `GET /api/program`, returns `.program` (`null` if the user still has the default) | `null` (guests use the default program) |
| `saveProgram(program)` | `PUT /api/program`, returns `.program` | throws `Error('Log in to edit workouts')` |

All six methods are `async`; `isGuest` is a plain boolean.

## Invariants

- Both adapters must keep the same method set. A method added to one must be
  added to the other, because `repository.js` calls them without checking which
  adapter is active.
- `apiAdapter` URL-encodes ids with `encodeURIComponent` before building
  `/api/workouts/:id` paths (`api.js:getSession`, `api.js:deleteSession`).
- `apiAdapter.getSession` turns a 404 `ApiError` into `null` and rethrows
  every other error (`api.js:getSession`).
- `guestAdapter` never stores anything. `saveSession` echoes its input and
  `saveProgram` always rejects (`guest.js`). Guests therefore use the default
  program: the `beep` alarm, "Ring even when silent" on, and no per-exercise
  rest lengths.
- `apiAdapter` sends every request through `apiFetch` from
  [`../http.js`](../http.js), so it gets the bearer token and the 401
  logout handling from there.

## Side Effects

- `api.js`: network requests to `/api/workouts` and `/api/program` through
  `apiFetch`. These create, read, and delete workouts and overwrite the
  program on the server. Errors are thrown as `ApiError`.
- `guest.js`: none.

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
