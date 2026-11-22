// Barbell plate maths.
//
// A plate set is [{ weight, pairs }] — 1 pair = one plate on each side.
// solvePlates() finds the combination with the FEWEST plates per side that
// makes the target exactly (a real search, not "biggest plate first", so it
// never misses e.g. 20 + 10 when 25 is also available). If the target can't
// be made, it also returns the nearest lighter and heavier totals.

const UNIT = 0.05; // all plate weights are multiples of 50 g
const toUnits = (kg) => Math.round(kg / UNIT);
const toKg = (units) => Math.round(units * UNIT * 100) / 100;

/** A common commercial-gym kg set (pairs). */
export const STANDARD_PLATES = [
  { weight: 25, pairs: 2 },
  { weight: 20, pairs: 2 },
  { weight: 15, pairs: 1 },
  { weight: 10, pairs: 2 },
  { weight: 5, pairs: 2 },
  { weight: 2.5, pairs: 2 },
  { weight: 1.25, pairs: 2 },
];

export const DEFAULT_BARS = [{ id: 'bar_olympic', name: 'Olympic bar', weight: 20 }];

/** Competition colours (kg), so plates look like the real ones. */
export function plateColor(weight) {
  if (weight >= 25) return '#d93a2b'; // red
  if (weight >= 20) return '#2f6fd6'; // blue
  if (weight >= 15) return '#e0b000'; // yellow
  if (weight >= 10) return '#2e9e4f'; // green
  if (weight >= 5) return '#f2f2f2'; // white
  if (weight >= 2.5) return '#1c1c1e'; // black
  return '#9a9aa0'; // change plates: grey
}

export const isValidPlateWeight = (w) => w > 0 && w <= 50 && Math.abs(w / UNIT - Math.round(w / UNIT)) < 1e-6;

/**
 * @param {number} total  target total weight (bar + plates)
 * @param {number} bar    bar weight
 * @param {{weight:number,pairs:number}[]} plates
 * @returns {{
 *   exact: boolean,
 *   tooLight: boolean,          // total is below the bar weight
 *   perSide: number[],          // plates on ONE side, heaviest first (when exact)
 *   lower: number|null,         // nearest makeable total below (when not exact)
 *   higher: number|null,        // nearest makeable total above (when not exact)
 * }}
 */
export function solvePlates(total, bar, plates) {
  const sideUnits = toUnits((total - bar) / 2);
  const twiceSide = toUnits(total - bar);
  if (twiceSide < 0) return { exact: false, tooLight: true, perSide: [], lower: null, higher: bar };
  if (twiceSide === 0) return { exact: true, tooLight: false, perSide: [], lower: null, higher: null };

  // Search space: every reachable per-side load, up to everything available.
  const items = plates
    .filter((p) => p.pairs > 0 && isValidPlateWeight(p.weight))
    .map((p) => ({ u: toUnits(p.weight), n: Math.min(p.pairs, 30), kg: p.weight }))
    .sort((a, b) => b.u - a.u);
  const max = items.reduce((s, it) => s + it.u * it.n, 0);

  // best[x] = fewest plates to load exactly x units per side; from[x] = last plate used.
  const best = new Array(max + 1).fill(Infinity);
  const from = new Array(max + 1).fill(-1);
  best[0] = 0;
  items.forEach((it, idx) => {
    for (let copy = 0; copy < it.n; copy++) {
      for (let x = max; x >= it.u; x--) {
        if (best[x - it.u] + 1 < best[x]) {
          best[x] = best[x - it.u] + 1;
          from[x] = idx;
        }
      }
    }
  });

  // Odd number of 50 g units can't be split evenly between two sides.
  const exact = twiceSide % 2 === 0 && sideUnits <= max && best[sideUnits] !== Infinity;
  if (exact) {
    const perSide = [];
    for (let x = sideUnits; x > 0; x -= items[from[x]].u) perSide.push(items[from[x]].kg);
    perSide.sort((a, b) => b - a);
    return { exact: true, tooLight: false, perSide, lower: null, higher: null };
  }

  let lower = null;
  for (let x = Math.min(Math.floor(twiceSide / 2), max); x >= 0; x--) {
    if (best[x] !== Infinity && 2 * x < twiceSide) {
      lower = toKg(toUnits(bar) + 2 * x);
      break;
    }
  }
  let higher = null;
  for (let x = Math.ceil(twiceSide / 2); x <= max; x++) {
    if (best[x] !== Infinity && 2 * x > twiceSide) {
      higher = toKg(toUnits(bar) + 2 * x);
      break;
    }
  }
  return { exact: false, tooLight: false, perSide: [], lower, higher };
}

// ── Loadable weights (for weekly progression) ────────────────
//
// ctx describes what can be loaded:
//   { kind: 'barbell', bar, plates }  — bar is the bar's weight in kg
//   { kind: 'machine', step }         — the weight stack moves in steps
// The three helpers below expect a usable ctx (see isUsableCtx) and return
// a weight, or null when nothing is loadable in that direction.

const round2 = (kg) => Math.round(kg * 100) / 100;
const EPS = 1e-9;

/** False when there is nothing to round against (no bar, no plates, no step). */
export function isUsableCtx(ctx) {
  if (ctx?.kind === 'machine') return ctx.step > 0;
  if (ctx?.kind === 'barbell') {
    return typeof ctx.bar === 'number' && ctx.bar >= 0 && (ctx.plates ?? []).some((p) => p.pairs > 0);
  }
  return false;
}

/** Smallest loadable weight ≥ kg (the bar itself when kg is below the bar). */
export function loadableAtLeast(kg, ctx) {
  if (ctx.kind === 'machine') return round2(Math.ceil(kg / ctx.step - EPS) * ctx.step);
  if (kg <= ctx.bar) return round2(ctx.bar);
  const r = solvePlates(kg, ctx.bar, ctx.plates);
  return r.exact ? round2(kg) : r.higher;
}

/** Largest loadable weight ≤ kg, or null below the bar (or below 0 on a machine). */
export function loadableAtMost(kg, ctx) {
  if (ctx.kind === 'machine') {
    const w = Math.floor(kg / ctx.step + EPS) * ctx.step;
    return w < 0 ? null : round2(w);
  }
  if (kg < ctx.bar) return null;
  const r = solvePlates(kg, ctx.bar, ctx.plates);
  return r.exact ? round2(kg) : r.lower;
}

/** The loadable weight closest to kg; on a tie the lower one. */
export function loadableNearest(kg, ctx) {
  const lo = loadableAtMost(kg, ctx);
  const hi = loadableAtLeast(kg, ctx);
  if (lo === null) return hi;
  if (hi === null) return lo;
  return hi - kg < kg - lo ? hi : lo;
}
