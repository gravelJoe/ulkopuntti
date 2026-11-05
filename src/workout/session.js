// Pure logic for an in-progress workout: building it (with prefilled
// weights), updating it, and turning it into a saved session.
// All sets of an exercise use the same weight.

import { DEFAULT_WEIGHT, SETS_PER_EXERCISE } from '../config/workouts.js';
import { getLastWeights } from '../data/repository.js';

export const slotOptions = (slot) => slot.choice ?? [slot.exercise];

export function clampWeight(kg) {
  return Math.min(999, Math.max(0, Math.round(kg * 100) / 100));
}

const emptySets = () => Array(SETS_PER_EXERCISE).fill(false);
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
export async function createSession(workout) {
  const found = await getLastWeights();
  const last = (id) => found[id] ?? null;

  return {
    workoutId: workout.id,
    startedAt: new Date().toISOString(),
    slots: workout.slots.map((slot) => {
      const options = slotOptions(slot);
      return {
        options,
        selected: options[0],
        weight: mapOptions(options, (id) => last(id) ?? DEFAULT_WEIGHT),
        sets: mapOptions(options, emptySets),
        lastWeight: mapOptions(options, last),
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
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString(),
    exercises: state.slots
      .map((slot) => ({
        exerciseId: slot.selected,
        weight: slot.weight[slot.selected],
        sets: slot.sets[slot.selected],
      }))
      .filter((ex) => ex.sets.some(Boolean)),
  };
}
