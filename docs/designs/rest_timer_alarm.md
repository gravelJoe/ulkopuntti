# Rest Timer: Within-Exercise Rest, Alarm Tunes and Per-Exercise Rest Length

*   **Author:** Pille
*   **Status:** Proposed
*   **Date:** 2026-11-22
*   **Review:** EGM review, three rounds (2026-11-22 and 2026-11-23). The
    author's decisions are recorded in `goldfish_review_report_round1.md`,
    `goldfish_review_report_round2.md` and `goldfish_review_report.md` in
    the repository root.

--------------------------------------------------------------------------------

## Overview

Puntti is a private workout log used by two people on their phones. When you
tick a set as done, the app starts a full-screen rest countdown. When the rest
ends, it beeps and vibrates and shows "Go!".

This design changes the rest timer in three ways:

1.  **No rest after an exercise is complete.** The tick that completes an
    exercise starts no timer. Rest only runs between sets of the same
    exercise.
2.  **An alarm you can hear and choose.** The alarm can play on an iPhone in
    silent mode. In Settings you pick one of four tunes: the current beep,
    the Nokia tune, Säkkijärven polkka, or the Finnish public danger signal
    ("yleinen vaaramerkki"). The choice is saved to your account.
3.  **Rest length per exercise.** Each exercise can have its own rest length.
    If it has none, the global rest length from Settings is used.

### Background

These terms and existing pieces of the app come up throughout the design:

*   **Program.** Your exercises, workouts, gyms and program-wide settings.
    *   It is stored on the server as one document.
    *   The app reads it with `getProgram()` and saves it with
        `saveProgram()`, both in `src/program/store.js`. Every save sends
        the whole program.
    *   Logged-in users load it from the server when the app starts or they
        log in, and keep a copy cached on the phone.
    *   Guests (not logged in) use a built-in default program and cannot
        save.
    *   `refreshProgram()` loads the cached copy at once and starts a
        server fetch. `programLoaded()` resolves when that fetch ends, or
        after 3 s, whichever comes first. `useProgram()` re-renders a
        component when the program changes.
*   **`holdWeeks`.** An existing program-wide setting, changed in Settings
    by `HoldSetting`. This design stores its new program-wide settings the
    same way:
    *   a default value
    *   a fallback in `normalize()`
    *   a getter
    *   server validation (except that the new fields fall back to their
        defaults instead of being rejected with a 400, as `holdWeeks` is)
    *   a schema default
*   **Places, gyms and training mode.**
    *   Each exercise and workout is either **outdoor** or **indoor**.
    *   A **gym** is an indoor place with its own bars and plates. Outdoors
        there are no gyms.
    *   The training mode (`outdoor`, `indoor` or `both`) decides which
        places you use.
    *   If an exercise is used by workouts in both places, `normalize()`
        makes a copy of it for the second place. The copy has every field
        except weekly progression. After that the two are separate
        exercises, each edited and saved on its own.
*   **Archived exercises.** Deleted exercises are archived instead of
    removed, so History can still show their names.
*   **Draft.** The workout you are doing right now, saved on the phone so
    you can return to it.
*   **Session shape.** A workout in progress has a list of slots.
    *   A slot holds one or more alternative exercises.
    *   `selected` is the exercise currently chosen in that slot.
    *   Sets and weights are kept per exercise: `sets[exerciseId]` is a list
        of true/false values (done or not), and `weight[exerciseId]` is the
        weight.
    *   Switching to an alternative exercise uses that exercise's own list
        of sets.
    *   The workout is finished when every set of each slot's selected
        exercise is done. Finishing shows the existing "Save workout"
        screen.
*   **The "Go!" screen.** The rest overlay after the countdown ends. Its big
    digits show "Go!", and its label shows "Rest over". Today it closes
    itself 4 s after the rest ends.
*   **Screen kept awake.** The workout screen holds a screen wake lock, so
    the phone doesn't lock by itself during a workout. A paused page comes
    from pressing the lock button or switching apps.
*   **Silent mode.** The iPhone's ring/silent switch set to silent (the
    switch shows orange).

## The Problem

**Unwanted rest between exercises.**

*   Today a rest starts after every set except the last set of the whole
    workout.
*   When you finish the last set of an exercise, a rest starts before the
    next exercise.
*   You don't want it: moving to the next machine or bar already takes time,
    so you tap Skip every time.

**The alarm is silent on iPhone.**

*   In silent mode, the rest-over beeps make no sound, even with the media
    volume up.
*   The cause: iPhone Safari treats sound from a web page as "ambient" by
    default, and ambient sound follows the silent switch, not the media
    volume.
*   The current alarm is also three short beeps, which the users find easy
    to miss in the gym.

**One rest length for everything.**

*   There is one rest length (default 2:00), set separately on each phone in
    Settings.
*   A heavy compound lift and a light accessory exercise need different
    rests.
*   Today you change the global setting, or adjust the timer with +10 s /
    −30 s on every set.

**Proposed solution, in short:**

1.  Start no rest after the tick that completes an exercise.
2.  Replace the fixed beep with a tune player that can be stopped and that
    plays one of four tunes built from notes in code.
3.  On iPhone, switch the page's audio session to "playback" just before a
    tune and back afterwards. "Playback" ignores silent mode.
4.  Add an optional `restSeconds` to each exercise.
5.  Save the tune choice, the silent-mode setting and the per-exercise rest
    in the program on the server.

## Goals

*   **No rest after an exercise is complete.**
    *   The tick that leaves every set of the selected exercise done starts
        no rest timer.
    *   It also stops any rest or tune still running.
*   **Rest only within an exercise.**
    *   Ticking a set while other sets of the same exercise are still
        undone starts a rest.
    *   The overlay's "Next:" line names that exercise's next undone set.
*   **Audible in silent mode.**
    *   This applies when "Ring even when silent (pauses music)" is on,
        which is the default. With the setting off, the alarm follows the
        silent switch: it is silent in silent mode.
    *   The alarm then plays on iPhone with iOS 17 or later in silent mode.
        The iOS 17 requirement is unverified; check B.1 tests it.
    *   Accepted cost: music from other apps, such as Spotify, stops when
        the alarm plays and does not resume by itself.
*   **Android.** The alarm plays at media volume. While Puntti is on
    screen, the phone vibrates until the tune ends. Browsers don't vibrate
    for a hidden page.
*   **Tunes:**
    *   `beep`: today's three beeps, about 1 s. This is the default.
    *   `nokia`: about 27 s.
    *   `polka`: about 23.5 s.
    *   `siren`: 30 s.

    They are built from notes in code, with no audio files. The note data
    is in the Detailed Implementation Plan, item 1 (`tunes.js`).
*   **Every alarm can be stopped.**
    *   The "Go!" screen stays open while a tune plays and shows a **Stop
        alarm** button.
    *   Sound and vibration stop within about 30 ms when any of these
        happens:
        *   the Stop alarm button, or a tap on the screen
        *   Skip
        *   starting a new rest
        *   completing an exercise
        *   finishing the workout
        *   leaving the workout screen

    Hiding the page (another tab or app) does not stop it.
*   **Alarm in the background.** The rest keeps running while Puntti is
    in a background tab or behind another app. Whenever the browser runs
    the page, the rest finishes and the tune plays, even while hidden.
    Whether a hidden tab gets sound is an open question. A locked iPhone
    pauses the page, so there it becomes the late alarm below.
    *   If the page is hidden when the tune ends, "Go!" stays until a tap,
        so the alarm isn't gone when you come back.
*   **Test sound.**
    *   Settings has a Test sound button.
    *   It plays the selected tune through the same player as the real
        alarm, and turns into Stop while playing.
    *   It runs inside a tap, so it does not prove the timer-driven alarm
        works. Check B.1 does that.
*   **Late alarm.**
    *   If the browser paused the page when the rest ended (for example a
        locked iPhone), the app notices the end only when the page runs
        again. The overlay then shows "Rest ended m:ss ago". This label
        appears when the end was noticed more than 5 s late.
    *   The tune plays if the browser allows sound at that moment.
    *   Otherwise the alarm is visual only, and a tap closes the screen as
        usual.
*   **Rest length per exercise.**
    *   An optional rest length per exercise: 30–600 s in 15 s steps.
    *   It is saved on the server and used at every gym. An exercise copied
        for the other place keeps its own value.
    *   It can be cleared. When it is empty, the global rest length is used.
*   **Settings saved to the account.**
    *   The tune and "Ring even when silent" are saved on the server with
        the program.
    *   A change made on one phone applies on another after the program
        reloads there.
*   **Old data keeps working without a migration.**
    *   No saved tune means `beep`.
    *   No saved silent-mode setting means on.
    *   No rest length on an exercise means the global rest length.

## Non-Goals

*   **An alarm while the page is paused.** A background tab that the
    browser still runs does get the alarm (see Goals). But iPhone pauses web
    pages in the background or behind a locked screen, and other browsers
    may freeze long-hidden pages. Covering that would need Web Push or a
    native app.
*   **Supersets or rests between different exercises.** There is no superset
    model: a slot holds alternative exercises, not pairs. There is also no
    manual "start rest" button. Both users lose the between-exercise rest,
    which they accept.
*   **Moving the global rest length to the server.** It stays in the phone's
    localStorage.
*   **Audio files, recorded tunes or tunes the user uploads.**
*   **Tune choice for guests.** Guests hear `beep` and can use Test sound.
*   **Keeping music playing while the alarm sounds in silent mode.** No way
    to do this on the web on iPhone is known; the only candidate,
    Alternative D, is unconfirmed. Users who want their music to keep
    playing turn off "Ring even when silent".
*   **Fixing the same load-before-save gap in `HoldSetting`.** The gap: a
    setting saved before the latest program has loaded can overwrite newer
    values with an old copy (see Risks & Mitigations). It is tracked
    separately.

## Open Questions

Untested platform claims this design depends on. The Risks & Mitigations
section lists the check that settles each.

*   **Playback from a timer:** can a page switch `navigator.audioSession.type`
    to `'playback'` and resume audio when a timer fires, with no tap? The
    API is defined in the W3C Audio Session draft
    (https://w3c.github.io/audio-session/). Its support on iOS 17 or later
    is unverified. Check B.1.
*   **Sound on return:** does iPhone allow sound right after a page becomes
    visible again, with no tap? Either answer is handled: the alarm is
    visual only if not. Check B.5 records which happens.
*   **Headphones:** does silent mode mute sound going to headphones? Check
    B.8.
*   **Background tabs:** does a hidden tab on desktop and Android run the
    timer and play Web Audio with no tap? A.12 and C.4 record it. If not,
    the late alarm on return covers it.
*   **iPhone hidden mid-tune:** if the iPhone is locked or another app
    opened while a tune plays, does the sound continue, and does the audio
    session stay `'playback'` until Puntti runs again? Check B.9.
*   **`<audio>` in silent mode:** iPhone is reported to play `<audio>`
    media in silent mode and after locking (no source). This only matters
    for the fallback, Alternative A.

## Critical User Journeys (CUJs)

### CUJ 1: Finishing an exercise moves straight on

*   **Given**: Mid-workout, Squat has 5 sets with 4 ticked, and a rest is
    counting down.
*   **When**: The user ticks the 5th squat set.
*   **Then**:
    *   The running rest closes with no sound.
    *   No new rest starts.
    *   The screen scrolls to the next exercise.

### CUJ 2: Rest between sets uses the exercise's own length

*   **Given**: Bench press has a rest length of 3:00. The global rest is
    2:00.
*   **When**: The user ticks bench set 2 of 5.
*   **Then**:
    *   A 3:00 rest starts.
    *   The overlay shows "Next: Bench press · Set 3".

### CUJ 3: Alarm in silent mode

*   **Given**:
    *   An iPhone on iOS 17 or later, in silent mode.
    *   Spotify is playing.
    *   The tune is `nokia` and "Ring even when silent" is on.
    *   Puntti is open on screen.
*   **When**: The rest reaches 0:00.
*   **Then**:
    *   The Nokia tune plays out loud and Spotify pauses.
    *   "Go!" stays on screen with the Stop alarm button until the tune ends
        or is stopped.
    *   Afterwards `navigator.audioSession.type` is `'auto'` again.
    *   Spotify does not resume by itself.

### CUJ 4: Stopping a long tune

*   **Given**: The `siren` tune is playing on the "Go!" screen.
*   **When**: The user taps the Stop alarm button 2 seconds in.
*   **Then**: Sound and vibration stop within about 30 ms, and the overlay
    closes.

### CUJ 5: Coming back after the rest ended

*   **Given**: A rest started and the user locked the phone. The rest ended
    42 seconds ago.
*   **When**: The user unlocks the phone with Puntti still open.
*   **Then**: The overlay shows "Rest ended 0:42 ago". Then one of two
    things happens:
    *   **Sound allowed:** the full tune plays and can be stopped.
    *   **Sound blocked:** there is no sound. The overlay stays until the
        user taps it, since it is the only alarm left.

### CUJ 6: Choosing and testing a tune

*   **Given**: A logged-in user is in Settings, and the program has loaded
    (or 3 s have passed).
*   **When**:
    1.  They pick `polka`.
    2.  They tap Test sound.
    3.  They tap Stop.
    4.  They reload the app on their other phone.
*   **Then**:
    *   The polka plays and stops on Stop.
    *   The choice is saved to the server.
    *   The other phone uses `polka` after the reload.

### CUJ 7: Clearing an exercise's rest length

*   **Given**: Deadlift has a rest length of 4:00.
*   **When**: The user taps "Use default" in the exercise edit screen and
    saves.
*   **Then**:
    *   The saved exercise has `restSeconds: null`.
    *   The next deadlift rest uses the global length.
    *   This holds after a reload and on another phone.

### CUJ 8: Existing user after release

*   **Given**: A user whose program was saved before this release.
*   **When**: They open the new version and finish a rest.
*   **Then**:
    *   They hear `beep`, with "Ring even when silent" on.
    *   Their exercises use the global rest length.
    *   Nothing is lost on their next save.

## Technical Plan (Architecture)

The work has five parts. This section gives the behaviour each part must
have. The step-by-step details are in the Detailed Implementation Plan.

```text
 tick a set (WorkoutScreen.handleToggleSet)
        │
        ├─ workout finished ─→ rest.skip(); finish as today
        │
        ▼
 undone sets left in the ticked exercise?
   ├─ none → rest.skip(); scroll to next exercise
   └─ some → rest.start(exercise's rest, or the global rest length, info)
        │
        ▼
 useRestTimer ── endAt, finished (once), endedAgoMs, playing
        │       (start() calls unlockAudio())
        │       on finish: plays alarmTune() with ringWhenSilent();
        │       stops on timer change or unmount (not when hidden);
        │       closes the overlay 4 s after an audible tune ends
        ▼
 alert.js player ── playTune / stopTune
        │            AudioContext → master gain → speakers
        │            audioSession 'playback' only while sound plays
        │            navigator.vibrate until the tune ends
        ▼
 RestTimerOverlay ── "Go!" + Stop alarm while playing; "Rest ended m:ss ago"
```

### 1. Rest rules

*   **What a tick does** (not an undo):
    *   **Workout finished:** keeps today's finish behaviour, and also stops
        any rest.
    *   **Exercise finished** (no undone sets left in the ticked exercise):
        stops any rest and scrolls to the next exercise.
    *   **Sets left:** starts a rest. The overlay's "Next:" line names that
        exercise's first undone set.
    *   **Undo:** never starts or stops a timer.
*   **How long the rest is.** The exercise's own rest length if it has
    one, otherwise the global rest length. It is read when the set is
    ticked, and archived exercises are found too, so a resumed draft
    works.

### 2. Alarm player (Web Audio)

*   **Tunes are data.** `src/utils/tunes.js` holds note lists and the
    siren's frequency sweep. There is no playback code in it.
*   **The player.** `src/utils/alert.js` has two functions:
    *   `playTune(id, { ringWhenSilent, onEnded })` plays a tune.
    *   `stopTune()` stops whatever is playing.

    Only one tune plays at a time.
*   **Silent mode.** With `ringWhenSilent` on, and only where
    `'audioSession' in navigator`, the session is set to `'playback'` just
    before sound starts. It goes back to `'auto'` when the sound stops or
    ends.
    *   The session is `'playback'` only while a tune plays (see
        Alternative C).
*   **Sound blocked.** If the `AudioContext` isn't running after up to 1 s
    of `resume()`:
    *   no sound or vibration plays;
    *   the session is restored at once;
    *   `onEnded({ audible: false })` is called right away.

    The overlay then shows a visual-only alarm that stays until a tap.
*   **Stopping while it starts.** If the tune is stopped (or another one
    starts) while `playTune` is still waiting for the audio to resume, it
    gives up when the wait ends: no sound, and `onEnded` is not called.
*   **Failure handling.** Every browser call is wrapped, so a missing API
    can't break the workout screen. Details are in the Detailed
    Implementation Plan, item 2 (`alert.js`).
*   **Unlocking audio.** `unlockAudio()` stays inside `rest.start()`. It
    runs on every tick that starts a rest, which is a user tap.

### 3. Rest timer UI

*   **`useRestTimer` handles the timing and the alarm,** as it does
    today.
    *   **Finish:** each rest finishes exactly once, also while the page is
        hidden whenever the browser runs it. The tune then plays.
    *   **`endedAgoMs`:** how late the end was noticed. It is small while
        the page runs, and large when the page was paused.
    *   **Stops the tune when** the rest is cleared or replaced (Skip, Stop
        alarm, a new rest, completing an exercise, finishing the workout)
        or the workout screen closes. Hiding the page does not stop it.
    *   **Closes the overlay** 4 s after an audible tune ends while the page
        is visible. If the sound was blocked, or the page was hidden when
        the tune ended, it stays until a tap. A close or an end from an
        older rest never affects a newer one.
*   **`RestTimerOverlay`.**
    *   **While the tune plays:** shows the Stop alarm button.
    *   **After the tune:** shows "Back to workout".
    *   **Late rest:** the label reads "Rest ended m:ss ago" when
        `endedAgoMs` is over 5 s.
    *   **Taps:** any tap closes the overlay.
    *   **Skip:** not shown in the finished state.

### 4. Stored settings

| Field | Where | Values | Missing or invalid |
|---|---|---|---|
| `alarmTune` | program (top level) | the id of a tune in `tunes.js` | See below. |
| `ringWhenSilent` | program (top level) | boolean | Anything other than a boolean becomes `true`. |
| `restSeconds` | each exercise | `null` or a whole number 30–600 that is a multiple of 15 | Anything else becomes `null`. |

`alarmTune`, when missing or invalid:

*   **Server:** a string of 1–40 letters, digits, `_` or `-` (the program's
    `ID` pattern) is stored as sent. Anything else becomes `'beep'`.
*   **App:** any string is kept as stored, so an older app never overwrites
    a newer tune.
*   **Playing:** an id the app doesn't know plays as `'beep'`.
*   **Picker:** an unknown id shows Beep as selected, without saving it.

Why the stored settings work this way:

*   **The server is lenient.** A save replaces the whole program. If the
    server rejected one bad field with a 400, that phone could not save
    anything again.
*   **Tune ids live in one place.** The server keeps no list of tune ids.
    Adding a tune needs no server change.
*   **Settings (logged in).** A "Rest alarm" group, shown in every training
    mode, with:
    *   the four tunes, with a check mark on the selected one;
    *   "Ring even when silent", an On/Off `SegmentedControl`;
    *   Test sound.

    How it saves:
    *   It reloads the program when it opens.
    *   It stays disabled until the program has loaded, or for 3 s at most.
        After 3 s it uses the copy it has, which may be stale (see Risks &
        Mitigations).
    *   Each change saves the whole program.
    *   Controls are disabled while a save is in progress.
    *   If a save fails, the old value comes back.
*   **Settings (guests).** "Log in to choose a tune" in place of the tune
    picker and the On/Off control. Test sound is the same control as for
    logged-in users; a guest's default program already gives `beep`.
*   **Exercise edit screen.** A Rest stepper with a "Default (m:ss)" state,
    and a "Use default" link in the group footer. It always saves
    `restSeconds`, as `null` when it is cleared.
*   **Shared stepper.** The stepper is pulled out of the existing global
    rest length setting (`RestTimerSetting`) into `RestStepper`, so both
    screens use the same control. Each screen keeps its own reset link.

### 5. Rollout

1.  Deploy the server change to production.
2.  Release the app.
3.  Reload the app on both phones.

The server must not be rolled back past this change; see Risks &
Mitigations.

## Risks & Mitigations

| Risk | Trigger | Impact | Mitigation | How we'll know |
|---|---|---|---|---|
| Timer-driven playback fails on iPhone | iOS won't resume the `AudioContext` or switch the audio session without a tap | No alarm in silent mode; the reported bug stays | None (accepted by the author): the iPhone check runs last, after the full build. If it fails, try Alternative N first, then Alternative A (`<audio>` element). Both mean reopening this design. | B.1 |
| Server change can't be rolled back | The server is rolled back after users save new values | Per-exercise `restSeconds` values are lost on the next save. `alarmTune` and `ringWhenSilent` stay in the database, because the PUT uses `$set`, but are hidden. | Don't roll the server back past this change | — |
| Music stops at every alarm | "Ring even when silent" on, music playing | Music stops and has to be restarted by hand, possibly after every set | The setting can be turned off; its help text says so | B.1, B.8 |
| Late alarm is silent | The rest ends while the browser has paused the page (locked iPhone), and iOS blocks sound on return | The alarm is visual only | None (accepted by the author). The overlay stays open until a tap, so it isn't missed. | B.5 |
| Bystanders take the siren for a real alert | `siren` is chosen and plays in silent mode in a public place | People nearby may be alarmed | None (accepted by the author). The siren is not the default, and Stop alarm silences it in one tap. | — |
| A stale copy overwrites newer settings | Two phones, one holding an old program in memory. Every save sends the whole program. | A newer tune, silent-mode setting or rest length is lost | Best effort, Settings' alarm group only: it reloads the program when it opens and stays disabled until the load ends or 3 s pass (`programLoaded()` gives up then). Other saves, such as the exercise editor's rest length, archiving and the other settings, are not protected. Both phones reload after release. Otherwise accepted by the author; a server-side version check (409 on a stale save) would close it everywhere but is separate work. | A.15 |
| Vibration stops early on Android | The vibration pattern is longer than the browser allows (believed to be 99 entries in Chrome; unverified) | No vibration for the end of the tune | The long tunes share one pattern of 68 entries (`[600, 300]` × 34, 30.6 s), under the believed limit. Vibration is cancelled when the tune ends. | C.1 |
| No vibration in the background | The page is hidden when the tune starts, or hidden while it plays | Sound only | None (accepted by the author). Browsers don't vibrate for hidden pages. | C.4 |
| A tune can't be stopped from outside Puntti | A rest ends in a background tab or behind another app | Up to 30 s of sound with no visible control | None (accepted by the author). Opening Puntti and tapping stops it. | A.12 |
| iPhone hidden while a tune plays | The phone is locked or another app opened mid-tune, with the session on `'playback'` | The tune may keep sounding, and the session may stay `'playback'` (music stays paused) until Puntti runs again | None (accepted by the author) | B.9 |
| Polka notes are wrong | The polka was written down from memory, not from a score | The tune sounds wrong | The author checks it by ear with Test sound and corrects the table | A.9 |
| The work is one release | Audio work runs into trouble | The rest-rule fix is held back too | None (accepted by the author). Splitting the release is Alternative M. | — |

## Alternatives Considered

The author made these decisions during brainstorming, drafting and review
on 2026-11-22 and 2026-11-23.

### Alternative A: Generated WAV played through an `<audio>` element

*   **Pros**:
    *   iPhone treats `<audio>` as media. Media is reported to work in
        silent mode and after locking, but this is unverified.
    *   Stopping is one `pause()`.
*   **Cons**:
    *   `play()` without a tap is blocked unless the element was already
        played during an earlier tap.
    *   About 2.6 MB of memory per 30 s tune.
    *   It replaces the existing oscillator code instead of extending it.
*   **Why not chosen**: Web Audio reuses `alert.js` and its unlock step, and
    gives a smooth siren sweep. This option is the second fallback if B.1
    fails, after Alternative N (see Risks & Mitigations).

### Alternative B: Web Audio with a WAV `<audio>` fallback

*   **Pros**: covers the failure cases of both A and Web Audio.
*   **Cons**:
    *   Two audio paths and twice the device checks.
    *   A wrong fallback check can play the tune twice, or not at all.
*   **Why not chosen**: the extra code and testing aren't worth it before
    Web Audio has been shown to fail on a phone.

### Alternative C: Set the iPhone audio session to `playback` once for the whole page

*   **Pros**: one line, with no switching back and forth.
*   **Cons**: `unlockAudio()` runs at the start of every rest. With the
    session always on `playback`, music would pause on every set tick, not
    only at the alarm.
*   **Why not chosen**: pausing music at the alarm is acceptable; pausing it
    on every tick is not.

### Alternative D: The `transient` audio session type, so music keeps playing

*   **Pros**: meant for short sounds over other audio, so music would keep
    playing or only get quieter.
*   **Cons**: believed to still follow silent mode, which is the reported
    bug. This is unconfirmed on a device.
*   **Why not chosen**: it doesn't fix the reported problem. Users who want
    to keep their music can turn "Ring even when silent" off.

### Alternative E: Web Push notifications for an alarm while the page is hidden

*   **Pros**: could alert while the phone is locked or another app is open.
*   **Cons**:
    *   On iPhone it needs a home-screen install, a push server and keys.
    *   The notification sound still follows silent mode.
*   **Why not chosen**: a large setup cost, and it doesn't solve silent
    mode.

### Alternative F: Store the tune and "Ring even when silent" in localStorage

*   **Pros**:
    *   No server change.
    *   Works for guests.
    *   "Ring even when silent" behaves per phone: it has no effect on
        Android.
    *   Removes the stale-copy and load-before-save risks.
*   **Cons**:
    *   The choice doesn't follow the account to a second phone.
    *   A split (the tune on the server, "Ring even when silent" on each
        phone) would fit the iPhone-only setting better, but it keeps two
        storage places for one feature.
*   **Why not chosen**: one choice per account is wanted, for both
    settings. The costs are accepted:
    *   one silent-mode setting for every phone on the account;
    *   the reload and load guard in Settings;
    *   the stale-copy risk (see Risks & Mitigations).

### Alternative G: "Ring even when silent" off by default

*   **Pros**: nobody's music stops on release day.
*   **Cons**: the silent-iPhone bug stays until each user finds the setting
    and turns it on.
*   **Why not chosen**: on by default fixes the reported bug for everyone at
    release.

### Alternative H: Drop the danger signal, or rename the Nokia tune

*   **Pros**:
    *   Nobody nearby mistakes the alarm for a real alert.
    *   Avoids the "Nokia tune" sound trademark.
*   **Cons**: loses a tune the users choose on purpose.
*   **Why not chosen**: the app is private. The author accepts the trademark
    risk and the bystander risk (see Risks & Mitigations).

### Alternative I: Always a short beep, or silence, for a late alarm

*   **Pros**: a 30 s tune never starts in the middle of the next set.
*   **Cons**: the alarm behaves differently depending on whether the page was
    visible.
*   **Why not chosen**: one behaviour is simpler to explain and test, and
    Stop alarm is one tap. If iOS blocks sound, the late alarm is already
    visual only.

### Alternative J: Strict server validation (400 on invalid values)

*   **Pros**: bad data is rejected where it enters.
*   **Cons**: a save replaces the whole program. Rejecting one field would
    block every later save from that phone, including unrelated edits.
*   **Why not chosen**: invalid values fall back to defaults instead (see
    Stored settings).

### Alternative K: Move the global rest length to the server

*   **Pros**: all rest settings in one place.
*   **Cons**: needs a migration from each phone's localStorage, and guests
    still need a value on the phone.
*   **Why not chosen**: the migration and the guest case cost more than
    having all rest settings in one place is worth for this change.

### Alternative L: Check the audio on an iPhone first, before the rest of the build

*   **Pros**: answers the "playback from a timer" question before any work on
    tunes or the server. It needs no throwaway code: `playTune('beep')`
    alone, played from a timer, is enough.
*   **Cons**: changes the build order and the release plan.
*   **Why not chosen**: for a private two-user app, an early device session
    costs more effort than the risk saves. The risk is in Risks &
    Mitigations.

### Alternative M: Release the alarm and the rest changes separately

*   **Pros**: the low-risk rest-rule fix ships first, and the audio work can
    be rolled back on its own.
*   **Cons**: more than one release to manage.
*   **Why not chosen**: for a private two-user app, a second release costs
    more effort than the risk saves (see Risks & Mitigations).

### Alternative N: Schedule the tune during the tap that starts the rest

Every rest starts with a tap, which already runs `unlockAudio()`. In that
tap, schedule the tune at
`ctx.currentTime + restSeconds` behind a master gain of 0. The +10 s, −30 s
and Skip taps reschedule or cancel it. When the rest ends, the timer only
switches the session to `playback`, opens the gain and starts vibration.

*   **Pros**: the main risk shrinks from "can audio start without a tap" to
    "can the session be switched without a tap".
*   **Cons**: a few hundred idle audio nodes per rest; the end time is kept
    on two clocks, and the audio clock stops while the page is hidden; a
    late return still needs today's resume path; check B.1 is still needed.
*   **Why not chosen**: the author chose the simpler timer-driven player.
    This is the first variant to try if check B.1 fails, before
    Alternative A.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security & Privacy**: three fields in the user's own program
    document. No new endpoints, permissions or personal data.
*   **Performance**:
    *   A tune schedules at most 91 oscillators (the Nokia tune: 13 notes,
        seven times). The siren uses one.
    *   No audio files are downloaded.
    *   Each change in Settings is one full-program save, the same as
        `holdWeeks`.
*   **Rollout & Rollback**: see Rollout and Risks & Mitigations.
    *   The app can be rolled back: an older app sends the new fields back
        unchanged through `normalize()`, and its exercise edit screen keeps
        `restSeconds` through the `{ ...x, ...exercise }` merge.
    *   The server cannot be rolled back past this change.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Work happens on branch `new-features`, on top of commit `f8ac808` (the
workout History bar), which also touched `WorkoutScreen.jsx`, `session.js`,
`ui.jsx`, `components.css` and several READMEs.

**Order.** At the end of every step, `npm run build` passes and the smoke
check works.

| Step | Items | Smoke check |
|---|---|---|
| 1 | Server #13–#14. Deploy to production before releasing the app. | `npm run server` starts with no errors. A save from the current app still works. |
| 2 | #1, #2 (`playRestOverAlert` stays as a wrapper) | A rest still ends with three beeps. |
| 3 | #3–#5, #27 (`format.js`), #28 (`RestStepper`) with its #26 style, #6 | The Rest stepper saves on the exercise edit screen. |
| 4 | #9, then #8, #11, #26, #12 | Run checks A.1–A.17. |
| 5 | Docs: #15–#25 | — |

### Target Files to Create/Modify

#### 1. `src/utils/tunes.js` (Create)

*   **Type / Scope**: Frontend data module, with no playback code.
*   **Exports:**
    *   `TUNE_IDS = ['beep', 'nokia', 'polka', 'siren']`, which also sets
        the order in the Settings picker
    *   `DEFAULT_TUNE = 'beep'`
    *   `TUNES`, keyed by id
    *   `tuneIdOrDefault(id)`, which returns `id` if it is in `TUNE_IDS`,
        otherwise `DEFAULT_TUNE`
*   **Shape of each tune:** `{ label, wave, notes?, sweep?, lengthS }`.
    *   A note is `{ hz: number | null, startS, durS }`. `hz: null` is a
        rest, and the player skips it.
    *   `notes` already contains every repeat.
    *   A helper in the file builds the repeats from one phrase.
*   **Repeat rule:** phrase, gap, phrase, and so on. Keep only the phrases
    whose last note ends by 30 s. `lengthS` is the end of the last sounding
    note (rests don't count) plus 0.1 s, computed by the helper. The table
    shows the result.
*   **Pitches:** stored as MIDI numbers and converted with
    `hz = 440 · 2^((midi − 69) / 12)`. The note-name tables below are
    converted when the data is written.
*   **Start:** every tune's first note starts at 0 s; the player adds its
    own 50 ms lead (`t0`).

| Id | Label | Wave | Content | `lengthS` |
|---|---|---|---|---|
| `beep` | Beep | `sine` | 880, 880, 1320 Hz. They start at 0, 0.32 and 0.64 s, and each lasts 0.24 s. No repeat. Like every tune it uses the player's linear envelope, so it sounds slightly flatter than today's exponential beep; this is on purpose. | 0.98 |
| `nokia` | Nokia tune | `square` | E6 D6 F#5 G#5 C#6 B5 D5 E5 B5 A5 C#5 E5 A5, at 225 bpm. Note lengths: eighth, eighth, quarter, quarter, three times over, then a half note. An eighth is 0.1333 s, so one phrase is 2.933 s. The gap between phrases is 1.0 s. Seven phrases. Source: the Nokia ringtone in RTTTL, `8e6,8d6,f#,g#,8c#6,8b,d,e,8b,8a,c#,e,2a`. | 26.6 |
| `polka` | Säkkijärven polkka | `square` | The main theme in A minor, 2/4 time, 126 bpm. An eighth is 0.238 s. The phrase is 8 bars long (7.62 s), followed by a 0.5 s gap. Three phrases. The bars are below. **Written down from memory, not from a score. The author checks it by ear with Test sound and corrects this table if it sounds wrong.** | about 23.5 |
| `siren` | Yleinen vaaramerkki | `sine` | `sweep: { lowHz: 400, highHz: 1000, riseS: 7, fallS: 7 }`. It plays two full cycles (28 s), then rises until it is cut off at 30 s. The 400–1000 Hz range is an approximation chosen by the author, not taken from the official specification. | 30 |

**Polka phrase**, bar by bar (8 = eighth note, 16 = sixteenth note, 4 =
quarter note):

| Bar | Notes |
|---|---|
| 1 | E5 8, E5 16, E5 16, E5 8, D5 8 |
| 2 | C5 8, B4 8, A4 8, C5 8 |
| 3 | E5 8, E5 16, E5 16, E5 8, F5 8 |
| 4 | E5 4, rest 4 |
| 5 | D5 8, D5 16, D5 16, D5 8, C5 8 |
| 6 | B4 8, A4 8, G#4 8, B4 8 |
| 7 | D5 8, C5 8, B4 8, G#4 8 |
| 8 | A4 4, rest 4 |

#### 2. `src/utils/alert.js` (Modify)

*   **Type / Scope**: Frontend audio module.
*   **`unlockAudio()`:** unchanged, except that the `'interrupted'` state is
    treated like `'suspended'` (it calls `resume()`).
*   **`playRestOverAlert()`:** becomes a one-line wrapper,
    `playTune('beep', { ringWhenSilent: false })`. Item 9 removes its only
    caller, and the wrapper is deleted at the same time.
*   **Module state:** `playGen`, a counter, and `sessionSwitched`, a flag
    that is true while this module has the session set to `'playback'`.
*   **`playTune(id, { ringWhenSilent, onEnded })`, which returns nothing.**
    An `id` not in `TUNE_IDS` plays `beep` (`tuneIdOrDefault`). Steps, in
    order:
    1.  Call `stopTune({ keepSession: true })`, so the session isn't
        switched back and forth between two tunes. Then
        `const gen = ++playGen`.
    2.  If `ringWhenSilent && 'audioSession' in navigator`, set
        `navigator.audioSession.type = 'playback'` and set
        `sessionSwitched = true`.
    3.  Create the `AudioContext` if there isn't one. If its state is
        `'suspended'` or `'interrupted'`, await `ctx.resume()` with a 1 s
        timeout.
    4.  If `gen !== playGen`, return. `stopTune()` or a newer `playTune()`
        ran during the wait and owns the session now. No sound, and
        `onEnded` is not called.
    5.  If `ctx` is missing or its state isn't `'running'`:
        1.  Restore the session (`'auto'`, if `sessionSwitched`).
        2.  Call `onEnded?.({ audible: false })`.
        3.  Return. No sound or vibration plays.
    6.  Create a master `GainNode` with gain 1, connected to
        `ctx.destination`. Let `t0 = ctx.currentTime + 0.05`.
    7.  **Melodies:** for each note with a non-null `hz`, create an
        oscillator of the tune's `wave` and a gain node:
        *   at `t0 + startS`: gain 0;
        *   20 ms later: a linear ramp up to 0.7;
        *   held at 0.7 until 30 ms before the note ends;
        *   then a linear ramp down to 0 at `t0 + startS + durS`;
        *   the oscillator starts and stops at the note's start and end.
    8.  **Siren:** one oscillator with the same 20 ms attack and a 30 ms
        release at `lengthS`. Its frequency alternates
        `linearRampToValueAtTime` ramps (400 → 1000 Hz over 7 s, then
        1000 → 400 Hz over 7 s) until `lengthS`.
    9.  **Vibration,** one call per tune:
        *   for `beep`, `navigator.vibrate([300, 150, 300, 150, 300])`;
        *   for the longer tunes, `navigator.vibrate` with `[600, 300]`
            repeated 34 times (68 entries, 30.6 s). `end` and `stopTune`
            cancel it with `navigator.vibrate(0)`, so it stops with the
            tune.
    10. Set `setTimeout(end, (lengthS + 0.05) * 1000 + 100)`.
    11. Store the handle: `{ master, oscillators, timeoutId, onEnded }`.
*   **`stopTune({ keepSession = false } = {})`:**
    1.  Increment `playGen`, so a `playTune` still waiting in step 3 gives
        up.
    2.  If a tune is playing:
        1.  Ramp the master gain to 0 over 30 ms, anchored first:
            `cancelScheduledValues(now)`, `setValueAtTime(gain.value, now)`,
            then `linearRampToValueAtTime(0, now + 0.03)`.
        2.  Call `osc.stop(ctx.currentTime + 0.03)` on every oscillator.
        3.  Disconnect after a 40 ms timeout.
        4.  Call `navigator.vibrate(0)`.
        5.  Clear the timeout and drop the handle.
    3.  If `sessionSwitched && !keepSession`, set
        `navigator.audioSession.type = 'auto'` and `sessionSwitched = false`.
        This also runs when nothing is playing yet, so a stop during the
        wait still restores the session.

    Stopping does not call `onEnded`.
*   **`end`:** runs the same cleanup as `stopTune()`, then calls
    `onEnded?.({ audible: true })`. (`onEnded` is optional: the
    `playRestOverAlert` wrapper passes none.)
*   **Error handling:** each browser API call has its own try/catch. Steps 10
    and 11 run even if earlier audio or vibration calls throw.
*   **Header comment:** describe the session switch and the blocked-sound
    path. Remove "the silent switch mutes web audio".

#### 3. `src/config/workouts.js` (Modify)

*   Add `RING_WHEN_SILENT_DEFAULT = true` next to `HOLD_WEEKS_DEFAULT`, with
    a one-line comment.

#### 4. `src/data/preferences.js` (Modify)

*   No change in behaviour.
*   Add a comment to the `REST_MIN_SECONDS`, `REST_MAX_SECONDS` and
    `REST_STEP_SECONDS` constants: `server/src/routes/program.js` checks the
    same limits for each exercise's `restSeconds`, so keep the two in step.

#### 5. `src/program/store.js` (Modify)

*   **Header shape comment:**
    *   exercise `restSeconds?` (null, or 30–600 s in steps of 15);
    *   program `alarmTune` (a tune id);
    *   program `ringWhenSilent` (boolean).
*   **`defaultProgram()`:** add `alarmTune: DEFAULT_TUNE` and
    `ringWhenSilent: RING_WHEN_SILENT_DEFAULT`.
*   **`normalize()`:**
    *   `alarmTune: typeof next.alarmTune === 'string' ? next.alarmTune : DEFAULT_TUNE`
        (any string is kept, so an older app never resets a newer tune;
        `playTune` maps an unknown id to `beep` when it plays)
    *   `ringWhenSilent: typeof next.ringWhenSilent === 'boolean' ? next.ringWhenSilent : RING_WHEN_SILENT_DEFAULT`
    *   The indoor/outdoor copy of an exercise keeps `restSeconds`, because
        it copies every field except `progression`. No change is needed for
        that.
*   **New exports:**
    *   `alarmTune()`
    *   `ringWhenSilent()`
    *   `exerciseRestSeconds(id)`: returns `exerciseById.get(id)?.restSeconds`
        (`exerciseById` holds every exercise, archived ones included)
        when it is a number, otherwise `null`. The store doesn't read the
        phone's global rest length; the caller falls back to it.

#### 6. `src/screens/ExerciseEditScreen.jsx` (Modify)

*   **State:** add
    `const [restSeconds, setRestSeconds] = useState(existing?.restSeconds ?? null)`.
*   **New "Rest" group** after the Sets and step fields. It shows for both
    indoor and outdoor exercises.
    *   It renders `<RestStepper label="Rest" value={restSeconds} onChange={setRestSeconds} emptyLabel={`Default (${formatSeconds(getRestSeconds())})`} />`.
    *   Footer: "Rest between sets of this exercise. Default uses the rest
        length from Settings." When `restSeconds` is set, the footer also
        has a "Use default" link (`type="button"`) that calls
        `setRestSeconds(null)`.
*   **`handleSave`:** always add `restSeconds` (`null` when cleared) to the
    `exercise` object it builds.

#### 7. (Removed)

(Removed. Number kept so references stay valid.)

#### 8. `src/screens/WorkoutScreen.jsx` (Modify)

*   **Imports:** keep `getRestSeconds`. Import `exerciseRestSeconds`.
*   **`handleToggleSet`, after a tick (not an undo).** `nextSet(state)`
    (existing, `session.js`) returns the first undone set of the selected
    exercise in any slot, or `null` when the workout is finished.
    1.  If `!nextSet(after)`: call `rest.skip()`, then the current finish
        branch.
    2.  Otherwise,
        `const nextIndex = after.slots[slotIndex].sets[slot.selected].indexOf(false)`.
    3.  If `nextIndex === -1`:
        1.  Call `rest.skip()`.
        2.  After 250 ms, scroll to the card of `nextSet(after)`.
        3.  Return.
    4.  Otherwise call
        `rest.start(exerciseRestSeconds(slot.selected) ?? getRestSeconds(), { ... })`,
        where the info object is:
        *   `justDone`: the current string, `${name} · Set n of m done`;
        *   `next`: `{ name: exerciseName(slot.selected), set: nextIndex + 1, weight: after.slots[slotIndex].weight[slot.selected] }`.
*   **Comment above the tick logic:** "A tick starts a rest only if that
    exercise has sets left. Completing an exercise or the workout starts
    none, and stops any running rest or tune."
*   **Overlay props:** pass `playing={rest.playing}` and
    `endedAgoMs={rest.endedAgoMs}`.
*   **No other changes:** the existing `rest.skip()` calls in the finish and
    save paths and in the dev `tickAllSets` button (which ticks every set at
    once) stay as they are. They now also stop the tune.

#### 9. `src/hooks/useRestTimer.js` (Modify)

*   **Imports:** replace `playRestOverAlert` with `playTune` and `stopTune`
    from `alert.js`, plus `alarmTune` and `ringWhenSilent`. Keep
    `AUTO_CLOSE_MS` (4000 ms).
*   **Timer shape:**
    `{ endAt, durationMs, info, finished, endedAgoMs, tuneEnded }`.
*   **Finishing:** the tick sets `finished: true` and
    `endedAgoMs: n - t.endAt` (where `n` is the tick's `Date.now()`). It
    uses a functional update that returns the state unchanged if it is
    already finished, so the finish happens only once, even when both the
    interval and `visibilitychange` see the end.
*   **The tick no longer plays the alert;** the alarm effect below does.
*   **Alarm effect,** keyed on `timer?.finished` and `timer?.endAt` (so
    setting `tuneEnded` doesn't play it again):
    1.  If the timer isn't finished, do nothing.
    2.  Set `playing` to true.
    3.  Call `playTune(alarmTune(), { ringWhenSilent: ringWhenSilent(), onEnded })`,
        where `onEnded({ audible })` sets `playing` to false and, only when
        `audible`, calls
        `setTimer((t) => (t && t.endAt === endAt ? { ...t, tuneEnded: true } : t))`.
        When the sound was blocked, `tuneEnded` is never set, so the
        overlay stays until a tap.
    4.  **Cleanup:** `stopTune()` and set `playing` to false. This runs on
        Skip, Stop alarm, a new rest and unmount.
*   **Close effect,** keyed on `timer?.tuneEnded` (replaces the current
    close effect, which is keyed on `finished`): if `document.hidden`, do
    nothing, so "Go!" stays until a tap. Otherwise, after `AUTO_CLOSE_MS`,
    set the timer to `null`. Its cleanup clears the timeout.
*   **Hidden page:** the code doesn't stop or delay the tune when the page
    is hidden. Whether the browser plays it then is recorded in A.12, B.5,
    B.9 and C.4. The existing `visibilitychange` listener only makes the
    tick run at once when the page comes back.
*   **Settings are read when the alarm fires,** so a change saved on the
    same phone applies to the next alarm.
*   **Return value:** add `endedAgoMs` (from the timer, or 0) and
    `playing`.
*   **`start()`:** still calls `unlockAudio()`.

#### 10. (Removed)

(Removed. Number kept so references stay valid.)

#### 11. `src/components/RestTimerOverlay.jsx` (Modify)

*   **New props:** `playing` and `endedAgoMs`.
*   **While finished:**
    *   **Label:** "Rest over". When `endedAgoMs > 5000`, it reads
        "Rest ended m:ss ago".
    *   **Big digits:** still "Go!".
    *   **Main button:** "Stop alarm" when `playing`, otherwise "Back to
        workout". Both call `onSkip`.
    *   **Taps:** a tap anywhere still calls `onSkip`.
*   **Time format:** remove the file's private `formatClock(ms)`. Both the
    countdown and the late label use `formatSeconds(Math.ceil(ms / 1000))`
    from `format.js` (#27).
*   **JSDoc:** document the new props.

#### 12. `src/screens/SettingsScreen.jsx` (Modify)

*   **New `AlarmSetting()` component, for logged-in users.**
    *   **Program data:** read `alarmTune()` and `ringWhenSilent()` through
        `useProgram()`.
    *   **Loading:**
        *   On mount, call `refreshProgram()`, then
            `programLoaded().then(() => setLoaded(true))`.
        *   The tune rows and the On/Off control stay disabled until
            `loaded`: the server copy has arrived, or 3 s have passed.
    *   **Layout:** one `InsetGroup` with the header "Rest alarm", in this
        order:
        1.  One `ListRow` per id in `TUNE_IDS`, with the label as its
            child. Only the row for `tuneIdOrDefault(alarmTune())` gets a
            trailing `<span className="picker-check is-on">` (no empty
            circle on the other rows), so an unknown id shows Beep without
            saving it. Tapping a row: if the id is already selected, do
            nothing; if `testing`, call `stopTune()` and set `testing` to
            false; then `save({ ...getProgram(), alarmTune: id })`.
        2.  A row with `row-title` "Ring even when silent", a
            `row-subtitle` sub-label, and the On/Off control.
        3.  A `ListRow` with `row-action` text: "Test sound", or "Stop"
            while testing.
    *   **Ring even when silent:** an existing `SegmentedControl` with
        the options On (`true`) and Off (`false`).
        *   Label: "Ring even when silent".
        *   Sub-label: "Plays in silent mode on iPhone. Pauses music when
            the alarm plays. Music does not resume by itself."
        *   Choosing an option: if `value === ringWhenSilent()`, do
            nothing (`SegmentedControl` keeps the selected option tappable
            even when disabled); otherwise
            `save({ ...getProgram(), ringWhenSilent: value })`.
    *   **Saving (`save(next)`):**
        1.  If `saving || !loaded`, return at once. This also covers the
            selected `SegmentedControl` option, which stays tappable.
        2.  Set `saving` to true.
        3.  Await `saveProgram`.
        4.  On error, the message replaces the footer text, as in
            `HoldSetting`. The old value comes back automatically, because
            `saveProgram` rolls back on error.
        5.  Set `saving` to false.

        The tune rows and the On/Off control are disabled while `saving`
        or `!loaded`. (`ListRow` already passes `disabled` to its button.)
        Test sound is never disabled: it saves nothing.
    *   **Test sound:** a `testing` state, false at first.
        *   **When not testing:** a tap calls `unlockAudio()`, sets
            `testing` to true, and calls
            `playTune(alarmTune(), { ringWhenSilent: ringWhenSilent(), onEnded: () => setTesting(false) })`.
        *   **While testing:** the button reads "Stop" and calls
            `stopTune()`, then sets `testing` to false.
        *   Picking a tune while it plays stops the test (see the tune
            rows above).
        *   An effect cleanup calls `stopTune()` when Settings is left.
    *   **Footer:** "On iPhone the alarm needs Puntti open on screen. On
        Android it plays at media volume."
*   **Guests:** `SettingsScreen` branches on `user` from `useAuth()`, as
    it does for its other groups. Guests get the same group, with "Log in
    to choose a tune" in place of the tune rows and the On/Off control.
    Test sound is the same control and the same call; a guest's default
    program already gives `beep` and `ringWhenSilent: true`.
*   **Placement:** directly after `<RestTimerSetting />`, in every training
    mode.
*   **`RestTimerSetting`:**
    *   Use `<RestStepper label="Default timer" …>` and `formatSeconds`.
        Keep its own "Reset to 2:00"
        link in the group footer, shown when the value isn't the default.
    *   Change both occurrences of "Starts after each set." (lines 88 and
        91) to "Runs between sets of the same exercise. Exercises can have
        their own rest."
    *   Remove the file's private `formatClock`.

#### 13. `server/src/routes/program.js` (Modify)

*   **Constants:** `REST_MIN = 30`, `REST_MAX = 600`, `REST_STEP = 15`, with
    a comment that they mirror `src/data/preferences.js`.
*   **Exercise mapper:**
    *   `const r = e.restSeconds === null || e.restSeconds === undefined ? null : Number(e.restSeconds);`
    *   `restSeconds` is `r` if `Number.isInteger(r) && r >= REST_MIN && r <= REST_MAX && (r - REST_MIN) % REST_STEP === 0`;
        otherwise it is `null`.
    *   Add `restSeconds` to the returned object.
*   **Top level:**
    *   `alarmTune = typeof body.alarmTune === 'string' && ID.test(body.alarmTune) ? body.alarmTune : 'beep'`
    *   `ringWhenSilent = typeof body.ringWhenSilent === 'boolean' ? body.ringWhenSilent : true`
    *   Add both to the returned object.
*   **No new 400 errors.**

#### 14. `server/src/models/Program.js` (Modify)

*   **Schema:** add `alarmTune: { type: String, default: 'beep' }` and
    `ringWhenSilent: { type: Boolean, default: true }`.
*   **`toJSON`:** add `alarmTune: ret.alarmTune ?? 'beep'` and
    `ringWhenSilent: ret.ringWhenSilent ?? true`.
*   **Header comment:** update the shape description.
*   **No data migration.** Exercises are stored as Mixed, so `restSeconds`
    needs no schema change.

#### 15. `src/utils/README.md` (Modify)

*   Replace the `playRestOverAlert` entry with `playTune` and `stopTune`.
*   Add `tunes.js`.
*   Add `formatSeconds` to the `format.js` entry.
*   Also `src/README.md:35`: the utils entry becomes "alert, tunes,
    formatting, geolocation, plate maths".
*   Replace "the silent switch mutes web audio" with a description of the
    session switch.

#### 16. `src/hooks/README.md` (Modify)

*   Update `useRestTimer`'s return value (`endedAgoMs`, `playing`) and the
    timer shape at line 12 (add `endedAgoMs` and `tuneEnded`).
*   Rewrite the close rule at line 22: the tune plays once per rest; "Go!"
    closes 4 s after an audible tune ends while the page is visible,
    otherwise on a tap; `skip()` closes it at once and stops the tune.
*   Change the Side Effects line (line 30): `useRestTimer` plays the chosen
    tune through `playTune`. Say when it plays, when it stops, and that the
    4 s close starts when the tune ends.

#### 17. `src/workout/README.md` (Modify)

*   No change: the rule "no rest after the tick that completes an
    exercise" lives in `WorkoutScreen` (#8) and is documented in #18.

#### 18. `src/screens/README.md` (Modify)

*   Settings row: the rest alarm group.
*   WorkoutScreen notes: rest within an exercise only, and
    `exerciseRestSeconds(id) ?? getRestSeconds()`.
*   ExerciseEditScreen: the Rest field.
*   File-local helpers list (lines 35–38): remove `formatClock`
    (`SettingsScreen.jsx`) and add `AlarmSetting`.

#### 19. `src/components/README.md` (Modify)

*   `RestTimerOverlay`: add `playing`, `endedAgoMs`, the Stop alarm button
    and the late label.
*   Add `RestStepper`.
*   Remove `formatClock` (`RestTimerOverlay.jsx`) from the file-private
    list; the overlay now uses `formatSeconds`.

#### 20. `src/config/README.md` (Modify)

*   Add `RING_WHEN_SILENT_DEFAULT`.
*   Note that `REST_SECONDS` is the default of the global rest length
    (`getRestSeconds()`), which is used when an exercise has no
    `restSeconds`.

#### 21. `src/data/README.md` (Modify)

*   `getRestSeconds()` is the global rest length, per phone.
*   Per-exercise overrides are in the program, read with
    `exerciseRestSeconds`.

#### 22. `src/program/README.md` (Modify)

*   Program shape line: add exercise `restSeconds?`, `alarmTune`,
    `ringWhenSilent` and `holdWeeks`, which is missing today.
*   List the new getters: `alarmTune()`, `ringWhenSilent()` and
    `exerciseRestSeconds(id)`.

#### 23. `src/data/adapters/README.md` (Modify)

*   Guests: `beep`, with "Ring even when silent" on and no rest overrides.

#### 24. `server/src/routes/README.md` (Modify)

*   `PUT /program`:
    *   an invalid `restSeconds` becomes `null`;
    *   an invalid `alarmTune` becomes `'beep'`;
    *   an invalid `ringWhenSilent` becomes `true`;
    *   there are no new 400 errors.

#### 25. `server/src/models/README.md` (Modify)

*   Add `alarmTune` and `ringWhenSilent`, with their defaults.

#### 26. `src/styles/components.css` (Modify)

*   **Reused, no new CSS:**
    *   `.picker-check.is-on` for the tune rows;
    *   the existing stepper styles for `RestStepper`;
    *   `button-primary rest-btn` for Stop alarm;
    *   `rest-label` for the late label.
*   **New:** `.stepper-value.is-default`, the muted default state of
    `RestStepper`, in `--label-3`. It is built with #28 in step 3.

#### 27. `src/utils/format.js` (Modify)

*   Add `formatSeconds(s)`, which returns `m:ss` for a number of seconds.
    It replaces `SettingsScreen`'s private `formatClock(s)`.

#### 28. `src/components/RestStepper.jsx` (Create)

*   **Signature:** `RestStepper({ label, value, onChange, emptyLabel })`.
*   **Behaviour:**
    *   `value` is a number of seconds, or `null`.
    *   When `null`, the value cell shows `emptyLabel` with
        `.stepper-value.is-default`, no "min" unit, and the `aria-label`
        "`${label}: ${emptyLabel}`". Pressing + or − starts from
        `getRestSeconds()` (imported by the component) and moves one step.
    *   With a value, the cell shows `m:ss` with the "min" unit, as today.
    *   The `aria-label`s use `label`: "`${label}: 15 seconds shorter`",
        "`${label}: 15 seconds longer`" and "`${label} m:ss`".
    *   Values are clamped to `REST_MIN_SECONDS`..`REST_MAX_SECONDS` in
        steps of `REST_STEP_SECONDS`.
    *   + is disabled at the maximum and − at the minimum.
    *   It has no reset link. Each screen puts its own in its group footer.
*   **Buttons:** all are `type="button"`, so the stepper doesn't submit a
    surrounding form.
*   **Markup:** taken from `RestTimerSetting`, with the hard-coded
    "Default timer" text replaced by `label`.

#### 29. (Removed)

(Removed.) `ListRow` already passes extra props such as `disabled` to its
element (commit `f8ac808`). `SegmentedControl` keeps the selected option
enabled on purpose; `AlarmSetting` guards against that tap instead (#12).

### Verification Plan

The author decided against automated tests, so verification is a build plus
manual checks.

*   **Compilation/Build**: `npm run build` passes after every step.
    `npm run server` starts with no errors.
*   **Unit Tests**: none.
*   **Static Analysis & Linting**: none configured. Watch the browser
    console during the checks.
*   **E2E/Integration**: manual, in the order below.

**A. Dev build in a desktop browser, logged in to a test account**

1.  **CUJ 1:** during a rest, tick the last set of an exercise. The overlay
    closes with no sound, no new rest starts, and the screen scrolls to the
    next exercise.
2.  **Out of order:** tick set 3 before set 2 of the same exercise. A rest
    starts, and "Next:" shows set 2 of the same exercise.
3.  **Undo:** undo a set. The timer doesn't change.
4.  **CUJ 2:** set any exercise's rest to 3:00 (for example Bench). A tick
    starts a 3:00 rest. After "Use default", the next rest uses the global
    length.
5.  **CUJ 7:** after "Use default", reload and open the program in another
    browser: the rest is still cleared. Edit the exercise's name: the rest
    is unchanged.
6.  **Invalid rest:**
    1.  Use an account that has saved its program at least once. Open
        devtools. `GET /program` returns `{ program }`; copy the inner
        `program` object.
    2.  Set one exercise's `restSeconds` to 31.
    3.  Send that object as the body of `PUT /program`, with the same
        `Authorization` header.

    Expect 200, and `restSeconds: null` for that exercise in the response.
7.  **Unknown tune:** as in A.6, but set `alarmTune: 'xyz'`. Expect 200,
    with `alarmTune: 'xyz'` in the response. The app plays `beep`.
8.  **CUJ 8:** on a program saved with the server as it was before #13, the
    first load shows `beep`, "Ring even when silent" on, and no overrides.
    The next save keeps all existing data.
9.  **CUJ 6:**
    1.  Pick each tune and press Test sound. Each plays for its
        `lengthS`, and Stop stops it.
    2.  Check by ear that `polka` sounds right. Correct the table in item 1
        if it doesn't.
    3.  Changing the tune during a test stops the test.
    4.  Leaving Settings stops the test.
10. **CUJ 4:** set the rest to 30 s and use −30 s to reach zero.
    1.  The full tune plays.
    2.  Stop alarm stops it.
    3.  Without stopping, "Go!" closes 4 s after the tune ends.
    4.  Tap Stop alarm, then at once tap −30 s on a new rest so it ends
        within 1 s. Only the new rest's tune plays.
11. **Stopping:** while a tune plays, each of these stops it:
    *   ticking the last set of the current exercise;
    *   finishing the workout;
    *   navigating away.

    Hiding the tab does **not** stop it.
12. **Hidden tab:**
    1.  **Plays once:** let a rest end while the tab is hidden, then show
        the tab. The tune plays at most once.
    2.  **Background tab:** start a 30 s rest and switch to another tab. When
        the rest ends, record whether the tune plays. If it does, wait
        until it ends, then come back: "Go!" is still shown and closes on a
        tap.
13. **Guest:** log out.
    *   Settings shows "Log in to choose a tune".
    *   Test sound plays `beep`.
    *   A rest in a workout ends with `beep`.
14. **Tune on another browser:** pick `nokia` in browser 1. Reload browser 2:
    its next alarm plays `nokia`.
15. **Settings loading and saving:**
    1.  Throttle the network in devtools and open Settings. The Rest alarm
        controls stay disabled until the program loads, or for 3 s at most.
    2.  Set the network to offline and change the tune. The error shows,
        and the old tune is selected again.
    3.  During a save, the controls are disabled.
16. **Rest stepper:** in the exercise edit screen:
    *   From "Default (m:ss)", + and − start from the global value.
    *   The stepper stops at 30 and 600.
    *   "Use default" saves `null`.
    *   The stepper shows for both indoor and outdoor exercises.
    *   + and − don't save the form or leave the screen.
17. **`beep` and the close timer:**
    1.  With `beep`, "Go!" closes about 5 s after the rest ends.
    2.  After a tune ends, tap to close, then within 4 s tick the next set.
        The new rest is not closed.
    3.  While a long tune plays, tap Stop alarm and at once tick the next
        set. The new rest runs to its end and plays its own alarm (a late
        `onEnded` from the stopped tune doesn't mark it).

**B. iPhone (iOS 17 or later), as a Safari tab and as a home-screen app**

Test sound runs inside a tap, which lets iOS start audio. A rest that ends
on its own has no tap, so these checks let a real rest reach zero (or use
−30 s to get there).

1.  **CUJ 3:** silent mode, "Ring even when silent" on, Spotify playing.
    *   **Pass:** the tune is audible and Spotify pauses.
    *   **Record:** whether Spotify resumes by itself (expected: no). If it
        does, drop "Music does not resume by itself" from the Settings
        sub-label.
2.  **Setting off:** silent mode, "Ring even when silent" off. The alarm is
    silent. This is expected; see Goals.
3.  **Not in silent mode:** the tune plays with the setting on and with it
    off.
4.  **Ticking with music:** with Spotify playing and the setting on,
    ticking a set does not pause the music. Only the alarm does.
5.  **CUJ 5:** lock the phone during a rest, and unlock it after the rest
    has ended.
    *   **Pass:** "Rest ended m:ss ago" shows, and either the tune plays or
        there is no sound and the overlay stays until a tap.
    *   **Record:** which of the two happened.
6.  **Bluetooth headphones:** the tune plays through them.
7.  **Stop:** Stop alarm stops the sound at once, with no tail or click.
8.  **Headphones in silent mode:** silent mode, "Ring even when silent"
    off, Bluetooth headphones, Spotify playing. Record whether the alarm is
    heard and whether the music keeps playing. If both happen, change the
    setting's help text to say "Turn off if you use headphones".
9.  **Hidden mid-tune:** with "Ring even when silent" on and Spotify
    paused by a `nokia` alarm, lock the phone 5 s into the tune, then
    unlock after 40 s. Record what you heard while locked, and whether
    Spotify can play again right after you return.

**C. Android Chrome**

1.  A rest ends:
    *   the tune plays at media volume;
    *   the phone vibrates until the tune ends (about 27–30 s).
2.  Stop alarm stops both the sound and the vibration.
3.  With media volume at 0: no sound, but the phone still vibrates.
4.  **Background:** start a rest, then open another app with the screen
    on. Record whether the tune plays when the rest ends, and whether the
    phone vibrates (expected: no). If the tune doesn't play, the late alarm
    on return is the expected fallback.

**Failure rule.** If B.1 fails, don't release. Reopen the audio design:
try Alternative N first, then Alternative A (see Risks & Mitigations).

--------------------------------------------------------------------------------

*Drafted with EGM*
