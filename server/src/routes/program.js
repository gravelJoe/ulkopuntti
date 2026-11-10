import { Router } from 'express';
import { Program } from '../models/Program.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ID = /^[A-Za-z0-9_-]{1,40}$/;

function bad(message) {
  const err = new Error(message);
  err.status = 400;
  err.expose = true;
  return err;
}

const text = (v, max, what) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s || s.length > max) throw bad(`${what} must be 1–${max} characters`);
  return s;
};

const PLACES = ['outdoor', 'indoor'];
const isPlateWeight = (w) => w > 0 && w <= 50 && Math.abs(w / 0.05 - Math.round(w / 0.05)) < 1e-6;

/** [{ weight, pairs }] — a plate set (gym's or the user's own). */
function cleanPlates(list, what) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || list.length > 20) throw bad(`Invalid ${what}`);
  const seen = new Set();
  return list.map((p) => {
    const weight = Number(p?.weight);
    const pairs = Number(p?.pairs);
    if (!isPlateWeight(weight)) throw bad('Plate weights must be 0.05–50 kg');
    if (!Number.isInteger(pairs) || pairs < 0 || pairs > 30) throw bad('Plate pairs must be 0–30');
    if (seen.has(weight)) throw bad('The same plate size is listed twice');
    seen.add(weight);
    return { weight, pairs };
  });
}

/** Validate and copy only known fields. Throws a 400 error on bad input. */
function clean(body) {
  if (!body || !Array.isArray(body.exercises) || !Array.isArray(body.workouts)) throw bad('Invalid program');
  const rawGyms = body.gyms ?? [];
  if (!Array.isArray(rawGyms)) throw bad('Invalid gyms');
  if (body.exercises.length > 300 || body.workouts.length > 50 || rawGyms.length > 20) throw bad('Program is too large');

  // Exercises belong to one place; indoor ones are either machine or barbell.
  const exercisePlace = new Map();
  const exercises = body.exercises.map((e) => {
    if (!ID.test(e?.id ?? '') || exercisePlace.has(e.id)) throw bad('Invalid exercise id');
    const sets = Number(e.sets);
    const step = Number(e.step);
    if (!Number.isInteger(sets) || sets < 1 || sets > 10) throw bad('Sets must be 1–10');
    if (!(step >= 0.25 && step <= 50)) throw bad('Weight step must be 0.25–50 kg');
    const place = PLACES.includes(e.place) ? e.place : 'outdoor';
    exercisePlace.set(e.id, place);
    return {
      id: e.id,
      name: text(e.name, 40, 'Exercise name'),
      place,
      kind: e.kind === 'barbell' ? 'barbell' : 'machine',
      sets,
      step,
      archived: Boolean(e.archived),
    };
  });

  const workoutIds = new Set();
  const usedDays = new Set();
  const workouts = body.workouts.map((w) => {
    if (!ID.test(w?.id ?? '') || workoutIds.has(w.id)) throw bad('Invalid workout id');
    workoutIds.add(w.id);
    const archived = Boolean(w.archived);
    const place = PLACES.includes(w.place) ? w.place : 'outdoor';
    const weekday = w.weekday === null || w.weekday === undefined ? null : Number(w.weekday);
    if (weekday !== null && !(Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)) throw bad('Invalid day');
    // One workout per day per place (Monday outdoors and Monday indoors can differ).
    if (weekday !== null && !archived) {
      const key = `${place}:${weekday}`;
      if (usedDays.has(key)) throw bad('Two workouts on the same day');
      usedDays.add(key);
    }
    if (!Array.isArray(w.slots) || w.slots.length > 20) throw bad('Invalid exercises in workout');
    const slots = w.slots.map((s) => {
      if (!Array.isArray(s?.options) || s.options.length < 1 || s.options.length > 6) throw bad('Invalid exercise slot');
      for (const id of s.options) {
        if (!exercisePlace.has(id)) throw bad('Workout uses an unknown exercise');
        if (!archived && exercisePlace.get(id) !== place) throw bad(`An ${place} workout can only use ${place} exercises`);
      }
      return { options: [...s.options] };
    });
    return {
      id: w.id,
      name: text(w.name, 40, 'Workout name'),
      badge: text(w.badge, 3, 'Badge'),
      place,
      weekday: archived ? null : weekday,
      slots,
      archived,
    };
  });

  // Indoor gyms: optional location (for automatic detection), plates, bars.
  const gymIds = new Set();
  const gyms = rawGyms.map((g) => {
    if (!ID.test(g?.id ?? '') || gymIds.has(g.id)) throw bad('Invalid gym id');
    gymIds.add(g.id);
    const hasLocation = g.lat !== null && g.lat !== undefined && g.lon !== null && g.lon !== undefined;
    const lat = hasLocation ? Number(g.lat) : null;
    const lon = hasLocation ? Number(g.lon) : null;
    if (hasLocation && !(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) throw bad('Invalid gym location');
    const radius = Number(g.radius ?? 200);
    if (!(radius >= 50 && radius <= 2000)) throw bad('Gym radius must be 50–2000 m');
    if (!Array.isArray(g.bars ?? []) || (g.bars ?? []).length > 10) throw bad('Invalid bars');
    const barIds = new Set();
    const bars = (g.bars ?? []).map((b) => {
      if (!ID.test(b?.id ?? '') || barIds.has(b.id)) throw bad('Invalid bar id');
      barIds.add(b.id);
      const weight = Number(b.weight);
      if (!(weight >= 0 && weight <= 100)) throw bad('Bar weight must be 0–100 kg');
      return { id: b.id, name: text(b.name, 30, 'Bar name'), weight };
    });
    return {
      id: g.id,
      name: text(g.name, 40, 'Gym name'),
      lat,
      lon,
      radius,
      plateSource: g.plateSource === 'own' ? 'own' : 'gym',
      plates: cleanPlates(g.plates, 'plates'),
      bars,
    };
  });

  const trainingMode = ['outdoor', 'indoor', 'both'].includes(body.trainingMode) ? body.trainingMode : 'outdoor';
  const ownPlates = cleanPlates(body.ownPlates, 'own plates');

  return { exercises, workouts, gyms, ownPlates, trainingMode };
}

// null until the user saves their first change — the app then uses the default program.
router.get('/', async (req, res) => {
  const program = await Program.findOne({ userId: req.userId });
  res.json({ program });
});

router.put('/', async (req, res) => {
  const fields = clean(req.body);
  const program = await Program.findOneAndUpdate(
    { userId: req.userId },
    { $set: fields },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  res.json({ program });
});

export default router;
