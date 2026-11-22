# utils

## Overview

Small helpers used by the frontend: the rest-over alert (vibration and beep), date, time, and weight formatting, geolocation and distance, and barbell plate maths.

## Interface

- `alert.js`
  - `unlockAudio()`: creates or resumes the shared `AudioContext` and plays a silent buffer. Call it from a tap handler.
  - `playRestOverAlert()`: vibrates and plays three sine beeps (880, 880, 1320 Hz).
- `format.js`
  - `formatRelativeDate(iso)`: returns "Today", "Yesterday", or a date like "Tue 3 Nov".
  - `isToday(iso)`: true if the timestamp falls on today's date in local time.
  - `formatWeight(kg)`: "60", "62.5" or "1.25": rounded to two decimals, without trailing zeros.
  - `formatLongDate(iso)`: "Tuesday 3 November", with the year added if it isn't the current year.
  - `formatTime(iso)`: "18:02".
  - `formatDuration(startIso, endIso)`: "46 min" or "1 h 5 min".
  - `formatWeightChange(diff)`: "+2.5 kg", "−5 kg" (Unicode minus), or `null` for any falsy `diff` (0, `null`, `NaN`).
- `geo.js`
  - `getPosition(timeoutMs = 5000)`: resolves to `{ lat, lon, accuracy }`. On failure it rejects with a readable message.
  - `distanceMeters(a, b)`: great-circle (haversine) distance in metres.
- `plates.js`
  - `STANDARD_PLATES`: a typical commercial-gym kg plate set, as `[{ weight, pairs }]`.
  - `DEFAULT_BARS`: `[{ id: 'bar_olympic', name: 'Olympic bar', weight: 20 }]`.
  - `plateColor(weight)`: competition colour for a plate weight.
  - `isValidPlateWeight(w)`: checks that `0 < w <= 50` and that `w` is a multiple of 0.05 kg.
  - `solvePlates(total, bar, plates)`: returns `{ exact, tooLight, perSide, lower, higher }`.

## Invariants

- `playRestOverAlert` only beeps if `unlockAudio` has already created the audio context. Vibration is tried either way. iPhones do not support browser vibration, and the silent switch mutes web audio.
- `format.js` uses the `en-GB` locale. Date comparisons use local midnight.
- `getPosition` asks for high accuracy and accepts a cached position up to 60 s old.
- `solvePlates` works in 50 g units. `pairs` means one plate on each side, and at most 30 pairs of each weight are used. It finds the exact load with the fewest plates per side, listed heaviest first. If an exact load isn't possible, it returns the nearest lighter and heavier totals in `lower` and `higher`. If `total < bar`, it returns `tooLight: true` and `higher: bar`. A per-side load that needs an odd number of 50 g units can never be exact. Plates with `pairs <= 0` or an invalid weight are skipped. `total === bar` is exact with no plates.

## Side Effects

- `alert.js`: keeps one module-level `AudioContext`, plays sound through Web Audio, and calls `navigator.vibrate`.
- `geo.js`: calls `navigator.geolocation.getCurrentPosition`. The position is never sent to the server.
- `format.js`, `plates.js`: none (pure functions).

## Verification

- No automated tests. Run: `npm run build` to check the frontend compiles.
