// Pure logic for an in-progress workout: building it (with prefilled
// weights), updating it, and turning it into a saved session.
// All sets of an exercise use the same weight.

import { DEFAULT_WEIGHT } from '../config/workouts.js';
import { exerciseSets, getGym, isBarbell } from '../program/store.js';
import { getLastWeights } from '../data/repository.js';

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
 *   }]
 * }
 */
/** The bar to start with: the one used last time at this gym (by name), else the gym's first bar. */
function initialBar(gym, lastBar) {
  const bars = gym?.bars ?? [];
  return (lastBar && bars.find((b) => b.name === lastBar.name)) ?? bars[0] ?? null;
}

/** gymId: indoor gym (weights, bars and plates are per gym); null outdoors or if unknown. */
export async function createSession(workout, gymId = null) {
  const place = workout.place ?? 'outdoor';
  const found = await getLastWeights(place, place === 'indoor' ? gymId : null);
  const last = (id) => found[id]?.weight ?? null;
  const gym = place === 'indoor' ? getGym(gymId) : null;

  return {
    workoutId: workout.id,
    place,
    gymId: place === 'indoor' ? gymId : null,
    startedAt: new Date().toISOString(),
    slots: workout.slots.map((slot) => {
      const options = slotOptions(slot);
      return {
        options,
        selected: options[0],
        weight: mapOptions(options, (id) => last(id) ?? DEFAULT_WEIGHT),
        sets: mapOptions(options, emptySets),
        lastWeight: mapOptions(options, last),
        // Barbell exercises: chosen bar id (per exercise), null otherwise.
        bar: mapOptions(options, (id) => (isBarbell(id) ? initialBar(gym, found[id]?.bar)?.id ?? null : null)),
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
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        bar: { ...(slot.bar ?? {}), [slot.selected]: action.barId },
      }));

    case 'setWeight':
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        weight: { ...slot.weight, [slot.selected]: action.weight },
      }));

    case 'toggleSet':
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        sets: {
          ...slot.sets,
          [slot.selected]: slot.sets[slot.selected].map((done, i) => (i === action.index ? !done : done)),
        },
      }));

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
 *   exercises: [{ exerciseId, weight, sets: [true, true, …] }] }
 * Exercises with no sets done are left out (so they don't affect prefill).
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
        return {
          exerciseId: slot.selected,
          weight: slot.weight[slot.selected],
          sets: slot.sets[slot.selected],
          ...(bar ? { bar: { name: bar.name, weight: bar.weight } } : {}),
        };
      })
      .filter((ex) => ex.sets.some(Boolean)),
  };
}
