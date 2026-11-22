# hooks

## Overview

React hooks that connect components to browser APIs and to the client-side auth and preference modules: login state, the rest-timer countdown, the colour theme, and the screen wake lock.

## Interface

- `useAuth.js`
  - `useAuth()`: returns `{ user, entered, login, continueAsGuest, logout, changePassword }`. `user` is `null` for guests. The actions are passed straight through from `src/data/auth.js`.
- `useRestTimer.js`
  - `useRestTimer()`: returns `{ timer, remainingMs, start(seconds, info), fastForward(seconds), extend(seconds), skip() }`. `timer` is `{ endAt, durationMs, info, finished }` or `null`.
- `useTheme.js`
  - `useTheme()`: returns `[preference, setPreference]`, where the preference is `'system' | 'light' | 'dark'`.
- `useWakeLock.js`
  - `useWakeLock(enabled)`: keeps the screen on while `enabled` is true.

## Invariants

- `useRestTimer` counts down to an end timestamp (`endAt`) instead of counting ticks, so it stays correct when the browser throttles or pauses the page. While a timer is running it re-checks every 200 ms and whenever page visibility changes.
- Call `useRestTimer().start` from a tap handler. It calls `unlockAudio()`, and browsers only allow sound after a user gesture.
- When the rest ends, the timer is marked `finished` and the alert plays once. The timer closes itself 4000 ms later (`AUTO_CLOSE_MS`). `skip()` closes it right away without the alert.
- `fastForward` never moves `endAt` before the current time. `extend` increases `durationMs` when needed so the progress bar still matches. Both do nothing once the timer has finished.
- `useTheme` with `'system'` removes `data-theme` from `<html>`. Any other value sets it.
- `useWakeLock` does nothing if `navigator.wakeLock` is missing. The lock needs HTTPS. The browser drops the lock when the page is hidden, so the hook requests it again when the page becomes visible. If the request is denied, the error is ignored.

## Side Effects

- `useAuth`: subscribes to `src/data/auth.js` change notifications.
- `useRestTimer`: runs `setInterval`/`setTimeout`, adds a `visibilitychange` listener on `document`, and calls `playRestOverAlert()` from `src/utils/alert.js` (vibration and Web Audio beep).
- `useTheme`: writes `document.documentElement.dataset.theme`, saves the choice through `setThemePreference` (`src/data/preferences.js`), and updates `<meta name="theme-color">`. When the module loads, it creates a `matchMedia('(prefers-color-scheme: dark)')` query. While a component using the hook is mounted, a `change` listener on that query re-syncs `<meta name="theme-color">`.
- `useWakeLock`: calls `navigator.wakeLock.request('screen')`, adds a `visibilitychange` listener, and on cleanup removes it and releases the lock (also a lock that arrives after unmount).

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
