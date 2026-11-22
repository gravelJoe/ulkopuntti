# Weekly Progression for Indoor Exercises

*   **Author:** Pille
*   **Status:** Approved
*   **Date:** 2026-11-21

--------------------------------------------------------------------------------

## Overview

Puntti is a workout log for two people who train at outdoor and indoor gyms.
For indoor exercises (barbell and machine) the app already knows each gym's
plates and bars. It also fills in the last weight used at that gym.

This feature adds **weekly linear progression** to every indoor exercise. You
set how much the weight should go up each week per exercise (default +1 kg).
After each exercise you mark the result as **Go up**, **Repeat** or **Go
down**. Next week the app fills in the new weight for you:

*   **Go up:** up by at least the increase.
*   **Repeat:** the same weight.
*   **Go down:** down to the heaviest loadable weight at least 1 kg lower (for
    example 60 → 57.5 kg with 1.25 kg plates), then held there for a set number
    of weeks (default 1).

When the gym's plates and bars are known, or the exercise is a machine, the
weight is rounded to one the gym can load.

## The Problem

Both users follow a beginner plan on compound lifts such as squats, bench
presses, rows and overhead presses: about +1 kg a week, with a step back after
a bad session.

Today both users track this in their heads. At the start of each exercise they
have to remember:

*   what they lifted last time;
*   whether it went well;
*   whether they are in a "step back" period after a failure;
*   what the next weight should be;
*   whether this gym's plates can even make that weight.

The app helps with parts of the first and last points. It fills in the last
weight used at the current gym, and the barbell helper shows how to load a
weight from the gym's plates. It knows nothing about how the session went, so
it can't say "go up", "stay" or "back off". It also can't account for a plan
that should follow the user from gym to gym.

The proposed solution is for the app to keep track of the rule for them. You
record one result per exercise. The app works out next week's weight from your
saved workouts and the gym's equipment. It shows you why the weight changed,
and you can always change it by hand.

## Goals

*   **Per-exercise increase.** Every indoor exercise, barbell or machine,
    always uses weekly progression, with an increase you set per exercise
    (default 1 kg, for example 0.5 kg). There is no on/off switch.
*   **One result per exercise.** During a workout, each indoor exercise is
    marked **Go up**, **Repeat** or **Go down**. Ticking the exercise's last set
    selects Go up if nothing is selected yet; you can change it.
*   **Weekly rule.** The result of the most recent session of a week (Monday to
    Sunday, phone's local time) decides next week's weight:
    *   **Go up:** the smallest weight the current gym can load that is at
        least *weight + increase*.
    *   **Repeat:** the same base, rounded to the nearest loadable weight.
    *   **Go down:** the Fail step defined in
        [Rounding for the gym](#rounding-for-the-gym-new-pure-helpers). The
        weight is then **held** for the **Hold after a fail** number of weeks
        (`holdWeeks`), one setting for all exercises, synced with the account.
*   **Hold rules.**
    *   The first week trained at the lowered weight is hold week 1.
    *   Only weeks in which you trained that exercise count toward the hold.
    *   A Go up or Repeat during a hold does not change the weight.
    *   A Go down during a hold goes down again and starts the hold over.
    *   Editing the weight (by hand or in Settings) does not cancel a hold.
*   **Same week, same base.** Another session of the same exercise in one week
    starts from the most recent session that week, including any hand-edit.
*   **Weeks without the exercise change nothing.** Skipping the gym for three
    weeks does not add 3 kg.
*   **Rounding to the gym's equipment.** The weight is rounded using the
    current gym's plates and chosen bar, or the machine's weight step. If
    rounding would cancel an increase, the next heavier loadable weight is
    used. Edge cases:
    *   No heavier weight is loadable: keep the current weight (no hold starts)
        and show "Can't load more here".
    *   Below the bar: use the bar weight.
    *   The gym has no plates or no bars, or the workout has no gym: no
        rounding.
    *   The bar is changed mid-workout: the weight is re-rounded for the new
        bar, as long as no set of that exercise is ticked yet.
*   **One plan across gyms.** Progression follows the exercise, not the gym.
    Outdoor exercises keep today's weight memory.
*   **Hand-edits become the plan.** If you change the weight during the
    workout, the saved weight is what next week builds on.
*   **Settings visibility and control.** Settings shows each indoor exercise's
    planned weight and hold status, and lets you change the planned weight.
*   **Explain every change.** The exercise card shows why the weight is what it
    is, for example "Plan 41 kg → 42.5 kg here · Went up last time" or
    "Hold 1 of 2".
*   **Indoor workouts save only when you press Save.** Ticking the last set no
    longer saves and leaves the workout, so the last exercise can still be
    marked. Outdoor workouts keep today's auto-save.

## Non-Goals

*   **Outdoor exercises.** No progression; outdoor behaviour stays as it is.
*   **Guests.** Guests save nothing, so they get no progression, no result
    buttons and no history cache; their indoor workouts keep auto-saving.
*   **Per-set or per-rep results.** No rep counts, no effort scores, no result
    per set; one result per exercise.
*   **Percentage-based increases** (for example +2.5%). Fixed kilograms only.
*   **Automatic deloads after several fails** beyond the single Go down rule.
*   **Server-side scheduled jobs.** Nothing runs on the server at the start of
    a week.
*   **Modelling each gym's machine weight stacks.** Machines round by the
    exercise's step only.
*   **Changing how outdoor weights are pre-filled.**

## Resolved Decisions

Decisions made during drafting that are not obvious from the Goals:

*   A Go down with zero sets ticked is saved, so a "couldn't lift it once" week
    is not lost.
*   Machines round to multiples of the exercise's step from 0 kg.
*   Hold length: 0 = no hold; default 1; upper limit `Number.MAX_SAFE_INTEGER`.
*   The starting weight is the latest indoor weight for the exercise at any
    gym.

## Critical User Journeys (CUJs)

### CUJ 1: A Go up week raises the weight

*   **Given**: Bench press (indoor) has a +1 kg increase. Last week's only
    session was 40 kg and marked Go up. The current gym has 1.25 kg as its
    smallest plate and a 20 kg bar.
*   **When**: You start the next bench press workout at that gym.
*   **Then**: The weight is filled in as 42.5 kg, the smallest loadable weight
    of at least 41 kg. The card says "Plan 41 kg → 42.5 kg here · Went up last
    time".

### CUJ 2: A Go down week steps back and holds

*   **Given**: Squat with a +1 kg increase, hold length 2 weeks, at a gym whose
    smallest plate is 1.25 kg with a 20 kg bar. This week's last squat session
    was 60 kg and marked Go down.
*   **When**: You train squats in each of the next three weeks and mark every
    session Go up.
*   **Then**:

| Week | Weight trained | Result marked | Card label | Effect on next week |
| --- | --- | --- | --- | --- |
| 1 | 57.5 kg (heaviest loadable ≤ 59) | Go up | Hold 1 of 2 | ignored: still holding |
| 2 | 57.5 kg | Go up | Hold 2 of 2 | last hold week, so it counts: go up |
| 3 | 60 kg (smallest loadable ≥ 58.5) | Go up | Went up last time | go up |

### CUJ 3: Marking the last exercise and saving

*   **Given**: An indoor workout with three exercises.
*   **When**: You tick every set of the last exercise.
*   **Then**: The workout stays open and that exercise shows Go up selected. You
    change it if needed and press **Save workout**. Only then is it saved, and
    the app returns Home with the "saved" banner.

### CUJ 4: Training at a different gym

*   **Given**: Deadlift was 80 kg in last week's session at Gym A, marked
    Go up. Gym B has only 2.5 kg as its smallest plate.
*   **When**: You start a deadlift workout at Gym B.
*   **Then**: The weight is the smallest weight Gym B can load of at least
    81 kg, which is 85 kg. The plan comes from the shared history, not from
    Gym B's last weight. If you save 85 kg as Go up, next week at Gym A starts
    from 85 kg (see Risks: rounding carries over).

### CUJ 5: Changing the weight by hand

*   **Given**: Today's planned row weight is 50 kg.
*   **When**: You change it to 47.5 kg on the day and mark it Go up.
*   **Then**: Next week builds on 47.5 kg, not 50 kg. If you train rows again
    the same week, that session also starts from 47.5 kg.

### CUJ 6: Seeing an exercise's progress and changing the plan

*   **Given**: You have several indoor exercises.
*   **When**: You open History → By exercise (or Progress on Home) and tap an
    exercise.
*   **Then**:
    *   You see "Next time": the weight you'll load, with its status
        ("Hold 1 of 2" or "Normal") and the reason.
    *   Below it are the weekly rows: weight, sets, result and hold label.
    *   You can change the planned weight; a running hold stays in place.

## Technical Plan (Architecture)

### Decision: the plan is worked out from history

**Decided by the author:** the progression plan is not stored. Each time a
workout starts, the app works it out again from the saved workouts. Only the
user's own choices are stored:

*   the increase, per indoor exercise;
*   one hold length;
*   one anchor per exercise, replaced by each Settings edit of the planned
    weight.

Why this works here:

*   No stored plan state can go out of date.
*   Deleting a workout, or changing a result in History, corrects the plan the
    next time it is worked out.
*   Given the same saved history, settings and time zone, both phones work out
    the same plan. The exceptions are listed under
    [Risks & Mitigations](#risks--mitigations).
*   Nothing has to run at the start of a week.

The accepted cost is that settings changes apply to history already saved:

*   **A new increase** changes only the size of the next Go up step; weights
    already saved stay as they are.
*   **A different hold length** is applied to a hold already running. A smaller
    value can end it at once: going from 2 to 1 turns the latest Go up into a
    rise next week. A larger value makes a running hold last longer.

### Data flow

```text
 Saved workouts (server, newest first)          Program (server)
 ─ exercises[]: weight, sets, bar, outcome      ─ exercise.progression:
        │                                           increase, anchor?
        │  getSessionHistory() — one call when  ─ holdWeeks
        │  a workout starts; NEW cache on the            │
        │  phone for offline use                         │
        ▼                                                │
 ┌────────────────────────────────────┐                  │
 │ planFor(exerciseId, settings,      │◄─────────────────┘
 │         history, now)              │
 │ (pure: no network, no storage)     │
 │ → { base, action: up|same|down,    │
 │     holdWeek, holdWeeks, reason }  │
 └────────────────┬───────────────────┘
                  ▼
 ┌────────────────────────────────────┐   gym plates + chosen bar,
 │ round for this gym                 │◄─ or the machine's step
 │ up   → smallest loadable ≥ base+inc│
 │ same → nearest loadable to base    │
 │ down → Fail step (see Rounding)    │
 └────────────────┬───────────────────┘
                  ▼
   createSession(): weight filled in, card shows the reason
                  ▼
   you train, mark Go up / Repeat / Go down, press Save workout
                  ▼
   POST /api/workouts — saves weight, sets, bar and outcome
```

### Concepts

**Progression exercise.** Any active (not archived) indoor exercise, barbell
or machine. All of them use progression; there is no on/off switch. Outdoor
exercises never do.

**Results: names used in this document.**

| Button (UI) | Stored `outcome` | `planFor` action |
| --- | --- | --- |
| Go up | `success` | `up` |
| Repeat | `neutral` | `same` |
| Go down | `fail` | `down` |

During a hold, the action can be `same` whatever the button was.

**Week.** From Monday 00:00 up to the next Monday 00:00, in the phone's local
time. A workout belongs to the week of its finish time (`finishedAt`). Each
week is identified by its Monday's local date (`YYYY-MM-DD`), so weeks can be
compared and sorted without ISO week-year rules.

**Deciding session.** For each exercise and each week, the workout of that
week with the latest `finishedAt` that contains the exercise with a result.
Its saved **weight** is the base for the next week, and its **outcome** decides
the step. Hand-edits are covered by this rule without any extra tracking: what
you saved is what next week builds on.

**Planned weight.** The weight `planFor` gives before gym rounding: the base
after applying the action (for example base 40 + Go up 1 kg = 41 kg planned).
This is what an anchor sets (History → By exercise → Change planned weight).

**Outcome.** Each saved indoor exercise stores `outcome`. The saved result is
always the button left selected:

| Sets ticked | Button pressed | Saved as |
| --- | --- | --- |
| All | none (Go up auto-selected when the last set is ticked) | Go up (`success`) |
| One or more | any button | that button |
| Some | none | Save asks you to choose first |
| None | any button | that button, with all sets false |
| None | none | not saved: not trained |

When reading history, an indoor exercise saved without an `outcome` (for
example by an older version of the app) counts as not trained.

**Which workouts count.** For the weekly rule, only indoor workouts whose
exercise has a saved `outcome`. Workouts saved before this feature have none,
so the weekly rule does not replay them; they are used only to pick the
starting weight. No start date needs to be stored.

### The weekly rule (inside `planFor`)

`planFor` checks these rules in order and uses the first that applies:

1.  **Settings edit (anchor).** If the planned weight was edited in Settings
    after the latest counted session, the next workout uses that weight,
    rounded for the gym (action `same`, reason "Set in Settings"). The hold
    status is kept. Once a workout is saved after the edit, its saved weight
    takes over again.
2.  **Current week.** If the exercise was already trained this week, another
    session this week starts from the most recent one (action `same`). The rule
    only moves the weight across week boundaries.
3.  **Nothing counted yet.** If the exercise has no counted workouts (a new
    exercise, or right after this feature ships), `base` is the most recent
    indoor weight for that exercise at any gym, and the action is `same`. With
    no indoor history at all, it starts at the app's default starting weight
    (20 kg).
4.  **Weekly replay.** Otherwise, `planFor` replays the counted weeks in order,
    oldest first, keeping two values:
    *   `base`: the weight next week starts from;
    *   `hold`: the current hold week, `0` when not holding.

    For each week in which the exercise was trained, using its deciding
    session:

    1.  `base` becomes the deciding session's saved weight.
    2.  The week's result is applied:
        *   **Not holding** (`hold = 0`):
            *   Go up → action `up`.
            *   Repeat → `same`.
            *   Go down → `down`, and the next week trained is hold week 1 (no
                hold when the hold length is 0).
        *   **Holding, not the last hold week** (`hold < holdWeeks`):
            *   Go down → `down`, and the hold starts over at week 1.
            *   Go up or Repeat → `same`, and `hold` moves on by one.
        *   **Last hold week** (`hold = holdWeeks`): the hold ends. This week's
            result is applied as when not holding, so a Go up goes up next
            week. This matches CUJ 2.

    Weeks in which the exercise was not trained are skipped. They neither raise
    the weight nor count toward a hold.

`planFor` also returns a short `reason` for the card. The card line always has
the form "Plan *planned* → *rounded* here · *reason*", with reasons such as
"Went up last time", "Repeated last time", "Went down last time",
"Hold 1 of 2", "Same week as Mon", "Set in Settings" or "Starting weight"
("last time" rather than "last week", so it stays true after a skipped week).

### Rounding for the gym (new pure helpers)

The next weight is worked out without reference to any gym, then rounded for
the gym chosen for that workout and the bar picked for the exercise. Rounding
is not stored separately: the weight saved with the workout, rounded or
hand-edited, becomes next week's base (see Risks: rounding carries over).

*   **Barbell:** total = bar + 2 × (plates per side), using the gym's plate
    list (or your own plates, the user's personal plate set used at gyms set
    to "My own plates"). Built on the existing `solvePlates`
    ([src/utils/README.md](../../src/utils/README.md)), which is unchanged.
    New loadable-weight helpers next to it answer three questions: the
    smallest loadable weight at or above a value, the largest at or below it,
    and the nearest one (on a tie, the lower). Names and signatures are in the
    Detailed plan, item 2.
*   **Machine:** loadable weights are multiples of the exercise's step,
    starting from 0 kg (a 5 kg step gives 40, 45, 50). Machines always round
    by step; the plate and bar rules below apply to barbells only.
*   **Fail step** (the one full statement of the Go down rule): the new weight
    is, in order of preference:
    1.  the largest loadable weight ≤ base − 1 kg; else
    2.  the largest loadable weight below base (≤ base − 0.05 kg); else
    3.  base.

    It is never below the bar (if a hand-edited base is below the bar, the bar
    weight is used) and never above base. The step is always 1 kg, whatever the increase.
*   **Exact weight loadable:** it is used as is.
*   **Barbell fallbacks (approved by the author):**
    *   Nothing heavier loadable: keep the current weight (no hold starts) and
        show "Can't load more here".
    *   Below the bar: use the bar weight.
    *   Gym has no plates or no bars, or the workout has no gym: no rounding;
        use the planned weight.
    *   Bar changed during the workout: the weight is rounded again for the new
        bar, as long as no set of that exercise is ticked yet.
    *   Gym changed before the first set: all exercises are rounded again for
        the new gym.

### Recording the outcome in the workout

*   **New state.** The in-progress workout holds, per exercise, a `plan` (the
    `planFor` result plus rounding notes) and an `outcome`, set by a new
    `setOutcome` reducer action. A draft saved by the current version (stored
    under `puntti.draft.v2`) has neither field and stays valid: it shows no
    plan line, but the result control is still shown, so its result is still
    saved. Because the fields are optional and additive, the draft key is not
    bumped.
*   **Card.** Each indoor exercise's card gets a three-way control,
    **Go up / Repeat / Go down**. It can be used at any time during the
    workout. Ticking the exercise's last set selects Go up if nothing is
    selected yet. The card also shows the plan line, for example
    "Plan 61 kg → 62.5 kg here · Went up last time".
*   **No auto-save indoors.** Ticking the last set of an indoor workout no
    longer saves it and returns Home. The rest timer is skipped. The workout
    stays open with a highlighted **Save workout** button. Outdoor workouts
    keep today's auto-save.
*   **Saving.**
    *   Pressing Save workout first checks results: if an indoor exercise has
        some sets ticked and no button selected, a dialog asks you to choose.
        The existing "sets left" confirmation follows.
    *   `toSavedSession` adds `outcome` to each indoor exercise that has one.
        An exercise with zero sets ticked and a button selected is kept, with
        all sets false.
    *   After saving, the workout is marked finished for today
        (`markFinishedToday`), and the app returns Home with the "saved"
        banner.
    *   Weight memory (`getLastWeights`) skips exercises with zero sets ticked,
        so a zero-set result is not used as remembered weight.
*   **Unsaved workout reminder.** When a draft exists whose sets are all
    ticked, Home shows "Unsaved workout: Save now", which opens it.
*   **Editing later.** On a workout's detail screen in History, the result of
    each indoor exercise can be changed. The app re-sends the stored workout
    unchanged (`id`, `startedAt`, `finishedAt`, `place`, `gymId`, weights,
    sets, bars), with only `outcome` changed. It does not go through
    `toSavedSession`, so the finish time and week stay the same. The server
    updates the existing workout with the same id. The next workout then works
    out the plan from the corrected history.

### Settings

*   **Exercise editor (indoor only).** An **Increase per week** field (kg,
    default 1 kg). There is no on/off switch.
    *   Below the field, the real next jump at each of your gyms is shown,
        worked out with the same rounding as the workout, from the exercise's
        current planned weight. For example "+1 kg → +2.5 kg at Gym A".
*   **Settings screen.** A **Hold after a fail** setting in whole weeks
    (0 = no hold, default 1), saved in the program so both phones share it.
*   **History → By exercise** (a switch on the History screen; also reached
    from **Progress** on Home when training indoors). It lists the active
    indoor exercises with their latest weight and result.
*   **Exercise detail:**
    *   **"Next time":** worked out exactly like the workout card, for the
        gym and bar used last time.
    *   **Change planned weight:** replaces the exercise's single `anchor`
        (`weight`, time) in its progression settings. It does not cancel a
        running hold.
    *   **Weekly rows** follow.

    (Changed after approval: this replaces the separate Progression screen,
    which showed only an unrounded number with no history.)

### Server changes

The models and routes are described in
[server/src/models/README.md](../../server/src/models/README.md) and
[server/src/routes/README.md](../../server/src/routes/README.md).

*   **Saved workouts:** each exercise can carry an optional result. Today the
    server copies only known fields, so the field must be added to the model
    and the save route.
*   **Program:** each indoor exercise can carry its progression settings (the
    increase and an optional anchor), and the program gets the hold length.
    Both are validated on save and dropped for outdoor exercises. Bounds and
    field names are in the Detailed plan, items 16–17.
*   **Rollout step:** the server and the app it serves deploy together
    (Express serves the built app). After deploying, reload the app on both
    phones. A phone still running the old app would drop the new settings on
    its next program save, and saves no results; see Risks.

### Offline

The plan needs the workout history. When a workout starts, one history call
loads it and refreshes a **new** history cache on the phone, kept per account.
It holds trimmed sessions for both outdoor and indoor workouts. The remembered
weights (today a separate cache of last weights) are worked out from this same
history, so the old last-weights cache is retired and the same data is not
cached twice.

*   **Offline with a cache:** the plan and the remembered weights are worked
    out from the cached history, and the card says "Plan from saved history
    (offline)".
*   **Offline with no cache** (first offline use after the update):
    progression is skipped for that workout, weights start at
    `DEFAULT_WEIGHT` as they do today without a cache, and the card says "No
    plan offline". The workout is still saved with its results.

A workout that failed to save and exists only as a draft is not part of the
history until it is saved. The existing caches are described in
[src/data/README.md](../../src/data/README.md).

## Alternatives Considered

### Alternative A: Store the plan in the program settings

Keep `plannedWeight`, `holdWeeksLeft` and `lastWeekCounted` per exercise in
the program document, and update them whenever a workout is saved.

*   **Pros**:
    *   The easiest model to understand and debug.
    *   Settings can show the stored values directly.
    *   No history replay.
*   **Cons**:
    *   The program is saved as one whole document; the last save wins, and a
        failed save is undone. A save made offline at the gym is rolled back,
        and a save from one phone can overwrite the other's changes.
    *   Deleting a workout or correcting its result does not undo its effect.
    *   Weeks without a workout need extra catch-up code, and nothing runs at
        week change to do it.
*   **Reason for Rejection**: Rejected by author: the whole-document,
    last-save-wins program storage makes a frequently updated plan unreliable,
    and history edits would not flow through.

### Alternative B: Store a plan snapshot in each saved workout

Each saved workout also stores, per indoor exercise, the resulting plan (next
weight, hold left, week). The next workout reads the latest snapshot and
applies this week's rule.

*   **Pros**:
    *   Simple to read.
    *   The program document is not touched by workouts.
    *   Deleting the latest workout falls back to the previous snapshot.
    *   Settings changes only affect future workouts.
*   **Cons**:
    *   Snapshots are fixed once saved. Editing an older workout's result does
        not correct the snapshots saved after it.
    *   Workouts saved out of order (one phone offline) produce snapshots built
        on old information.
*   **Reason for Rejection**: Rejected by author in favour of working the plan
    out from history. The later snapshots could not be corrected after a
    History edit or an out-of-order save.

### Alternative C: Separate progression collection on the server

A new `Progression` model, with one document per user and exercise, updated
through its own endpoint with version checks to avoid overwrites.

*   **Pros**: Avoids the whole-program overwrite problem while still storing
    the plan, which is easy to inspect.
*   **Cons**: A new model, route, validation and conflict handling. It still
    does not flow through History edits and still needs week catch-up.
*   **Reason for Rejection**: Rejected by author: too much new server
    machinery for two users when the plan can be worked out from data that is
    already saved.

### Alternative D: Suggest only

Keep today's pre-filled weight. The card only suggests: "Last week ✓, try
42.5 kg", with a tap to apply.

*   **Pros**:
    *   The smallest change and the lowest risk.
    *   Tests the rules before they are automated.
    *   Easy to upgrade later.
*   **Cons**:
    *   One extra tap per exercise per workout.
    *   It does not remove the job of tracking it in your head; you still
        decide each time.
*   **Reason for Rejection**: Rejected by author: the goal is for the app to
    set the weight automatically, with control through editing rather than
    through extra taps. It stays a fallback if the automatic version proves
    confusing.

### Alternative E: Fully worked out from history, with no Settings editor

The same approach as the chosen design, but without the planned-weight
editor or anchors. The only override is changing the weight on the day.

*   **Pros**: The smallest stored footprint, nothing to keep in sync, and one
    less screen.
*   **Cons**: There is no way to correct the plan without doing a workout, for
    example after a long break or an injury.
*   **Reason for Rejection**: Rejected by author: without an editor, the plan
    can only be corrected by training, which doesn't help after a break or an
    injury. The cost of the editor is one screen and an anchor field.

### Alternative F: Grow an unrounded target and load the nearest weight below

The plan rises by exactly the increase each Go up week (61, 62, 63 kg). Each
workout loads the largest weight at or below the plan that the gym can make
(60, 60, 62.5 kg).

*   **Pros**:
    *   Over time the weight rises at exactly the speed you set, even at gyms
        with coarse plates.
    *   +1 kg and +0.5 kg settings mean something on barbells.
*   **Cons**:
    *   Some weeks after a Go up show no change, which can look like a bug.
    *   It needs a stored or replayed "unrounded target" separate from the
        saved weight.
*   **Reason for Rejection**: Rejected by author: weeks with no visible change
    after a Go up read as a bug, and F needs a second, unrounded value replayed
    alongside the saved weight. The chosen rule always moves after a Go up, at
    the cost of coarse jumps, which the exercise editor shows ("+1 kg → +2.5 kg
    at Gym A").

## Risks & Mitigations

| Risk | What happens | Mitigation or acceptance |
| --- | --- | --- |
| Offline with no history cache | No plan can be worked out. | Weights start at the default starting weight and the card shows "No plan offline"; the workout is still saved with its results. |
| History edit changes the week | Re-saving through `toSavedSession` would re-stamp `finishedAt`. | History edits re-send the stored workout with only `outcome` changed. |
| Forgot to press Save | The workout is missing from history, Home may auto-open it again, and the draft lingers. | Home shows "Unsaved workout: Save now" for a fully ticked draft. |
| Rounding carries over between gyms | 80 kg + Go up at Gym B (2.5 kg plates) saves 85; next week at Gym A (1.25 kg plates) starts from 85 → 87.5, not 81 → 82.5. Each visit to a coarse gym can add up to one coarse step. | Accepted: it follows from the author's round-up rule. Correct it with a Settings edit of the planned weight. |
| Phone still running the old app | It sends programs without the new settings (dropping them) and workouts without results. | Rollout step: reload the app on both phones after deploying. A week saved by the old app counts as not trained. |
| Anchor storage and phone clocks | The anchor lives in the last-save-wins program document. Its time comes from one phone's clock, compared with workout times from another phone. | Accepted: rare for two users. Editing again fixes it. |
| Settings changes apply retroactively | A new increase changes the next Go up step. A smaller hold length can end a running hold at once; a larger one extends it. | Accepted: a consequence of working the plan out from history. |
| An anchor comes back | An anchor stops applying once a later workout is saved. If that later workout is deleted, the anchor applies again. | Accepted: rare; editing the planned weight again fixes it. |
| A draft whose save failed | It is not part of the history, so the next session that week starts from older data. | Accepted: the Home banner prompts to save it. |
| Time zones and travel | Week boundaries follow each phone's local time, so a workout near midnight can fall in a different week. | Accepted. |
| 1000-workout history cap | Beyond 1000 saved workouts, the replay starts from the oldest loaded workout. | Accepted: years of training for two users. |

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security & privacy:** no new data types beyond a result per exercise and
    progression settings. Everything is scoped to the logged-in user like
    today. Guests get no progression.
*   **Performance:** `planFor` replays at most the indoor workouts that have a
    saved result. They come from the one history request made when a workout
    starts (the server returns at most 1000 workouts). That is at most
    1000 workouts × 20 exercises scanned per indoor exercise in the workout,
    well under a million simple steps, done once when the workout starts.
    There are no extra calls when starting a workout. History → By exercise,
    the exercise detail and the exercise editor each make one history call
    when opened.
*   **Rollout & rollback:**
    *   The server and the app it serves deploy together (Express serves the
        built app). After deploying, reload the app on both phones; see Risks.
    *   All new fields are optional and additive; older workouts and programs
        stay valid.
    *   Rolling back the server would drop the increases, anchors and
        `holdWeeks` on the next program save. They must then be entered again.
        The saved `outcome` values in workouts stay in the database.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

The work is split into seven phases. Each phase ends with `npm run build`
passing and its own checks, so the app keeps working between phases and each
step can be checked in dev.

**Terms used below:**

*   A **progression exercise** is an indoor exercise in an indoor session of a
    logged-in user (`state.place === 'indoor'` and `!isGuest()`). Guests and
    outdoor sessions never get plans, result controls or the history cache.
*   Results are written as the button followed by the stored value, for
    example Go up (`success`). "Fail step" means only the rounding rule for
    Go down.

### Phase 1: Server fields and validation

#### 1. `server/src/models/Workout.js` (Modify)

*   **Type / Scope**: Mongoose schema.
*   **Proposed Changes**: Add `outcome: { type: String, enum: ['success',
    'neutral', 'fail'] }` (optional) to the exercise subdocument. `toJSON`
    returns it.

#### 2. `server/src/routes/workouts.js` (Modify)

*   **Type / Scope**: Express route.
*   **Proposed Changes**: In `POST /`, copy `outcome` into each exercise only
    when it is one of the three values. Invalid values are dropped silently.

#### 3. `server/src/models/Program.js` (Modify)

*   **Type / Scope**: Mongoose schema.
*   **Proposed Changes**: Add `holdWeeks: { type: Number, default: 1 }`.
    `toJSON` returns `holdWeeks ?? 1`.

#### 4. `server/src/routes/program.js` (Modify)

*   **Type / Scope**: Validation (`clean()`).
*   **Proposed Changes**:
    *   **Per exercise:** if `e.progression` is present and the exercise is
        indoor, validate and keep it:
        *   `increase`: required. Checked with the existing `isPlateWeight`
            (greater than 0, at most 50, a multiple of 0.05). Otherwise 400
            "Increase must be 0.05–50 kg".
        *   `anchor` (optional): `weight` must be a number from 0 to 999.
            `at` must parse as a date and is stored as
            `new Date(at).toISOString()`. Otherwise 400 "Invalid planned
            weight".
    *   `progression` on outdoor exercises is dropped.
    *   **Top level:** `holdWeeks` must be an integer from 0 to
        `Number.MAX_SAFE_INTEGER`, otherwise 400 "Hold must be a whole number
        of weeks". A missing value becomes 1.
    *   Return `holdWeeks` with the other top-level keys (`exercises`,
        `workouts`, `gyms`, `ownPlates`, `trainingMode`).
    *   There is no merge with the stored program. Old phones are handled by
        the rollout step: reload both phones after deploying.

**Phase 1 checks:** start a throwaway server with
`MONGODB_URI=mongodb://127.0.0.1/puntti_test PORT=4099 JWT_SECRET=test npm run
dev --prefix server`. Log in as `dev` / `devpassword` (created outside
production) to get a token. Then check:

*   `POST /api/workouts` with `outcome: 'fail'` stores it; `outcome: 'x'` is
    dropped.
*   `PUT /api/program` keeps an indoor `progression` with
    `{ increase: 1, anchor: { weight: 55, at: <ISO> } }` and drops it on an
    outdoor exercise.
*   `increase: 0.03` gives 400 "Increase must be 0.05–50 kg".
*   `holdWeeks: 1.5` gives 400 "Hold must be a whole number of weeks".
*   A missing `holdWeeks` is saved as 1.

Drop `puntti_test` afterwards.

### Phase 2: Pure helpers and constants

#### 5. `src/config/workouts.js` (Modify)

*   **Type / Scope**: Constants.
*   **Proposed Changes**: Add `HOLD_WEEKS_DEFAULT = 1` and
    `INCREASE_DEFAULT = 1`. The store and the screens use them. The server
    hard-codes 1, as it does for its other defaults.

#### 6. `src/utils/plates.js` (Modify)

*   **Type / Scope**: Pure helpers next to `solvePlates`, which is unchanged.
*   **Proposed Changes**:
    *   **`ctx`** (the rounding context) is either
        `{ kind: 'barbell', bar, plates }` (`bar` is a weight in kg) or
        `{ kind: 'machine', step }`.
    *   **`isUsableCtx(ctx)`:** true for a barbell with a bar weight and at
        least one plate with `pairs > 0`, or a machine with `step > 0`.
    *   **The three helpers below** are only called with a usable ctx. Each
        returns a weight, or `null` when nothing is loadable in that
        direction. Results are rounded to 0.01 kg.
        *   **`loadableAtLeast(kg, ctx)`:** barbell → `kg` if
            `solvePlates(kg).exact`, else `.higher`. Below the bar, it returns
            the bar weight. Machine → `ceil(kg / step) · step`.
        *   **`loadableAtMost(kg, ctx)`:** barbell → `kg` if exact, else
            `.lower`. Below the bar, it returns `null`. Machine →
            `floor(kg / step) · step`, or `null` if that is below 0.
        *   **`loadableNearest(kg, ctx)`:** the closer of the AtMost and
            AtLeast results. On a tie it takes the lower one. If one side is
            `null`, it takes the other.

#### 7. `src/workout/progression.js` (Create)

*   **Type / Scope**: Pure JavaScript module: no network, no storage, no React.
*   **Proposed Changes**:
    *   **`weekKey(date) → 'YYYY-MM-DD'`:** the local date of the Monday that
        starts the date's week. Weeks run from Monday 00:00 to the next Monday
        00:00, phone's local time.
    *   **`exerciseOutcome(ex)`:** returns the saved `outcome`, or `null` (not
        trained) when it is missing.
    *   **`planFor({ exerciseId, progression, holdWeeks, history, now })`**
        returns `{ base, action, holdWeek, holdWeeks, reason, sameWeek }`.
        *   **Inputs:**
            *   `progression` is `{ increase, anchor? }`.
            *   `history` is the indoor sessions, newest first, each with
                `finishedAt` and `exercises[]`.
            *   Exercises are matched exactly on `exercises[].exerciseId`.
                A `${id}_indoor` copy made by `normalize` is a separate
                exercise with its own history.
        *   **Step 1.** Keep the sessions that contain the exercise with a
            non-null outcome. Group them by `weekKey(finishedAt)`. In each
            week, the session with the latest `finishedAt` is the deciding
            session.
        *   **Step 2.** Replay the weeks strictly before `weekKey(now)`,
            oldest first, to get `base`, `action` and `hold`:
            *   When `hold` is 0, the week's result gives the action: Go up →
                `up`, Repeat → `same`, Go down → `down`. A Go down also sets
                `hold` to 1 for the next trained week, unless `holdWeeks` is 0.
            *   When `hold < holdWeeks`, a Go down gives `down` and sets
                `hold` back to 1. Any other result gives `same` and adds 1 to
                `hold`.
            *   When `hold >= holdWeeks`, the hold ends: `hold` becomes 0 and
                the week's result is applied as when not holding.
            *   `base` is the deciding session's saved weight.
        *   **Steps 3–6** then apply rules 1–4 of the weekly rule, in order:
            *   **Step 3, rule 1 (anchor):** if the anchor (`{ weight, at }`)
                is newer than the latest counted session, return
                `base = anchor.weight`, `action: 'same'`, keeping `hold`.
            *   **Step 4, rule 2 (current week):** if the exercise was trained
                this week, return the latest session's weight,
                `action: 'same'`, `sameWeek: true`. `holdWeek` is the hold
                value going into this week.
            *   **Step 5, rule 3 (nothing counted):** if no week is counted,
                return `action: 'same'`. `base` is the latest indoor weight
                for the exercise at any gym (from all indoor sessions, results
                or not), else `DEFAULT_WEIGHT`.
            *   **Step 6, rule 4 (weekly replay):** otherwise return `base`,
                `action` and `hold` from step 2.
        *   **`reason`**, the exact strings:

| Case | `reason` |
| --- | --- |
| Rule 4, action `up` | "Went up last time" |
| Rule 4, action `same`, not holding | "Repeated last time" |
| Rule 4, action `down`, `holdWeeks` 0 | "Went down last time" |
| Holding (any rule) | "Hold *holdWeek* of *holdWeeks*" |
| Rule 2 | "Same week as *Day*" (weekday of the deciding session's `finishedAt`, from `WEEKDAYS[].short`) |
| Rule 1 | "Set in Settings" |
| Rule 3 | "Starting weight" |

        "Last time" instead of "last week", so the text stays true after a
        skipped week.
    *   **`plannedWeight(plan, increase)`:** `up` → `base + increase`;
        `same` → `base`; `down` → `base − 1`; never below 0.
    *   **`roundPlan(plan, increase, ctx)`** returns `{ weight, cantLoadMore }`.
        `ctx` is described in item 6.
        *   If `!isUsableCtx(ctx)`: return
            `{ weight: plannedWeight(plan, increase), cantLoadMore: false }`
            (no rounding).
        *   `up`: `loadableAtLeast(base + increase, ctx)`. If that is `null`,
            use `loadableNearest(base, ctx)` with `cantLoadMore: true`.
        *   `same`: `loadableNearest(base, ctx)`.
        *   `down` (the Fail step), in order:
            1.  `loadableAtMost(base − 1, ctx)`;
            2.  else `loadableAtMost(base − 0.05, ctx)`;
            3.  else `base`.

            Clamp the result to `[bar weight, base]` for barbells and
            `[0, base]` for machines. If `base` is below the bar (after a
            hand-edit), the bar weight wins.

#### 8. `src/workout/rounding.js` (Create)

*   **Type / Scope**: Small module that reads the program store.
*   **Proposed Changes**: Add `ctxFor(exerciseId, gymId, barId) → ctx | null`.
    *   **Barbell:** `bar` = the weight of the bar with id `barId` in
        `getGym(gymId).bars`; `plates` = `platesAt(gym)`. With no gym or no
        such bar, it returns `null`.
    *   **Machine:** `{ kind: 'machine', step: exerciseStep(exerciseId) }`,
        whether or not there is a gym.

**Phase 2 checks:** a throwaway Node script, kept outside the repository,
imports items 6–7 and asserts these cases (given → expected):

| Given | Expected |
| --- | --- |
| Go up (`success`) at 40, +1, 20 kg bar, plates 1.25–20 | 42.5, "Went up last time" |
| Go up at 80, +1, smallest plate 2.5 | 85 |
| Go up at 60, +1, plates allow 61 exactly (0.5 kg pairs) | 61 |
| Go up at the inventory maximum | same weight, `cantLoadMore: true` |
| Go down (`fail`) at 60 (exactly loadable), 1.25 kg plates | 57.5 |
| Go down at 21, 20 kg bar, 1.25 kg plates | 20 (the bar) |
| Go down at 19 after a hand-edit, 20 kg bar | 20 (the bar wins) |
| Go down, holdWeeks 2, then Go up ×3 (CUJ 2) | 57.5 / Hold 1 of 2 → 57.5 / Hold 2 of 2 → 60 / "Went up last time" |
| Go down during a hold | down again, "Hold 1 of 2" |
| holdWeeks 0, Go down at 60 | 57.5, "Went down last time", then normal |
| Repeat (`neutral`) at 57.5, 1.25 kg plates | 57.5, "Repeated last time" |
| Go up, then two weeks with no session | rises once only |
| Two sessions this week, the second mid-hold-week-1 | prefill = latest session weight, "Hold 1 of 2", "Same week as …" |
| Hand-edited 47.5 saved as Go up, +1 | next base 47.5 |
| Anchor 55 newer than the last session, during a hold | 55, "Set in Settings", hold kept |
| Anchor, nothing counted | anchor weight |
| Only workouts without a result | "Starting weight" from the latest indoor weight |
| Latest session deleted | the plan follows the previous week |
| Machine, step 5, Go up at 42 | 45 |
| Gym with no plates (unusable ctx) | planned weight unrounded, no `cantLoadMore` |

### Phase 3: Repository and store

#### 9. `src/data/repository.js` (Modify)

*   **Type / Scope**: Data access.
*   **Proposed Changes**:
    *   **Add `getSessionHistory() → { sessions, offline }`.**
        *   Calls `adapter.listSessions()` once.
        *   **On success:** `sessions` is an array. For logged-in users, a
            trimmed copy of all sessions (outdoor and indoor) is written to
            `puntti.history.v1:<scope>`, where `<scope>` is `user:<id>`. The
            copy holds `finishedAt`, `place`, `gymId`, and `exercises[]` with
            `exerciseId`, `weight`, `sets`, `bar` and `outcome`. The write is
            wrapped in try/catch: if storage is full, the cache is simply not
            refreshed. Guests get no cache.
        *   **On failure:** returns the cached array with `offline: true`, or
            `{ sessions: null, offline: true }` when there is no cache.
    *   **Add pure `lastWeightsFrom(sessions, place, gymId)`**, extracted from
        `getLastWeights`. It returns the last weights per exercise. Exercises
        with zero sets ticked are skipped, so a zero-set result is not used as
        a last weight.
    *   **Delete `getLastWeights`:** its only caller (`createSession`) moves to
        `lastWeightsFrom`.
    *   **Retire `puntti.lastWeights.v3`:** it is no longer written. A
        top-level scan in `repository.js`, run when the module loads, removes
        every `localStorage` key starting with `puntti.lastWeights.v3:`,
        inside try/catch.

#### 10. `src/program/store.js` (Modify)

*   **Type / Scope**: Program store.
*   **Proposed Changes**:
    *   **`normalize`:**
        *   Default `holdWeeks` to `HOLD_WEEKS_DEFAULT`.
        *   Drop `progression` from any exercise whose place is not indoor.
        *   Do not copy `progression` onto the `${id}_${place}` copies it
            creates.
    *   **`defaultProgram`:** include `holdWeeks: HOLD_WEEKS_DEFAULT`.
    *   **New readers:**
        *   `progressionOf(id)` returns `{ increase, anchor? }`, with
            `increase` defaulting to `INCREASE_DEFAULT`, or `null` if the
            exercise is not indoor.
        *   `holdWeeks()`.

**Phase 3 checks:** `npm run build`. In the browser console on the dev
account: `getSessionHistory()` returns an array and writes
`puntti.history.v1:user:<id>`; there are no `puntti.lastWeights.v3:` keys left;
offline (DevTools → Network → Offline) it returns the cache with
`offline: true`; with the cache removed it returns `sessions: null`.

### Phase 4: Workout session, card, workout screen and Home

#### 11. `src/workout/session.js` (Modify)

*   **Type / Scope**: In-progress workout logic.
*   **Proposed Changes**:
    *   **`createSession(workout, gymId)`:**
        *   Calls `getSessionHistory()` once.
        *   **Last weights** for bars and outdoor exercises come from
            `lastWeightsFrom(sessions ?? [], place, gymId)`. `slot.lastWeight`
            keeps the per-gym last weight, so the card still shows "Last
            time…".
        *   **Progression exercises:** filter `sessions` to indoor, read
            `progressionOf(id)` and `holdWeeks()` from the store, call
            `planFor`, then `roundPlan(plan, increase, ctxFor(id, gymId,
            barId))`. `barId` comes from `initialBar`. The rounded weight is
            the starting `weight`.
        *   **`sessions === null`** (offline, no cache): no plans. Weights
            start at `DEFAULT_WEIGHT`, `plan` is `null`, and
            `slot.noPlanOffline = true`.
        *   **When offline with an array:** set `plan.offline = true`.
        *   **Guests and outdoor sessions:** `plan` is `null`.
    *   **The `slot.plan` shape** (one definition):
        `{ base, action, holdWeek, holdWeeks, reason, sameWeek, increase,
        planned, rounded, cantLoadMore, offline }`.
        *   `planned` = `plannedWeight(plan, increase)`.
        *   `rounded` = the weight `roundPlan` gave.
    *   **Other new slot fields:** `outcome` (`'success' | 'neutral' | 'fail' |
        null`) and `noPlanOffline` (boolean).
        *   Drafts saved by the current version have none of these fields and
            are read as `null` / `false`.
        *   The draft key stays `puntti.draft.v2`.
    *   **Reducer:**
        *   **New action `setOutcome { slot, outcome }`.**
        *   **`toggleSet`:** for a progression exercise (`state.place ===
            'indoor'` and the slot has a plan or the session is not a guest
            session), when the sets become all ticked and `outcome` is `null`,
            set `outcome: 'success'`. Un-ticking a set leaves `outcome`
            unchanged.
        *   **`setBar`:**
            *   Does nothing to the weight when `slot.plan?.base == null`, or
                when a set of that exercise is ticked.
            *   Otherwise rebuilds `ctxFor` with the new bar and re-runs
                `roundPlan` with `slot.plan.increase`.
            *   It updates `weight` only if `weight === slot.plan.rounded`, so
                a hand-edit is kept, and stores the new `rounded`.
    *   **`toSavedSession`:**
        *   Add `outcome` to each exercise that has one.
        *   Keep an exercise with zero sets ticked when it has an outcome.
    *   **New helpers:**
        *   `missingOutcomes(state)`: the progression exercises with some, but
            not all, sets ticked and no outcome.
        *   `hasProgress(state)`: true when any set is ticked or any slot has
            an outcome.

#### 12. `src/components/ExerciseCard.jsx` (Modify)

*   **Type / Scope**: UI component.
*   **Proposed Changes**: For progression exercises:
    *   **Plan line** under the name. The exact text by case:
        *   **With a plan:** "Plan *planned* kg → *rounded* kg here ·
            *reason*". When `planned === rounded`, it is "Plan *planned* kg ·
            *reason*".
        *   Add " · Can't load more here" when `plan.cantLoadMore`, and
            " · offline" when `plan.offline`.
        *   **After a hand-edit** (`weight !== plan.rounded`): the same line;
            the stepper shows the edited weight.
        *   **`slot.noPlanOffline`:** "No plan offline".
        *   **No plan otherwise** (an older draft): no plan line.
    *   **Result control:** a `SegmentedControl` with Go up / Repeat / Go down,
        dispatching `setOutcome`.
        *   It is shown for every progression exercise, whether or not
            `slot.plan` exists.
        *   It is hidden for guests and outdoor sessions.
        *   It stays enabled for the whole workout.

#### 13. `src/screens/WorkoutScreen.jsx` (Modify)

*   **Type / Scope**: Screen.
*   **Proposed Changes**:
    *   **Indoor workouts of logged-in users:**
        *   Ticking the last set no longer calls `handleFinish(..., { auto:
            true })`, and starts no rest timer.
        *   The finish button is labelled **Save workout**. Once every set is
            ticked, it also gets the `button-primary--ready` emphasis class,
            because it is already `button-primary`.
        *   Indoor workouts of guests keep today's auto-save.
    *   **`hasProgress(state)`** replaces `done > 0` in three places:
        *   the button's `disabled` rule (with the note "Mark a set or a
            result first");
        *   `handleBack`, which clears the draft only when there is no
            progress;
        *   the "finish early" count.
    *   **`handleFinish`:**
        *   If `missingOutcomes(state)` is not empty, show a one-button dialog
            naming the exercises ("Choose Go up, Repeat or Go down for
            Squat") and stop.
        *   The existing "Finish workout?" confirmation for undone sets
            follows.
    *   **After a successful indoor save:** navigate to `/` with
        `savedWorkout`, like the `auto` branch, instead of `/history/:id`.
        (`markFinishedToday` is already called on every save.)
    *   **`chooseGym`** (allowed only while `!hasProgress(state)`) re-runs
        `createSession(workout, newGymId)`, which re-plans and re-rounds every
        exercise for the new gym.
    *   Outdoor behaviour is unchanged.

#### 14. `src/screens/HomeScreen.jsx` (Modify)

*   **Type / Scope**: Screen.
*   **Proposed Changes**:
    *   The draft check uses `hasProgress(d)` instead of `progress(d).done >
        0`.
    *   When the draft is an indoor workout with every set ticked
        (`progress(d).done === progress(d).total`), show the banner "Unsaved
        workout: Save now", which opens it, instead of the normal "resume" row.

**Phase 4 checks:** `npm run build`. On the dev account in the browser
(indoor training mode, one gym with plates):

*   Start an indoor workout: each exercise shows a plan line and the three
    buttons.
*   Tick every set of the last exercise: Go up is selected, the workout stays
    open, and Save is emphasised.
*   Untick one set: Go up stays selected.
*   Mark an exercise Go down with zero sets and save: it is saved.
*   Leave a fully ticked workout and go Home: the "Unsaved workout" banner
    appears.
*   As a guest: no plan line, no buttons, and indoor auto-save still happens.

### Phase 5: History editing

#### 15. `src/screens/SessionDetailScreen.jsx` (Modify)

*   **Type / Scope**: Screen.
*   **Proposed Changes**:
    *   For each indoor exercise of an indoor session (logged-in users), show
        its result as a `SegmentedControl`.
        *   A result can be changed but not cleared.
        *   Choosing a result on a workout saved before this feature makes it
            a counted week. That is intended.
    *   **Saving a change:** the screen calls
        `saveSession({ ...session, exercises: updated })`.
        *   The stored session is sent unchanged except for that exercise's
            `outcome`: the same `id`, `startedAt`, `finishedAt`, `place`,
            `gymId`, weights, sets and bars.
        *   It must not go through `toSavedSession`, which would re-stamp
            `finishedAt`.
        *   The server upserts it. The screen then updates the shown result,
            or shows the save error inline.
    *   The "weight change versus previous" figure skips zero-set entries.

**Phase 5 checks:** change a result in History. The workout keeps its date and
position in the list, and the next workout's plan line reflects the new result.

### Phase 6: Settings, exercise editor, exercise history and routes

#### 16. `src/screens/ExerciseEditScreen.jsx` (Modify)

*   **Type / Scope**: Screen.
*   **Proposed Changes**: For indoor exercises:
    *   **Increase per week field:**
        *   kg; checked with `isValidPlateWeight` (0.05–50, a multiple of
            0.05); a comma is accepted; default `INCREASE_DEFAULT`.
        *   Saved by merging: `progression: { ...old.progression, increase }`,
            so an existing anchor is kept.
        *   There is no on/off switch.
    *   **Real-jump note:**
        *   Loads `getSessionHistory()` when the screen opens, and shows "…"
            until it arrives.
        *   `base` comes from `planFor`; a new exercise with no id uses
            `DEFAULT_WEIGHT`.
        *   It uses the increase currently typed in the form, not the saved
            one.
        *   The jump at each indoor gym with a usable ctx (gym's first bar,
            its plates) is `loadableAtLeast(base + increase, ctx) −
            loadableNearest(base, ctx)`, for example "+1 kg → +2.5 kg at
            Gym A". Gyms without a usable ctx are skipped.
        *   Machines show one note: "+1 kg → +*step* kg".
    *   All of this is saved with `saveProgram`.

#### 17. `src/screens/SettingsScreen.jsx` (Modify)

*   **Type / Scope**: Screen.
*   **Proposed Changes**: In the Program section, for logged-in users with
    `trainingMode() !== 'outdoor'`:
    *   **Hold after a fail** row: a whole-number stepper with an input
        (0 or more; 0 shows "No hold"), saved with `saveProgram` as
        `holdWeeks`.

#### 18. `src/screens/HistoryScreen.jsx`, `src/screens/ExerciseHistoryScreen.jsx` (Create) and `src/workout/progression.js`

*   **Type / Scope**: Screens and a pure helper. This replaces the earlier
    Progression screen (changed after approval).
*   **`weeklyHistory({ exerciseId, holdWeeks, history, now })`**
    (progression.js, pure):
    *   It filters to indoor sessions itself.
    *   Rows are only weeks with a counted session (one with a result),
        newest first. Weeks after the current one are left out.
    *   `extraSessions` = the other sessions that week that contain the
        exercise.
    *   `holdWeek` = `planFor({ …, progression: null, now: Monday 00:00 of
        that week }).holdWeek`.
*   **`planNextTime(exerciseId, indoorHistory, gymId, lastBar, { offline,
    now })`** (session.js): the bar used last time, then the plan and
    rounding. `createSession` and the exercise detail both use it, so they
    show the same weight. `plan.unrounded` is true when there is no gym, bar
    or plates to round against.
*   **HistoryScreen:**
    *   A **By workout / By exercise** switch, kept in `?view=exercise`.
    *   By workout keeps `listSessions()`, with its error and retry.
    *   By exercise uses `getSessionHistory()`:
        *   active indoor exercises with their latest weight and result, or
            "Not done yet";
        *   "No indoor exercises yet" when there are none;
        *   "No saved history on this phone yet" when offline with no cache;
        *   an offline note.
    *   Only the open view loads.
*   **ExerciseHistoryScreen** (`/history/exercise/:exerciseId`):
    *   An unknown or non-indoor id redirects to `/history?view=exercise`.
    *   An archived exercise shows its history only.
    *   **"Next time":** the gym and bar of the latest session where the
        exercise was lifted, with the status and reason. If the plan could
        not be rounded, it shows the unrounded weight plus a note.
    *   **Change planned weight:** writes `progression: { increase:
        old?.increase ?? INCREASE_DEFAULT, ...old, anchor: { weight, at } }`.
    *   **Weekly rows:** week, weight, sets, result, "Hold n of N" and
        "+n more". A row opens `/history/:id` when the session has an id
        (offline cached sessions don't).
    *   Empty state: "No weeks with a result yet".
    *   Guests are redirected to `/history`.

#### 19. `src/App.jsx` and `src/screens/HomeScreen.jsx` (Modify)

*   **Proposed Changes:**
    *   Add the route `/history/exercise/:exerciseId`. The static `exercise`
        segment outranks `:sessionId` in react-router 7.
    *   Home shows a **Progress** row (logged in, indoor), which opens
        `/history?view=exercise`.

**Phase 6 checks:**

*   Change an increase and save; an existing anchor survives.
*   Set the planned weight in History → By exercise → an exercise; the next
    workout uses it, with "Set in Settings", and a running hold stays.
*   Set the hold length to 0 and to 2; the "Next time" status follows.
*   Back from the exercise detail returns to By exercise.
*   Offline weekly rows can't be tapped.
*   An archived or unknown exercise link is handled.
*   Home → Progress opens By exercise.
*   The old `/settings/progression` link falls back to Home.
*   The editor's note for a 1.25 kg plate gym reads "+1 kg → +2.5 kg".

### Phase 7: Documentation

#### 20. Module READMEs (Modify)

*   **Type / Scope**: The EGM READMEs in each folder.
*   **Proposed Changes**: Update the contracts that change:
    *   [src/workout/README.md](../../src/workout/README.md): the new modules
        (`progression.js`, `rounding.js`), the `setOutcome` action, the slot
        fields, the save rule, and the new prefill rule for progression
        exercises.
    *   [src/utils/README.md](../../src/utils/README.md): `isUsableCtx` and the
        loadable helpers.
    *   [src/program/README.md](../../src/program/README.md): `holdWeeks`,
        `progression` and the readers.
    *   [src/data/README.md](../../src/data/README.md): `getSessionHistory`,
        the `puntti.history.v1` cache, `lastWeightsFrom`, the removal of
        `getLastWeights`, and the retired `puntti.lastWeights.v3` cache.
    *   [src/config/README.md](../../src/config/README.md):
        `HOLD_WEEKS_DEFAULT` and `INCREASE_DEFAULT`.
    *   [src/components/README.md](../../src/components/README.md): the
        ExerciseCard plan line and result control.
    *   [src/screens/README.md](../../src/screens/README.md): History → By
        exercise, the exercise detail, the indoor save flow, the Home banner
        and Progress row, and History editing.
    *   [src/README.md](../../src/README.md): the new route
        `/history/exercise/:exerciseId`.
    *   [server/src/models/README.md](../../server/src/models/README.md) and
        [server/src/routes/README.md](../../server/src/routes/README.md): the
        new fields and limits.

### Phase 8 (added after approval): Exercise progress view

Covered by phase 6, item 18 (History → By exercise and the exercise detail).

*   **Decided:** the plan shown at the time is not stored. Weekly hold labels
    are recomputed with today's settings, so after a change to the hold
    length an old label can differ from what the card said back then.
    Accepted.

### Verification Plan

*   **Build:** `npm run build` at the end of every phase.
*   **Logic checks (throwaway script):** the Phase 2 table. The project has no
    test runner, and none is added.
*   **Server:** the Phase 1 checks against `puntti_test` on port 4099. Drop the
    database afterwards.
*   **Manual (dev account, local dev MongoDB, phone):**
    *   Do one indoor workout, mark Go up and save.
    *   In the local dev database, set that workout's `finishedAt` one week
        back. Start the next workout and check the new weight and the reason
        line.
    *   Repeat for Go down and the hold, a History edit, and a Progression
        screen edit.
    *   Start a workout offline (DevTools Network → Offline). The plan is
        worked out from the cached history (`puntti.history.v1`).

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
