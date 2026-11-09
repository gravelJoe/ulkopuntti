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

/** Validate and copy only known fields. Throws a 400 error on bad input. */
function clean(body) {
  if (!body || !Array.isArray(body.exercises) || !Array.isArray(body.workouts)) throw bad('Invalid program');
  if (body.exercises.length > 200 || body.workouts.length > 50) throw bad('Program is too large');

  const exerciseIds = new Set();
  const exercises = body.exercises.map((e) => {
    if (!ID.test(e?.id ?? '') || exerciseIds.has(e.id)) throw bad('Invalid exercise id');
    exerciseIds.add(e.id);
    const sets = Number(e.sets);
    const step = Number(e.step);
    if (!Number.isInteger(sets) || sets < 1 || sets > 10) throw bad('Sets must be 1–10');
    if (!(step >= 0.25 && step <= 50)) throw bad('Weight step must be 0.25–50 kg');
    return { id: e.id, name: text(e.name, 40, 'Exercise name'), sets, step, archived: Boolean(e.archived) };
  });

  const workoutIds = new Set();
  const usedDays = new Set();
  const workouts = body.workouts.map((w) => {
    if (!ID.test(w?.id ?? '') || workoutIds.has(w.id)) throw bad('Invalid workout id');
    workoutIds.add(w.id);
    const archived = Boolean(w.archived);
    const weekday = w.weekday === null || w.weekday === undefined ? null : Number(w.weekday);
    if (weekday !== null && !(Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)) throw bad('Invalid day');
    if (weekday !== null && !archived) {
      if (usedDays.has(weekday)) throw bad('Two workouts on the same day');
      usedDays.add(weekday);
    }
    if (!Array.isArray(w.slots) || w.slots.length > 20) throw bad('Invalid exercises in workout');
    const slots = w.slots.map((s) => {
      if (!Array.isArray(s?.options) || s.options.length < 1 || s.options.length > 6) throw bad('Invalid exercise slot');
      for (const id of s.options) if (!exerciseIds.has(id)) throw bad('Workout uses an unknown exercise');
      return { options: [...s.options] };
    });
    return {
      id: w.id,
      name: text(w.name, 40, 'Workout name'),
      badge: text(w.badge, 3, 'Badge'),
      weekday: archived ? null : weekday,
      slots,
      archived,
    };
  });

  return { exercises, workouts };
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
