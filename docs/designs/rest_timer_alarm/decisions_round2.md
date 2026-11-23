# Goldfish Annotated Review Report (round 2)

> **Note:** the stage reports this record cites (zoom out, comprehension,
> critic, implementation readiness, and the design drafts) were working files
> and have been deleted. Every finding they raised is listed here with its
> outcome.

**Status: resolved** (2026-11-23). Z2-1 to Z2-3: the author said "accept, keep
everything simple". Z2-4 to Z2-12 and the `playTune` wait fix: the author
said "accept the nits too".

**Target:** `docs/designs/rest_timer_alarm.md` (full file)

**Source:** `zoom_out_report.md` (round 2, Stage 5). Review stages 6–9 of
round 2 have not run.

## Author decisions (made in chat, 2026-11-23)

| # | Finding | Decision |
|---|---|---|
| D3 (revised) | Z2-1 | **One hook.** `useRestTimer` plays the tune and closes "Go!". `useRestAlarm` is dropped. |
| D6 | Z2-2 | **Simplest option:** reword the Risks row only. No new protection code. |
| D7 | Z2-3 | **Simplest option:** record as Alternative N, not chosen. It's the first thing to try if check B.1 fails. |
| D8 | Z2-4 to Z2-12 | **All accepted** as the reviewer recommended, taking the simpler option where two were given: inline the rest check (Z2-7) and use an On/Off `SegmentedControl` (Z2-9). |
| D9 | `playTune` wait (found by the author's assistant) | **Fix it.** A stop during the 1 s resume wait no longer lets the tune start later. |

## Prioritized Findings & AI Suggestions

### [Issue 1] [`egm-zoom-out`] - Severity: Major — Z2-1
*   **Affected Scope:** Technical Plan diagram and §3; Detailed
    Implementation Plan step 4, #8, #9, #10, #16; check A.17.
*   **Discrepancy Description:** The second hook adds coordination the
    code doesn't need: a timer id, `playedIdRef`, `closeRef` and check A.17.2.
*   **AI Suggestion:** PROPOSE FIX — **accepted.**
*   **Justification:** Today the close lives in an effect
    (`src/hooks/useRestTimer.js:35-39`), so React's cleanup already cancels
    it when the timer is cleared or replaced. That rules out the K1 case.
    The id machinery is only needed because the design split the close
    into a second hook.
*   **Applied edit:**
    *   `useRestTimer` gains an alarm effect keyed on `finished` and
        `endAt`. Its cleanup calls `stopTune()`.
    *   The close effect is keyed on a new `tuneEnded` flag.
    *   `onEnded` marks only the timer with a matching `endAt`.
    *   The hook returns `playing`.
    *   #10 is marked as removed, and its number is kept.
    *   Check A.17.3 is added for a late `onEnded`.

### [Issue 2] [`egm-zoom-out`, `egm-inventive-catalyst`] - Severity: Major — Z2-2
*   **Affected Scope:** Risks & Mitigations, the row "A stale copy
    overwrites newer settings".
*   **Discrepancy Description:** `programLoaded()` gives up after 3 s, and
    only one settings group is protected. The row overstated the coverage.
*   **AI Suggestion:** PROPOSE FIX (minimum option) — **accepted.**
*   **Applied edit:** the row now says the protection is best effort,
    gives up after 3 s, covers only Settings' alarm group, and lists the
    unprotected saves. It records a server version check as separate work.

### [Issue 3] [`egm-inventive-catalyst`] - Severity: Major — Z2-3
*   **Affected Scope:** Alternatives Considered.
*   **Discrepancy Description:** The tune could be scheduled during the tap
    that starts the rest, which shrinks the main iPhone risk.
*   **AI Suggestion:** PROPOSE FIX (record as an alternative) —
    **accepted.**
*   **Applied edit:** a new entry, Alternative N, lists the pros and cons.
    It is not chosen; it is the fallback to try before Alternative A if B.1
    fails.

### Nits Z2-4 to Z2-12 — PROPOSE FIX, accepted

| # | Applied edit |
|---|---|
| Z2-4 | `onEnded({ audible })`. The 4 s close starts only after an audible tune. When sound is blocked, "Go!" stays until a tap. Updated: CUJ 5, §2, §3, #2, #9, the Risks row, B.5. |
| Z2-5 | `normalize()` keeps any string for `alarmTune`. `playTune` maps an unknown id to `beep`. The picker marks `tuneIdOrDefault(alarmTune())` without saving it. Updated: §4 table, #2, #5, #12. |
| Z2-6 | One vibration pattern per tune: `[600, 300]` × 33 (66 entries, about 29.7 s). The interval and `vibrateId` are gone. Updated: diagram, #2, the Risks row. |
| Z2-7 | The rest check is inline in `handleToggleSet` (`sets.indexOf(false)`). #7 is removed (number kept), `session.js` is unchanged, and #17 has no change. |
| Z2-8 | The overlay uses `formatSeconds(Math.ceil(ms / 1000))`, and its private `formatClock` is removed (#11, #19). |
| Z2-9 | "Ring even when silent" is an On/Off `SegmentedControl`. The `.switch` style is removed (#12, #26, §4). |
| Z2-10 | Background: the new fields fall back to defaults instead of a 400. |
| Z2-11 | Removed from the Technical Plan: the try/catch details, "the end timer is always set", "200 ms" and "10 s chunks". They stay in #2 and #9. |
| Z2-12 | Alternative F records the split it considered (the tune on the server, the silent setting per phone). |

### Extra fixes made while applying

*   **`playTune` wait (D9):**
    *   The module tracks a `playGen` counter and a module-level
        `sessionSwitched` flag.
    *   After the resume wait, `playTune` returns silently if `playGen`
        changed.
    *   `stopTune` always increments `playGen`, and restores the session
        even if nothing is playing yet.
    *   Check A.10.4 is added.
*   **Stale facts:**
    *   The "uncommitted changes" paragraph now points to commit
        `f8ac808`.
    *   #29 (`ListRow` `disabled`) is removed, because `ListRow` already
        passes extra props through.
    *   Step 4 of the build order no longer lists #7, #10 or #29.
*   **Failure rule:** if B.1 fails, try Alternative N first, then A.

## Round 3 author decision (made in chat, 2026-11-23, at the Stage 6 gate)

| # | Finding | Decision |
|---|---|---|
| D10 | C3-1 (comprehension, round 3) | **The alarm plays in the background.** A rest that ends while Puntti is in a background tab still finishes and plays its tune where the browser runs the page (desktop, Android). Hiding the page no longer stops a tune. A locked iPhone pauses the page, so there the late alarm applies (D4). Applied to Goals, Non-Goals, §3, the diagram, #9, the Risks row and checks A.11, A.12 and C.4. |
