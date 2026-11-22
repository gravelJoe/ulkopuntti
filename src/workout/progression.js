// Weekly progression for indoor exercises — pure logic, no network or storage.
//
// The plan is never stored: each time a workout starts, planFor() replays the
// saved workouts. The result of the latest session of each week (Go up /
// Repeat / Go down, stored as success / neutral / fail) moves next week's
// weight. roundPlan() then rounds it to what this gym can load.
// Design: docs/designs/weekly_progression.md

import { DEFAULT_WEIGHT, HOLD_WEEKS_DEFAULT, INCREASE_DEFAULT } from '../config/workouts.js';
import { formatWeight } from '../utils/format.js';
import { isUsableCtx, loadableAtLeast, loadableAtMost, loadableNearest } from '../utils/plates.js';
import { DateTime } from 'luxon';
import { LOCALE, toDateTime } from '../utils/dates.js';

const OUTCOMES = ['success', 'neutral', 'fail'];
const ACTION = { success: 'up', neutral: 'same', fail: 'down' };

/**
 * 'YYYY-MM-DD' of the Monday that starts the date's week (phone's local time),
 * or null for an invalid date. Accepts a DateTime, a JS Date or an ISO string.
 */
export function weekKey(date) {
  const d = toDateTime(date);
  return d.isValid ? d.startOf('week').toISODate() : null;
}

/** The saved result, or null (not trained) when missing or unknown. */
export const exerciseOutcome = (ex) => (OUTCOMES.includes(ex?.outcome) ? ex.outcome : null);

const findExercise = (session, exerciseId) => session.exercises?.find((e) => e.exerciseId === exerciseId);
const holdLabel = (hold, holdWeeks) => `Hold ${hold} of ${holdWeeks}`;

/**
 * @param {{ exerciseId: string, progression: { increase: number, anchor?: { weight: number, at: string } },
 *           holdWeeks: number, history: object[], now?: Date }} args
 *   history: indoor sessions, newest first, each { finishedAt, exercises: [{ exerciseId, weight, sets, outcome }] }
 * @returns {{ base: number, action: 'up'|'same'|'down', holdWeek: number, holdWeeks: number,
 *             reason: string, sameWeek: boolean,
 *             source: 'anchor'|'sameWeek'|'start'|'replay' }}
 *   holdWeek: the hold week the next session is in (0 = not holding).
 */
export function planFor({ exerciseId, progression, holdWeeks: holdSetting, history, now = DateTime.now() }) {
  const thisWeek = weekKey(now);
  const holdWeeks = holdSetting ?? HOLD_WEEKS_DEFAULT;

  // Step 1: counted sessions (the exercise with a result), grouped by week.
  // The deciding session of a week is the one that finished last.
  const deciding = new Map(); // weekKey → { session, exercise }
  for (const session of history) {
    const exercise = findExercise(session, exerciseId);
    if (!exercise || !exerciseOutcome(exercise)) continue;
    const key = weekKey(session.finishedAt);
    if (!key) continue; // invalid date: ignore
    const prev = deciding.get(key);
    if (!prev || new Date(session.finishedAt) > new Date(prev.session.finishedAt)) deciding.set(key, { session, exercise });
  }
  const weeks = [...deciding.keys()].sort();

  // Step 2: replay the weeks before this one, oldest first.
  let base = null;
  let action = 'same';
  let hold = 0; // hold week of the NEXT trained week; 0 = not holding
  for (const key of weeks) {
    if (key >= thisWeek) break;
    const { exercise } = deciding.get(key);
    const outcome = exerciseOutcome(exercise);
    base = exercise.weight;
    if (hold > 0 && hold < holdWeeks) {
      // Inside a hold: only a Go down changes anything (and starts the hold over).
      if (outcome === 'fail') {
        action = 'down';
        hold = 1;
      } else {
        action = 'same';
        hold += 1;
      }
    } else {
      // Not holding, or the last hold week (the hold ends, the result counts).
      action = ACTION[outcome];
      hold = outcome === 'fail' && holdWeeks > 0 ? 1 : 0;
    }
  }

  // Hold wording only for a hold of 2+ (a hold of 1 behaves like none).
  const holding = hold > 0 && showsHold(holdWeeks);
  const withHold = (reason) => (holding ? `${reason} · ${holdLabel(hold, holdWeeks)}` : reason);
  // Latest counted week up to now (a session dated in the future, from a wrong
  // phone clock, is ignored here as it is in the replay).
  const latestKey = weeks.filter((k) => k <= thisWeek).pop();
  const latest = latestKey ? deciding.get(latestKey) : null;
  const result = (fields) => ({ holdWeek: hold, holdWeeks, sameWeek: false, ...fields });

  // Rule 1: a Settings edit newer than the latest counted session wins (hold is kept).
  const anchor = progression?.anchor;
  if (anchor && (!latest || new Date(anchor.at) > new Date(latest.session.finishedAt))) {
    return result({ base: anchor.weight, action: 'same', reason: withHold('Set in Settings'), source: 'anchor' });
  }

  // Rule 2: already trained this week → start from that session; the weight
  // only moves across week boundaries.
  if (latestKey === thisWeek) {
    const day = toDateTime(latest.session.finishedAt).setLocale(LOCALE).toFormat('ccc');
    return result({ base: latest.exercise.weight, action: 'same', reason: withHold(`Same week as ${day}`), sameWeek: true, source: 'sameWeek' });
  }

  // Rule 3: nothing counted yet → the latest indoor weight at any gym, else the default.
  if (base === null) {
    const last = history.map((s) => findExercise(s, exerciseId)).find((e) => e && e.sets?.some(Boolean));
    return result({ base: last?.weight ?? DEFAULT_WEIGHT, action: 'same', reason: 'Starting weight', source: 'start' });
  }

  // Rule 4: the weekly replay.
  let reason;
  if (holding) reason = holdLabel(hold, holdWeeks);
  else if (action === 'up') reason = 'Went up last time';
  else if (action === 'down') reason = 'Went down last time';
  else reason = 'Repeated last time';
  return result({ base, action, reason, source: 'replay' });
}

/** The weight the plan aims for before gym rounding. */
export function plannedWeight(plan, increase) {
  const w = plan.action === 'up' ? plan.base + increase : plan.action === 'down' ? plan.base - 1 : plan.base;
  return Math.max(0, Math.round(w * 100) / 100);
}

/**
 * Round the plan to a weight this gym can load.
 * @returns {{ weight: number, cantLoadMore: boolean }}
 */
export function roundPlan(plan, increase, ctx) {
  if (!isUsableCtx(ctx)) return { weight: plannedWeight(plan, increase), cantLoadMore: false };
  const { base } = plan;

  if (plan.action === 'up') {
    const up = loadableAtLeast(base + increase, ctx);
    if (up === null) return { weight: loadableNearest(base, ctx) ?? base, cantLoadMore: true };
    return { weight: up, cantLoadMore: false };
  }

  if (plan.action === 'down') {
    // The Fail step: at least 1 kg lower if possible, else anything lower, else stay.
    let w = loadableAtMost(base - 1, ctx) ?? loadableAtMost(base - 0.05, ctx) ?? base;
    const floor = ctx.kind === 'barbell' ? ctx.bar : 0;
    w = Math.min(w, base);
    w = Math.max(w, floor); // a hand-edited base below the bar → the bar wins
    return { weight: w, cantLoadMore: false };
  }

  return { weight: loadableNearest(base, ctx) ?? base, cantLoadMore: false };
}

/**
 * Weekly history of one exercise for the History → By exercise view.
 * One row per week that has a counted session (the exercise with a result),
 * newest first; weeks after the current one are left out. Only indoor
 * sessions are used (the function filters them itself).
 *
 * Row: { week: 'YYYY-MM-DD' (Monday), session, exercise, outcome,
 *        holdWeek (hold state going into that week, 0 = none), extraSessions,
 *        effect: { action, next, change, holdNext } }
 * extraSessions: other sessions that week containing the exercise.
 * effect: what this week did to the next trained week — the plan replayed on
 * the history up to and including this week (so later sessions can't hide it).
 * next = planned weight before gym rounding, change = next − trained weight,
 * holdNext = hold week the next trained week is in (0 = none).
 */
export function weeklyHistory({ exerciseId, holdWeeks: holdSetting, increase = INCREASE_DEFAULT, history, now = DateTime.now() }) {
  const holdWeeks = holdSetting ?? HOLD_WEEKS_DEFAULT;
  const indoor = history.filter((s) => s.place === 'indoor');
  const thisWeek = weekKey(now);
  const weeks = new Map(); // weekKey → { all, counted: { session, exercise } | null }
  for (const session of indoor) {
    const exercise = findExercise(session, exerciseId);
    if (!exercise) continue;
    const key = weekKey(session.finishedAt);
    if (!key || key > thisWeek) continue;
    const entry = weeks.get(key) ?? { all: 0, counted: null };
    entry.all += 1;
    if (exerciseOutcome(exercise) && (!entry.counted || new Date(session.finishedAt) > new Date(entry.counted.session.finishedAt))) {
      entry.counted = { session, exercise };
    }
    weeks.set(key, entry);
  }
  return [...weeks.entries()]
    .filter(([, e]) => e.counted)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([week, { all, counted }]) => {
      const monday = DateTime.fromISO(week); // 00:00 local: replay covers only earlier weeks
      const { holdWeek } = planFor({ exerciseId, progression: null, holdWeeks, history: indoor, now: monday });
      const upToThisWeek = indoor.filter((s) => {
        const k = weekKey(s.finishedAt);
        return k && k <= week;
      });
      const after = planFor({ exerciseId, progression: null, holdWeeks, history: upToThisWeek, now: monday.plus({ weeks: 1 }) });
      const next = plannedWeight(after, increase);
      return {
        week,
        session: counted.session,
        exercise: counted.exercise,
        outcome: exerciseOutcome(counted.exercise),
        holdWeek,
        extraSessions: all - 1,
        effect: { action: after.action, next, change: Math.round((next - counted.exercise.weight) * 100) / 100, holdNext: after.holdWeek },
      };
    });
}

/** A hold of 0 or 1 behaves the same (the week after a Go down is lower anyway), so hold text needs 2+. */
export const showsHold = (holdWeeks) => (holdWeeks ?? HOLD_WEEKS_DEFAULT) >= 2;

/**
 * A held week whose result is ignored unless it's a Go down: hold of 2+ and not
 * yet the last hold week. The workout card then offers only Keep / Go down.
 */
export const isHeldWeek = (holdWeek, holdWeeks) => showsHold(holdWeeks) && holdWeek > 0 && holdWeek < holdWeeks;

const signedKg = (kg) => `${kg > 0 ? '+' : '−'}${formatWeight(Math.abs(kg))} kg`;

/**
 * The "→" line of a weekly row: what that week did to the next week.
 * "+1 kg next week" · "−1 kg, then held for 2 weeks" · "same weight: hold not over"
 * · "same weight next week"
 */
export function describeEffect(row, holdWeeks) {
  const { action, change, holdNext } = row.effect;
  if (action === 'up' && change > 0) return `${signedKg(change)} next week`;
  if (action === 'down' && change < 0) {
    return `${signedKg(change)}${showsHold(holdWeeks) ? `, then held for ${holdWeeks} weeks` : ''}`;
  }
  if (holdNext > 0 && showsHold(holdWeeks)) return 'same weight: hold not over';
  return 'same weight next week';
}

/**
 * The plan for the week AFTER the newest trained week — for History → By
 * exercise, where each exercise is trained once a week and "next" always means
 * next week. Same as planFor, except that having trained this week moves the
 * plan on to next Monday instead of repeating this week (no "same week" rule).
 * Sessions dated after the current week are ignored.
 */
export function planUpcoming({ exerciseId, progression, holdWeeks, history, now = DateTime.now() }) {
  const today = toDateTime(now);
  const thisWeek = weekKey(today);
  const upToNow = history.filter((s) => {
    const k = weekKey(s.finishedAt);
    return k && k <= thisWeek;
  });
  const trainedThisWeek = upToNow.some((s) => {
    const ex = findExercise(s, exerciseId);
    return ex && exerciseOutcome(ex) && weekKey(s.finishedAt) === thisWeek;
  });
  const at = trainedThisWeek ? today.startOf('week').plus({ weeks: 1 }) : today;
  return planFor({ exerciseId, progression, holdWeeks, history: upToNow, now: at });
}
