// The rounding context for one exercise at one gym (see utils/plates.js).
import { exerciseStep, getGym, isBarbell, platesAt } from '../program/store.js';

/**
 * Barbell: { kind: 'barbell', bar, plates } from the gym's bar and plates —
 * null without a gym or that bar. Machine: { kind: 'machine', step }, with or
 * without a gym.
 */
export function ctxFor(exerciseId, gymId, barId) {
  if (!isBarbell(exerciseId)) return { kind: 'machine', step: exerciseStep(exerciseId) };
  const gym = getGym(gymId);
  const bar = gym?.bars?.find((b) => b.id === barId);
  if (!gym || !bar) return null;
  return { kind: 'barbell', bar: bar.weight, plates: platesAt(gym) };
}
