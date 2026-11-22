// Pure logic for an in-progress workout: building it (with prefilled
// weights), updating it, and turning it into a saved session.
// All sets of an exercise use the same weight.

import { DEFAULT_WEIGHT } from '../config/workouts.js';
import { exerciseSets, getGym, holdWeeks, isBarbell, progressionOf } from '../program/store.js';
import { getSessionHistory, isGuest, lastWeightsFrom } from '../data/repository.js';
import { planFor, plannedWeight, roundPlan } from './progression.js';
import { ctxFor } from './rounding.js';

export const slotOptions = (slot) => slot.options ?? slot.choice ?? [slot.exercise];

export function clampWeight(kg) {
  return Math.min(999, Math.max(0, Math.round(kg * 100) / 100));
}

const emptySets = (exerciseId) => Array(exerciseSets(exerciseId)).fill(false);
const mapOptions = (options, fn) => Object.fromEntries(options.map((id) => [id, fn(id)]));

/**
 * In-progress shape:
 * {
 *   workoutId, startedAt,
 *   slots: [{
 *     options: ['multifit', 'row'],      // one entry for fixed exercises
 *     selected: 'multifit',
 *     weight:     { multifit: 40, row: 35 },
 *     sets:       { multifit: [true, false, …×5], row: [...] },
 *     lastWeight: { multifit: 40 | null, row: null },
 *     bar:        { multifit: null, row: null },          // barbell: bar id
 *     plan:       { multifit: Plan | null, … },           // indoor progression
 *     outcome:    { multifit: 'success'|'neutral'|'fail'|null, … },
 *     noPlanOffline: false,                               // offline with no history cache
 *   }],
 *   progression: true,   // indoor session of a logged-in user (plans + result buttons)
 * }
 *
 * Plan = planFor() result + { increase, planned, rounded, cantLoadMore, offline }.
 * Drafts saved before progression existed have no plan/outcome/progression
 * fields; they read as "no plan" and work as before.
 */
/** The bar to start with: the one used last time at this gym (by name), else the gym's first bar. */
function initialBar(gym, lastBar) {
  const bars = gym?.bars ?? [];
  return (lastBar && bars.find((b) => b.name === lastBar.name)) ?? bars[0] ?? null;
}

/** Indoor session of a logged-in user: plans, result buttons, no auto-save. */
export const isProgressive = (state) => state?.progression ?? (state?.place === 'indoor' && !isGuest());

/** The plan for one exercise, rounded for this gym and bar (null if it has no progression). */
function makePlan(exerciseId, history, gymId, barId, offline, now) {
  const settings = progressionOf(exerciseId);
  if (!settings) return null;
  const plan = planFor({ exerciseId, progression: settings, holdWeeks: holdWeeks(), history, now });
  const { weight, cantLoadMore } = roundPlan(plan, settings.increase, ctxFor(exerciseId, gymId, barId));
  return {
    ...plan,
    increase: settings.increase,
    planned: plannedWeight(plan, settings.increase),
    rounded: weight,
    cantLoadMore,
    offline,
  };
}

/** gymId: indoor gym (weights, bars and plates are per gym); null outdoors or if unknown. */
export async function createSession(workout, gymId = null) {
  const place = workout.place ?? 'outdoor';
  const { sessions, offline } = await getSessionHistory();
  const found = lastWeightsFrom(sessions, place, place === 'indoor' ? gymId : null);
  const last = (id) => found[id]?.weight ?? null;
  const gym = place === 'indoor' ? getGym(gymId) : null;
  const progression = place === 'indoor' && !isGuest();
  // Offline with no cached history: no plans this time; weights start at the default.
  const noPlanOffline = progression && sessions === null;
  const indoorHistory = progression && sessions ? sessions.filter((s) => s.place === 'indoor') : [];
  const now = new Date();

  return {
    workoutId: workout.id,
    place,
    gymId: place === 'indoor' ? gymId : null,
    startedAt: now.toISOString(),
    progression,
    slots: workout.slots.map((slot) => {
      const options = slotOptions(slot);
      // Barbell exercises: chosen bar id (per exercise), null otherwise.
      const bar = mapOptions(options, (id) => (isBarbell(id) ? initialBar(gym, found[id]?.bar)?.id ?? null : null));
      const plan = mapOptions(options, (id) =>
        progression && sessions ? makePlan(id, indoorHistory, gymId, bar[id], offline, now) : null,
      );
      return {
        options,
        selected: options[0],
        weight: mapOptions(options, (id) => plan[id]?.rounded ?? (noPlanOffline ? DEFAULT_WEIGHT : last(id) ?? DEFAULT_WEIGHT)),
        sets: mapOptions(options, emptySets),
        lastWeight: mapOptions(options, last),
        bar,
        plan,
        outcome: mapOptions(options, () => null),
        noPlanOffline,
      };
    }),
  };
}

function updateSlot(state, slotIndex, fn) {
  return { ...state, slots: state.slots.map((slot, i) => (i === slotIndex ? fn(slot) : slot)) };
}

export function sessionReducer(state, action) {
  switch (action.type) {
    case 'load':
      return action.session;

    case 'select':
      return updateSlot(state, action.slot, (slot) => ({ ...slot, selected: action.exerciseId }));

    case 'setBar':
      return updateSlot(state, action.slot, (slot) => {
        const id = slot.selected;
        const next = { ...slot, bar: { ...(slot.bar ?? {}), [id]: action.barId } };
        // Re-round the planned weight for the new bar — only before any set is
        // done, and only if the weight is still the one the plan gave (keep hand-edits).
        const plan = slot.plan?.[id];
        if (plan?.base == null || slot.sets[id].some(Boolean)) return next;
        const r = roundPlan(plan, plan.increase, ctxFor(id, state.gymId, action.barId));
        return {
          ...next,
          weight: slot.weight[id] === plan.rounded ? { ...slot.weight, [id]: r.weight } : slot.weight,
          plan: { ...slot.plan, [id]: { ...plan, rounded: r.weight, cantLoadMore: r.cantLoadMore } },
        };
      });

    case 'setOutcome':
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        outcome: { ...(slot.outcome ?? {}), [slot.selected]: action.outcome },
      }));

    case 'setWeight':
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        weight: { ...slot.weight, [slot.selected]: action.weight },
      }));

    case 'toggleSet':
      return updateSlot(state, action.slot, (slot) => {
        const id = slot.selected;
        const sets = slot.sets[id].map((done, i) => (i === action.index ? !done : done));
        const next = { ...slot, sets: { ...slot.sets, [id]: sets } };
        // All sets done and no result chosen yet → Go up (it can still be changed).
        // Un-ticking a set leaves the result as it is.
        if (isProgressive(state) && sets.every(Boolean) && !slot.outcome?.[id]) {
          next.outcome = { ...(slot.outcome ?? {}), [id]: 'success' };
        }
        return next;
      });

    default:
      return state;
  }
}

/** { done, total } across the selected exercise of every slot. */
export function progress(state) {
  let done = 0;
  let total = 0;
  for (const slot of state.slots) {
    const sets = slot.sets[slot.selected];
    total += sets.length;
    done += sets.filter(Boolean).length;
  }
  return { done, total };
}

/** Anything to save: a set ticked or a result chosen. */
export function hasProgress(state) {
  return progress(state).done > 0 || state.slots.some((slot) => Boolean(slot.outcome?.[slot.selected]));
}

/** Exercise ids that have some (not all) sets ticked but no result chosen. */
export function missingOutcomes(state) {
  if (!isProgressive(state)) return [];
  return state.slots
    .filter((slot) => {
      const sets = slot.sets[slot.selected];
      return sets.some(Boolean) && !sets.every(Boolean) && !slot.outcome?.[slot.selected];
    })
    .map((slot) => slot.selected);
}

/** The first set that isn't done yet: { slot, index }, or null when all are done. */
export function nextSet(state) {
  for (let s = 0; s < state.slots.length; s++) {
    const index = state.slots[s].sets[state.slots[s].selected].indexOf(false);
    if (index >= 0) return { slot: s, index };
  }
  return null;
}

function newId() {
  // crypto.randomUUID needs HTTPS; plain-HTTP LAN dev doesn't have it.
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The saved shape:
 * { id, workoutId, startedAt, finishedAt,
 *   exercises: [{ exerciseId, weight, sets: [true, true, …], bar?, outcome? }] }
 * Exercises with no sets done are left out (so they don't affect prefill),
 * unless a result was chosen (e.g. Go down without lifting it once).
 */
export function toSavedSession(state) {
  return {
    id: newId(),
    workoutId: state.workoutId,
    place: state.place ?? 'outdoor',
    gymId: state.gymId ?? null,
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString(),
    exercises: state.slots
      .map((slot) => {
        const bar = getGym(state.gymId)?.bars.find((b) => b.id === slot.bar?.[slot.selected]);
        const outcome = slot.outcome?.[slot.selected] ?? null;
        return {
          exerciseId: slot.selected,
          weight: slot.weight[slot.selected],
          sets: slot.sets[slot.selected],
          ...(bar ? { bar: { name: bar.name, weight: bar.weight } } : {}),
          ...(outcome ? { outcome } : {}),
        };
      })
      .filter((ex) => ex.sets.some(Boolean) || ex.outcome),
  };
}
