# middleware

## Overview
Express middleware for JWT authentication. Issues session tokens after login and guards protected routes in [routes](../routes/README.md).

## Interface
- `signToken(user)` (`auth.js`): returns a JWT signed with `process.env.JWT_SECRET`. The payload is `{ sub: String(user._id) }` and `expiresIn` is `TOKEN_LIFETIME` (`'30d'`).
- `requireAuth(req, res, next)` (`auth.js`): expects `Authorization: Bearer <token>`. On success it sets `req.userId` to the token's `sub` and calls `next()`.

## Invariants
- A missing header, or one that is not a `Bearer` header, returns `401 { error: 'Not logged in' }`.
- An invalid or expired token returns `401 { error: 'Session expired, please log in again' }`. The client treats any 401 as "logged out", so other routes avoid 401 for non-auth failures.
- `req.userId` comes only from the verified token. Downstream handlers scope every query to it.
- `JWT_SECRET` must be set. `../index.js` exits at startup if it is missing.

## Side Effects
- None. Reads `process.env.JWT_SECRET` and does no I/O.

## Verification
- No automated tests. Run: `npm run build` (from the repo root) and `npm run dev --prefix server` to check the server starts.
