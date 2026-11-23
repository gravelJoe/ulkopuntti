# Goldfish Annotated Review Report (round 3, Stages 5–7)

> **Note:** the stage reports this record cites (zoom out, comprehension,
> critic, implementation readiness, and the design drafts) were working files
> and have been deleted. Every finding they raised is listed here with its
> outcome.

**Status: resolved** (2026-11-23, author: "auto accept, use the default
wording for E-1"). All 31 PROPOSE FIX items and E-1 were applied to
`docs/designs/rest_timer_alarm.md`. The DECLINE items are recorded only.
The design is now 1287 lines; the Detailed Implementation Plan starts at
line 691.

**Corrections made while applying:**

*   The oscillator count in Non-Functional Requirements: at most 91 (the
    Nokia tune, 13 notes × 7), not "about 130".
*   F-12's polka `lengthS` is confirmed at about 23.5 s (the last sounding
    note ends at 23.38 s). Beep's is 1.03 s.

**Target:** `docs/designs/rest_timer_alarm.md` (FeatureRange lines 1–660,
plus the matching Detailed Implementation Plan items where a fix reaches
them)

**Sources:** `zoom_out_report.md` (Z3-x), `comprehension_report.md` (C3-x)
and `critic_report.md` (K3-x). Duplicates are merged under one entry.

**Direction:** keep it simple. Where there's a choice, I take the option
that adds the least code. Wording-only fixes are listed briefly.

## Count

| Suggestion | Count |
|---|---|
| ESCALATE | 1 |
| PROPOSE FIX | 31 |
| DECLINE | 6 |
| Already fixed (by D10) | 1 |

## ESCALATE (needs your knowledge)

### [E-1] K3-5: Alternatives L and M are rejected only with "the author chose" — structural, Major

*   **Scope:** Alternative L (lines 608–615) and Alternative M (lines
    617–623).
*   **Problem:** the standard needs a concrete trade-off. The decision
    records say only "Keep as designed. One release" (D1). The reason isn't
    written anywhere I can cite.
*   **What I need from you:** one line each on why one release, with the
    iPhone check last, beats:
    *   **L:** a quick beep-only iPhone check first;
    *   **M:** shipping the rest-rule fix on its own.

    **Resolved:** the author chose the default wording: "for a private two-user app, a second release or an early
    device session costs more effort than the risk saves."

## PROPOSE FIX: design choices (my pick, you can override)

### [F-1] K3-1: no Android vibration while the page is hidden — design, Major

*   **Fix (simplest):**
    *   Goals: "the phone vibrates for the whole tune *while Puntti is on
        screen*".
    *   New Risks row: "No vibration in the background (browsers block
        vibration on hidden pages) | Accepted. The tune still sounds." No
        re-sending the pattern.
    *   C.4 also records vibration.

### [F-2] K3-2: what D10 leaves out — design, Major

*   **(a) No way to stop a tune from outside the page.** New Risks row:
    the tune lasts at most 30 s and stops when you open Puntti and tap.
    Accepted.
*   **(b) The auto-close hides "Go!".** One rule: if the page is hidden
    when the tune ends, "Go!" stays until a tap, the same as a blocked
    sound. In the hook, the close effect starts its 4 s only when
    `!document.hidden`.
*   **(c) Untested iPhone case.** New check B.9: lock the iPhone or switch
    apps while a long tune plays, then come back. Record what you heard
    and whether music stayed paused. Also a Risks row: "the session may
    stay `playback` until Puntti runs again".

### [F-3] K3-3: the claims about background tabs aren't verified — style, Major

*   **Fix:**
    *   Goals keep only the certain part: the rest finishes, and the tune
        plays, whenever the browser runs the page. The throttling figures
        and "usually" are removed.
    *   Open Questions gets: "Does a hidden tab on desktop and Android play
        Web Audio without a tap? A.12 and C.4 record it."

### [F-4] K3-9: the vibration pattern is described inconsistently — style, Major

*   **Fix:**
    *   The long tunes share one pattern, `[600, 300]` × 34 (68 entries,
        30.6 s). That covers the 30 s siren too.
    *   Say that `end` and `stopTune` cancel vibration
        (`navigator.vibrate(0)`), so a shorter tune doesn't keep vibrating.
    *   Update the Risks row and #2 to match.

## PROPOSE FIX: contradictions and references

| # | Finding | Fix |
|---|---|---|
| F-5 | K3-4 (structural Major, design Nit): fallback order | Risks row 1: "Alternative N first, then Alternative A". Alternative A: "the second fallback, after N". |
| F-6 | K3-8 + C3-2 (Major): the Settings load guard | §4, CUJ 6 and #12: "disabled until the program loads, or 3 s at most". Background defines `refreshProgram()`, `programLoaded()` (waits at most 3 s) and `useProgram()`. A.15.1 checks the 3 s. |
| F-7 | K3-6 + C3-10 + K3-13 part (Major): review ids in the body | Remove "Stage 8 finding O1", "round 1, Z3", "Z2-x" and "decision D10" from the body, and put the reason inline where one is needed. The removed items #7 and #10 say what they were in plain words. The header keeps one line naming the review files. |
| F-8 | K3-10 (Major): "#1" and "#2" | Write "Detailed Implementation Plan, item 1 (`tunes.js`)" and "item 2 (`alert.js`)". The failure-handling line becomes one sentence: "Every browser call is wrapped so a missing API can't break the workout screen." |
| F-9 | K3-7 (style Major): "a late return is rare" | Drop "rare". Alternative I is justified on its own terms: Stop alarm is one tap, and a blocked sound is already visual-only. |
| F-10 | C3-4 (comprehension Major): `nextSet` undefined | Background, Session shape: "`nextSet(state)` returns the first undone set of the *selected* exercise in any slot, or `null` when the workout is done." "Today's finish behaviour" is described in one clause. |
| F-11 | C3-3 + K3-25 (Major / Nit): gym, place and the copy | Background defines "gym" (an indoor place with its own plates; outdoors has none). The Goal becomes: "per exercise, at every gym. If an exercise is copied for the other place, the copy keeps its own value." |
| F-12 | C3-6 (Nit): the `lengthS` rule doesn't match the table | Rule: "the end of the last sounding note (rests don't count), plus 0.1 s, computed by the helper". Table: beep 1.03, polka about 23.5. |
| F-13 | C3-5 (Nit): `ID` pattern undefined | §4: "1–40 letters, digits, `_` or `-`". |
| F-14 | C3-7 (Nit): build order | Step 3 smoke check becomes "The Rest stepper saves on the exercise edit screen". The Settings move to `RestStepper` stays in #12 (step 4). |
| F-15 | C3-8 (Nit): names for the global rest | Use "global rest length" (`getRestSeconds()`, which defaults to `REST_SECONDS`) throughout. #20: "`REST_SECONDS` is the default of the global rest length." |
| F-16 | C3-9 + K3-15 (Nit): "load-before-save gap" | Define it in the Non-Goal in one clause. |
| F-17 | C3-11 (Nit): undefined names | Background: `exerciseById` (every exercise, archived ones included) and `AUTO_CLOSE_MS` (4000 ms). |
| F-18 | C3-12 (Nit): B.2 "see Goals" | Goals: "With the setting off, the alarm follows the silent switch: silent in silent mode." |

## PROPOSE FIX: simplifications (zoom out)

| # | Finding | Fix |
|---|---|---|
| F-19 | Z3-1: code-level text in the Technical Plan | §1 and §3 keep only the behaviour. The expressions and effect mechanics stay in #8 and #9. |
| F-20 | Z3-2 (reopens E8 / Z6 for `onReset` only): `RestStepper` reset | `RestStepper({ value, onChange, emptyLabel })`. Each screen puts its own reset link in its group footer: "Use default" on the exercise screen, "Reset to 2:00" in Settings as today. |
| F-21 | Z3-3: unused export in `tunes.js` | Drop `tuneLength`. `TUNE_IDS` stays, as the picker order. |
| F-22 | Z3-4: guest check | `SettingsScreen` branches on `user` from `useAuth()`, like the other groups. No `isGuest()`. |
| F-23 | Z3-5: store depends on a phone setting | The store exports `exerciseRestSeconds(id)`, which returns a number or `null`. `WorkoutScreen` uses `exerciseRestSeconds(id) ?? getRestSeconds()`. `restSecondsFor` goes. |
| F-24 | Z3-6: `finishedSeenAt` | Store `endedAgoMs` on the timer in the finish update. |

## PROPOSE FIX: wording (critic Nits)

| # | Finding | Fix |
|---|---|---|
| F-25 | K3-11 | "five parts". |
| F-26 | K3-13 | N: a one-line description, not "Idea". F: the split moves into Cons. K's "Why not chosen": "needs a migration from each phone, and guests still need a phone value; not worth it for this change". |
| F-27 | K3-16 | Open Questions intro: "Untested claims this design depends on". Add the `<audio>` claim to it ("reported", no source). |
| F-28 | K3-17, K3-19 | Drop both sentences. |
| F-29 | K3-18 | Keep "music does not resume" in Goals and CUJ 3 only. |
| F-30 | K3-20, K3-21, K3-22 | The rewording the reviewer suggested. Bullets under the table for `alarmTune`. "None (accepted by the author)" where nothing reduces the risk. |
| F-31 | K3-24 | Background: the workout screen keeps the screen awake, so a paused page comes from pressing the lock button or switching apps. |

## DECLINE (recorded, not fixed)

| # | Finding | Why |
|---|---|---|
| Z3-7 | Server checks only a wide rest range | Adds off-grid handling to `RestStepper` and changes A.6. The "keep in step" comment is enough for two constants that rarely change. |
| Z3-8 | "Sound blocked" label | One more overlay state. B.1 is judged by ear anyway. |
| K3-12 | Problem sub-headings | Cosmetic. |
| K3-14 | Horizontal rules | Cosmetic. |
| K3-23 | Voice, "every time", exact node counts | Cosmetic. The filler line at 495–497 is dropped under F-30. |
| K3-13 (F split as its own entry) | — | Covered more simply by F-26. |

## Already fixed

*   **C3-1** (the hidden-page finish path): decision D10 now states that the
    finish and the tune also happen while the page is hidden. F-2 covers what
    follows from that.

---

# Stage 8 and Stage 9 findings (round 3)

**Target:** `docs/designs/rest_timer_alarm.md`. The Detailed Implementation
Plan is lines 691–1287; the Stage 8 Nits also touch Background, §4 and
A.12.

**Sources:** `intermediate_zoom_out_report.md` (O3-x) and
`implementation_readiness_report.md` (R3-x).

**Status: resolved** (2026-11-23, author: "auto accept"). G-1 to G-23 were applied. While applying, "All controls stay disabled until `loaded`" in #12 was narrowed to the tune rows and the On/Off control, to match G-4 (Test sound is never disabled).

| Suggestion | Count |
|---|---|
| PROPOSE FIX | 23 |
| DECLINE / CONTEST / ESCALATE | 0 |

## PROPOSE FIX: Majors

### [G-1] R3-1: the On/Off control isn't really disabled (readiness + codebase, Major)

*   **Verified:** `src/components/ui.jsx:61` disables only the options that
    are not selected.
*   **Edit:**
    *   #12, Saving: "`save(next)` returns at once when `saving || !loaded`.
        The On/Off `onChange` returns at once when `value === ringWhenSilent()`,
        and a tune row tap does the same when
        `id === tuneIdOrDefault(alarmTune())`."
    *   #29 adds: "`SegmentedControl` keeps the selected option enabled on
        purpose; `AlarmSetting` guards instead."

### [G-2] R3-2: `RestStepper` labels and its empty state (codebase Major, readiness Nit)

*   **Verified:** `SettingsScreen.jsx:103,109,111,115` hard-codes "Default
    timer" and "min".
*   **Edit #28:**
    *   Signature: `RestStepper({ label, value, onChange, emptyLabel })`.
    *   The `aria-label`s use `label`: "`${label}: 15 seconds shorter`" and
        "`${label} m:ss`".
    *   When `value` is `null`, the value cell shows `emptyLabel` with
        `.stepper-value.is-default`, no "min" unit, and `aria-label`
        "`${label}: ${emptyLabel}`".
    *   + and − start from `getRestSeconds()`, which the component imports
        itself.
*   **Callers:** Settings passes `label="Default timer"`; the exercise screen
    passes `label="Rest"`.

### [G-3] R3-3: #9 states as fact what the checks only record (style, Major)

*   **Edit #9, Hidden page:** "The code doesn't stop or delay the tune when
    the page is hidden. Whether the browser plays it then is recorded in
    A.12, B.5, B.9 and C.4. The existing `visibilitychange` listener only
    makes the tick run at once when the page comes back."

## PROPOSE FIX: Nits

| # | Finding | Edit |
|---|---|---|
| G-4 | R3-4 Settings markup | In #12, a short layout: one `InsetGroup` "Rest alarm". (1) one `ListRow` per id in `TUNE_IDS`, with the label as a child and `<span className="picker-check is-on">` as a trailing sibling only on the selected row, so unselected rows show no empty circle; (2) a row with `row-title` "Ring even when silent", `row-subtitle` sub-label, and the `SegmentedControl`; (3) a `ListRow` with `row-action` "Test sound" / "Stop". Test sound is never disabled (it saves nothing). Picking a tune while `testing` calls `stopTune()` and `setTesting(false)` before `save`. A save error replaces the footer text, as in `HoldSetting`. |
| G-5 | R3-5 `onEnded` unguarded | #2: `onEnded?.(…)` in step 5.2 and in `end`. |
| G-6 | R3-6 beep timing and envelope | Beep `startS` 0, 0.32 and 0.64, so `lengthS` is 0.98. State that every tune, beep included, uses the linear envelope on purpose. The step 2 smoke check: "A rest still ends with three beeps." The Goals: "about 1 s". |
| G-7 | R3-7 docs gaps | #16: also `hooks/README.md:12` (timer shape) and `:22` (close and skip rules). #18: also `screens/README.md:35-38` (drop `formatClock`, add `AlarmSetting`). New line under #15: `src/README.md:35`, utils entry "alert, tunes, formatting…". |
| G-8 | R3-8 stop ramp | #2 `stopTune` 2.1: `cancelScheduledValues(now)`, `setValueAtTime(gain.value, now)`, `linearRampToValueAtTime(0, now + 0.03)`. |
| G-9 | R3-9 pitch format | #1: "Notes start at 0 s. Pitches are MIDI numbers; the note-name tables are converted when the data is written." |
| G-10 | R3-10 A.6 request body | A.6: send the inner `program` object from `GET /program`'s `{ program }`, from an account that has saved at least once. |
| G-11 | R3-11 muted style | #26 names `.stepper-value.is-default` (colour `--label-3`). Build step 3 includes that part of #26. |
| G-12 | R3-12 B.1 rule | B.1: "If Spotify resumes, drop 'Music does not resume by itself' from the sub-label." |
| G-13 | R3-13 B.7 | "The sound stops at once, with no tail or click." |
| G-14 | R3-14 C.1 | "Until the tune ends (about 27–30 s)." |
| G-15 | R3-15 | Drop "widely published". |
| G-16 | R3-16 | Reorder #9 Finishing. |
| G-17 | R3-17 | #7 and #10: "(Removed. Number kept so references stay valid.)" #29 keeps its fact. |
| G-18 | R3-18 | "One `ListRow` per id in `TUNE_IDS`" (part of G-4). |
| G-19 | R3-19 | The reworded B preamble, as the reviewer suggested. |
| G-20 | O3-1 Settings footer | "On iPhone the alarm needs Puntti open on screen. On Android it plays at media volume." |
| G-21 | O3-2 code names in Background | Describe `nextSet`, `exerciseById` and `AUTO_CLOSE_MS` in words in Background; the names move into #5 and #8 (#9 already has `AUTO_CLOSE_MS`). |
| G-22 | O3-3 guest Test sound | #12 and §4: one Test sound for everyone, the same call. Guests see "Log in to choose a tune" in place of the picker and the On/Off control. Their default program already gives `beep` and `true`. |
| G-23 | O3-4 formatting | Split A.12 into "Plays once" and "Background tab" sub-items. Give the two §4 principle bullets a "Why:" lead-in. |
