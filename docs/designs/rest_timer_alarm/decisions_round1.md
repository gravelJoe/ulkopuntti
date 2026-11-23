# Goldfish Annotated Review Report

> **Note:** the stage reports this record cites (zoom out, comprehension,
> critic, implementation readiness, and the design drafts) were working files
> and have been deleted. Every finding they raised is listed here with its
> outcome.

**Status: resolved** (auto accept, 2026-11-22: E1–E16 applied to docs/designs/rest_timer_alarm.md)

**Target:** `docs/designs/rest_timer_alarm.md` (full file, lines 1–1148)

**Sources:**

*   `zoom_out_report.md` (Z), `comprehension_report.md` (C),
    `critic_report.md` (K), `intermediate_zoom_out_report.md` (O),
    `implementation_readiness_report.md` (R)

The ids below match those reports.

**Suggestion types:**

*   **PROPOSE FIX:** edit the document.
*   **DECLINE:** a minor finding, recorded but not fixed.
*   **ACCEPTED (author):** the author chose to keep the current design. The
    fix is to state the risk plainly in the document.

No findings are contested or escalated.

## Author decisions (made in chat, 2026-11-22)

| # | Question | Decision |
|---|---|---|
| D1 | Release order and storage (O1, Z1–Z3) | **Keep as designed.** One release. `alarmTune` and `ringWhenSilent` are saved on the server. The iPhone check comes last. This makes the K9, Z7 and R9 fixes required. |
| D2 | Tune length (O2) | **Keep about 30 s** for `nokia`, `polka` and `siren`. Vibration is sent in chunks (R5), and each tune has an exact cut-off rule (R8). |
| D3 | Who closes "Go!" (O3, Z11) | **`useRestAlarm`, plus the K1 fix.** |
| D4 | Late alarm when sound is blocked (R3) | **Accept silence.** The late alarm is visual only, and a tap always closes. |
| D5 | Polka notes (R1) | **Claude transcribes them from memory.** The author checks by ear. |
| D5b | Siren frequencies (R7) | **400–1000 Hz is final**, stated as an approximation. |

## Proposed edits, by area

The findings are grouped by the part of the document they change. Many
findings land on the same text.

### E1. New "Risks & Mitigations" section, replacing scattered text

*   **Fixes:** K4, K5, O4, O6, Z1, Z2, Z5, K11, K21.
*   **Suggestion:** PROPOSE FIX. For Z1, Z2 and K11: ACCEPTED (author).
*   **Location:** a new H2 before Alternatives Considered.
*   **Change:** one table, with columns for risk, trigger, impact,
    mitigation, and how we'll know. Rows:

| Risk | Trigger | Impact | Mitigation | How we'll know |
|---|---|---|---|---|
| Timer-driven `playback` audio fails on iPhone | iOS won't resume `AudioContext` or switch the session without a tap | No alarm through the silent switch (the reported bug stays) | Accepted by the author (D1): the check runs last. If it fails, fall back to Alternative A (`<audio>`). | B.1 |
| Server change can't be rolled back | Server rollback after users save `restSeconds` | Per-exercise rest lengths lost (`alarmTune` and `ringWhenSilent` stay stored but are hidden) | Don't roll the server back past this change | — |
| Music stops at every alarm | "Ring even when silent" on, music playing | Spotify stops and may not resume by itself; it may have to be restarted after every set | The setting can be turned off; the help text says so | B.1, B.8 (new headphone check) |
| Late alarm is silent | Rest ends while the page is hidden; iOS blocks sound on return | Visual only (D4) | Accepted by the author | B.5 |
| Bystanders mistake the siren for a real alert | `siren` chosen, ringing through the silent switch in a public place | People nearby may be alarmed | Accepted by the author: the siren is not the default, and Stop alarm silences it in one tap | — |
| An out-of-date copy overwrites newer settings | Two phones; one holds an old program in memory | The newer tune or rest is lost | Settings reloads the program when it opens (Z7), and is disabled until loaded (K9) | A.15 (new) |
| Unverified platform claims | `audioSession` support on iOS 17+; `transient` obeying the silent switch; the Chrome vibration length limit | A wrong assumption | Each claim is listed with what checks it | B.1, B.2, C.1 |

*   **Then:** shorten Open Questions, Rollout, the NFR rollback text and the
    reason for rejecting Alternative L to pointers to this section.

### E2. Context paragraph for new readers

*   **Fixes:** C1, C2, C4, C5, C6, C9, C3, K7 (the "brief" part).
*   **Suggestion:** PROPOSE FIX.
*   **Location:** a new short "Background" subsection under Overview.
*   **Change:** one sentence each on:
    *   **The program:** stored on the server, saved whole by
        `saveProgram()` / `getProgram()` in `src/program/store.js`.
    *   **`holdWeeks`:** an existing setting saved in the program, which
        this design copies.
    *   **Places:** outdoor and indoor. A training mode chooses which apply.
        `normalize()` copies an exercise used in both places.
    *   **Archived exercises:** deleted exercises that History still names.
    *   **Drafts:** a workout in progress, saved on the phone.
    *   **The session shape:** `slots[]`. Each slot has `selected` (an
        exercise id), `sets[exerciseId]` (a list of true/false) and
        `weight[exerciseId]`. Switching to an alternative exercise uses
        that exercise's own set list.
    *   **The "Go!" screen:** the finished overlay. Its big digits show
        "Go!" and its label shows "Rest over".
*   **Also:** remove "The brief allows this".

### E3. Tune data (R1 blocker, R6, R7, R8, K7, R26, R27, D2, D5, D5b)

*   **Suggestion:** PROPOSE FIX.
*   **Location:** Goals (lines 72–79), the Technical Plan tune table, and
    #1.
*   **Change, Goals:** "Three tunes of about 30 s (`nokia`, `polka`,
    `siren`) plus today's short `beep` (default, about 0.95 s)." Also
    correct line 598.
*   **Change, note shape:** `note = { hz: number | null, startS, durS }`.
    `null` means a rest. The plan's `lengthS` with notes already repeated
    replaces the spec's `repeatToS`.
*   **Cut-off rule:** melodies repeat a whole phrase plus a gap, and play
    only the phrases that end by 30 s. The siren stops wherever it is at
    `lengthS`.
*   **`beep`:**
    *   880, 880 and 1320 Hz.
    *   Start times 0.05, 0.37 and 0.69 s; each note is 0.24 s long.
    *   `lengthS` 0.95.
*   **`nokia`:**
    *   Notes: E6 D6 F#5 G#5 C#6 B5 D5 E5 B5 A5 C#5 E5 A5.
    *   Durations: 8th, 8th, 4th, 4th ×3, then a half note, at 225 bpm. An
        8th is 0.133 s; the phrase is 2.93 s long.
    *   Gap between phrases: 1.0 s.
    *   7 phrases, ending at about 26.5 s. `lengthS` 26.6.
    *   Source: the widely published Nokia ringtone (RTTTL)
        `8e6,8d6,f#,g#,8c#6,8b,d,e,8b,8a,c#,e,2a`.
*   **`polka`:**
    *   Main theme in A minor, 2/4, 126 bpm. An 8th is 0.238 s.
    *   **Transcribed from memory, not from a score. Check by ear with Test
        sound and correct the table if needed.**
    *   The note table, 8 bars:

        | Bar | Notes |
        |---|---|
        | 1 | E5 8th, E5 16th, E5 16th, E5 8th, D5 8th |
        | 2 | C5 8th, B4 8th, A4 8th, C5 8th |
        | 3 | E5 8th, E5 16th, E5 16th, E5 8th, F5 8th |
        | 4 | E5 quarter, rest quarter |
        | 5 | D5 8th, D5 16th, D5 16th, D5 8th, C5 8th |
        | 6 | B4 8th, A4 8th, G#4 8th, B4 8th |
        | 7 | D5 8th, C5 8th, B4 8th, G#4 8th |
        | 8 | A4 quarter, rest quarter |

    *   Phrase length 7.62 s; gap between phrases 0.5 s.
    *   3 phrases. `lengthS` 23.9.
*   **`siren`:**
    *   One oscillator, sine wave.
    *   Alternating `linearRampToValueAtTime` ramps: 400 → 1000 Hz over 7 s,
        then 1000 → 400 Hz over 7 s.
    *   Two full cycles (28 s), then a rise that is cut off at 30 s.
        `lengthS` 30.
    *   The 400–1000 Hz range is an approximation chosen by the author, not
        taken from the official specification.
    *   Remove the Open Question about siren frequencies.

### E4. Player: failure handling, timing, vibration and session (R4, K23, K24, R5/K10, R18, Z8/R19, K22, K18)

*   **Suggestion:** PROPOSE FIX.
*   **Location:** Technical Plan §2 (shortened, see E9) and #2.
*   **Change:**
    *   **Failure handling (R4, K18):** `playTune` always sets its end timer,
        even if no audio could be scheduled. Each browser API call has its
        own try/catch. Remove "as today".
    *   **Waiting for audio (K23, D4):** if `ctx.state` isn't `'running'`,
        `playTune` awaits `ctx.resume()` for up to 1 s.
        *   If audio is running by then, schedule from `ctx.currentTime +
            0.05` and start the end timer.
        *   If not, restore the session at once, skip sound and vibration,
            and call `onEnded` straight away. The overlay then shows the
            visual alarm and closes 4 s later.
    *   **Who plays (K23):** `playing` is true only while sound is actually
        scheduled.
    *   **Envelope (R18):**
        *   20 ms linear attack to 0.7, then a linear release over the last
            30 ms of `durS`.
        *   `null` notes are skipped.
        *   The siren gets the same attack and release.
    *   **Stopping (R18):** `stopTune` ramps the master gain linearly to 0
        over 30 ms, calls `osc.stop(now + 0.03)`, and disconnects after a
        40 ms timeout.
    *   **Vibration (R5/K10):**
        *   `beep` keeps `[300, 150, 300, 150, 300]`.
        *   Long tunes send `[300, 150]` × 22 (about 10 s) every 10 s until
            `lengthS`.
        *   `vibrate(0)` on stop or end.
    *   **Session restore (K24):**
        *   `playTune` doesn't restore the session when it stops a previous
            tune.
        *   State plainly: music does not resume by itself.
    *   **Unused API (Z8/R19):** drop `isTunePlaying()` and the returned
        `stop`. `playTune` returns nothing.
    *   **Hidden page (K22):** `useRestAlarm` calls `stopTune()` when the
        page becomes hidden.

### E5. Late alarm and the overlay (K2, K3, R3, Z4, D4, K17, K19, R12, R15)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   **Goal, line 92:** "If the rest ended while the page was hidden, the
        overlay shows 'Rest ended m:ss ago' when it is visible again
        (shown when more than 5 s late). The tune plays if the browser
        allows sound at that moment; otherwise the alarm is visual only."
    *   **CUJ 5:** cover both outcomes.
    *   **Line 410–412:** remove the "plays on the next tap" claim.
    *   **`endedAgoMs`:**
        *   "Under about 200 ms while visible; large only when hidden."
        *   It is a fixed value and does not count up.
    *   **The button:** call it "Stop alarm button" everywhere. Skip is not
        shown in the finished state.
    *   **Check A.12:** only "plays once".
    *   **Check B.5:** expect either sound or the visual label. Both pass;
        record which happened.

### E6. Alarm hook and timer (K1, D3)

*   **Suggestion:** PROPOSE FIX.
*   **Location:** Technical Plan §3 and #10.
*   **Change:** the 4 s close timeout is stored with the timer `id` it was
    started for.
    *   It is cleared when `rest.timer` becomes null or changes `id`.
    *   It calls `rest.skip()` only if `rest.timer?.id` still equals that
        id.

### E7. Settings saves on the server (K9, Z7, R9, R10, R21, R25, D1)

*   **Suggestion:** PROPOSE FIX.
*   **Location:** Technical Plan §4 "Editing" and #12, plus a new item for
    `ui.jsx`.
*   **Change:**
    *   **Reload on open (Z7):** `AlarmSetting` calls `refreshProgram()` when
        it mounts.
    *   **Wait for the load (K9):** all controls are disabled until
        `programLoaded()` resolves with the server copy.
    *   **Disable while saving (R9):** a `saving` state is set around
        `await saveProgram(...)`, and the rows and switch are disabled while
        it is set. Reword "as in HoldSetting" to refer to the rollback only.
    *   **New item: `src/components/ui.jsx` (Modify).** `ListRow` gains a
        `disabled` prop that is passed to its `<button>`.
    *   **Switch (R10):** there is no existing switch. Add
        `<input type="checkbox" role="switch" className="switch">` with a
        `.switch` style in `components.css`, covering the checked and
        disabled looks.
    *   **Check mark (R21):** reuse `.picker-check.is-on`.
    *   **Where values come from (R25):**
        *   `selectedTune` and `selectedRingWhenSilent` are read from
            `useProgram()`.
        *   A `testing` state is declared and set to true when Test sound
            starts.
        *   Guests are detected with `isGuest()`. A guest's Test sound plays
            `beep` with `ringWhenSilent: true`.
        *   Changing the tune while Test sound plays stops the test.
    *   **HoldSetting (O5):** the same reload-on-open gap is not fixed in
        `HoldSetting`. That is out of scope, recorded as a separate issue.

### E8. Rest stepper reuse (Z6, R11, R20)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   **New file `src/components/RestStepper.jsx`:**
        `RestStepper({ value, onChange, emptyLabel, onReset })`, pulled out
        of `RestTimerSetting`.
        *   All of its buttons are `type="button"`.
        *   It uses `REST_MIN/MAX/STEP_SECONDS`.
        *   It is used in `SettingsScreen` and `ExerciseEditScreen`.
    *   **Formatting:** add `formatSeconds(s)` to `src/utils/format.js`,
        replacing `SettingsScreen`'s private `formatClock`.

### E9. Shorten the Technical Plan and remove repeats (Z10, K27, O4)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   Cut Technical Plan §2 and §3 down to contracts: what plays, the stop
        and end events, who owns stopping, and when the session switches.
        The numbered steps stay only in #2, #9 and #10.
    *   Remove repeats of Alternatives J and K and of the NFR rollout text
        (point to them instead).

### E10. Server rules (K12, Z9, R15, R22)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   **`restSeconds`:**
        *   Taken as `Number(e.restSeconds)` when it isn't null.
        *   A valid value is a whole number from 30 to 600 in steps of 15.
        *   Anything else becomes `null` (no rest length set), with no 400.
            A save replaces the whole program, so a strict check would
            block every later save.
        *   A comment ties the limits to `preferences.js`.
    *   **`alarmTune`:** any string matching the existing `ID` regex is
        stored as sent; anything else becomes `'beep'`. The app's
        `tuneIdOrDefault` handles ids it doesn't know. Remove the server's
        copy of `TUNE_IDS`.
    *   **`ringWhenSilent`:** anything that isn't a boolean becomes `true`.
    *   Update the table, Alternative J, #13, #24 and A.6/A.7 to match.

### E11. Wrong claims about rollout and the old app (K8, Z7, K20)

*   **Suggestion:** PROPOSE FIX.
*   **Location:** lines 486–496, 659–663.
*   **Change:**
    *   An old app receives the new fields and sends them back through
        `normalize()`.
    *   Its edit screen keeps `restSeconds` through the
        `{ ...x, ...exercise }` merge.
    *   The real risk is an out-of-date copy overwriting newer changes (see
        E1, E7).
    *   A server rollback loses only `restSeconds`. Because the PUT uses
        `$set`, `alarmTune` and `ringWhenSilent` stay in Mongo and are only
        hidden.

### E12. `unlockAudio()` placement (M3 style, K2, R3)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   `unlockAudio()` stays inside `rest.start()`, so it runs only on ticks
        that start a rest.
    *   Correct lines 320 and 356–357. Alternative C's reason becomes
        "`unlockAudio()` runs at the start of every rest."

### E13. Alternatives rewritten as trade-offs (K6)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   One line at the top of the section: "All alternatives below were
        decided by the author during brainstorming and drafting
        (2026-11-22)."
    *   Remove "Rejected by author" from each alternative and give the
        trade-off instead:
        *   **F:** the account follows the user to a second phone. The
            per-phone cost and the overwrite guard are accepted (E7).
        *   **H:** removing the siren loses a tune the user picks on purpose.
            The bystander risk is in E1.
        *   **I:** a late return is rare, Stop alarm is one tap, and there
            is one behaviour to test. Superseded by D4 (a visual-only late
            alarm when sound is blocked).
        *   **L:** the author chose to run the iPhone check last. The risk
            is in E1.

### E14. Build order and phase checks (R2, C8, R24, R23)

*   **Suggestion:** PROPOSE FIX.
*   **Change:** the new order:

    | Step | Items |
    |---|---|
    | 1 | Server #13–#14, deployed to production before the frontend release |
    | 2 | #1, #2 (keep `playRestOverAlert` as a wrapper calling `playTune('beep')`) |
    | 3 | #3–#6, the new `RestStepper` and `format.js` |
    | 4 | #7, #9, #10, then #8, #11, #12, `ui.jsx`, #26 |
    | 5 | Docs (#15–#25, plus `hooks/README.md:30` and `src/README.md:30–31`) |

    *   Every step ends with `npm run build` and one smoke check.
    *   Add `src/workout/README.md` to the list of files with uncommitted
        changes.
    *   Note that "Starts after each set." appears twice in
        `SettingsScreen.jsx` (lines 88 and 91).

### E15. Verification plan (R12, R13, R14, R15, Z5, K25, R28)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   **A.6 and A.7 (R13):** on a test account:
        1.  Copy the `GET /program` response from devtools.
        2.  Change one field.
        3.  Re-send the whole body with the request's auth header.

        Expect 200, and `restSeconds: null` or `alarmTune` as sent (see
        E10).
    *   **New A.14:** a tune chosen in one browser is used in another after
        a reload.
    *   **New A.15:**
        *   Settings controls stay disabled until the program loads.
        *   A failed save restores the old value.
        *   Controls are disabled while saving.
    *   **New A.16:** the Rest stepper.
        *   From the default state, + and − start at the global value.
        *   It stops at 30 and 600.
        *   "Use default" saves `null`.
        *   It shows for both indoor and outdoor exercises.
        *   + and − don't submit the form.
    *   **New A.17:** `beep` then the 4 s close. A new rest started within
        4 s of a tune ending is not closed (K1).
    *   **B.1 (R15):** pass if Spotify pauses. Record whether it resumes by
        itself.
    *   **New B.8 (Z5):** silent mode, "Ring even when silent" off,
        Bluetooth headphones, Spotify playing. Record whether the alarm is
        heard and whether music keeps playing.
    *   **K25:** say that Test sound runs inside a tap. The device checks
        use −30 s down to zero, which is the timer path.
    *   **Wording (R28):**
        *   "starts with no errors"
        *   "any exercise (for example Bench)"
        *   how to get a program saved before this change: save it from the
            pre-#13 server

### E16. Text accuracy and wording (R15, K13–K16, K19, K26, K28, R16, R17, R28, R29, C7)

*   **Suggestion:** PROPOSE FIX.
*   **Change:**
    *   **Sub-label:** "Pauses music when the alarm plays. Music does not
        resume by itself."
    *   **Settings sync:** "Changes from another phone apply after the
        program reloads."
    *   **Names and signatures:**
        *   `handleToggleSet`, not `handleToggle`.
        *   One signature, `restAfterTick(state, slotIndex)`.
        *   Add the workout-finished branch to the diagram.
        *   `restSecondsFor` falls back when the value is not a number.
    *   **`justDone`:** "the current string `${name} · Set n of m done`".
    *   **Terms:** "silent mode" defined once.
    *   **Formats:** use the format `m:ss` instead of example times.
    *   **Remaining fixes:**
        *   "today's" → "the current"
        *   "Mode:" → "Settings read time"
        *   "Default uses the rest length from Settings"
        *   pass `playing` once
        *   the unclear "it"
    *   **`navigator.audioSession` (C7):** link the W3C Audio Session draft
        (https://w3c.github.io/audio-session/). Mark iOS 17+ support as
        unverified and checked by B.1.

## Declined (minor findings, recorded but not fixed)

| Finding | Reason |
|---|---|
| Z11 (`restAfterTick` exported) | A pure exported function is easy to read and reuse. It's a small cost. |
| K28 (horizontal rules used unevenly; no "Related documents" header) | Cosmetic. Concepts brief and reports are working files in the project root. |
| K28 ("easy to miss in a noisy gym" has no source) | This is the author's own report of the problem. |
| O5 (HoldSetting overwrite gap) | Out of scope. Track it as a separate small fix. |
| Z11 / O2 (YAGNI: fewer or shorter tunes) | The author decided (D2, D5). |

## Counts

| Category | Count |
|---|---|
| Edit groups proposed | 16 (covering about 60 findings) |
| Accepted by the author (stated as risks) | Z1, Z2, Z3, K5, K11, O1–O3 |
| Declined | 5 |
| Contested | 0 |
| Escalated | 0 |
