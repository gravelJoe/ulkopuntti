import { Router } from 'express';
import { Workout } from '../models/Workout.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Every query is scoped to req.userId — users only ever see their own data.

router.get('/', async (req, res) => {
  const workouts = await Workout.find({ userId: req.userId }).sort({ finishedAt: -1 }).limit(1000);
  res.json({ workouts });
});

router.get('/:id', async (req, res) => {
  const workout = await Workout.findOne({ userId: req.userId, clientId: req.params.id });
  if (!workout) return res.status(404).json({ error: 'Not found' });
  res.json({ workout });
});

router.post('/', async (req, res) => {
  const b = req.body ?? {};
  if (typeof b.id !== 'string' || !b.id) return res.status(400).json({ error: 'Missing id' });

  // Only copy known fields; never trust userId from the client.
  const fields = {
    workoutId: b.workoutId,
    place: b.place === 'indoor' ? 'indoor' : 'outdoor',
    gymId: typeof b.gymId === 'string' ? b.gymId.slice(0, 40) : null,
    startedAt: b.startedAt,
    finishedAt: b.finishedAt,
    exercises: Array.isArray(b.exercises)
      ? b.exercises.map((e) => ({
          exerciseId: e?.exerciseId,
          weight: e?.weight,
          sets: e?.sets,
          ...(e?.bar ? { bar: { name: e.bar.name, weight: e.bar.weight } } : {}),
        }))
      : [],
  };

  const workout = await Workout.findOneAndUpdate(
    { userId: req.userId, clientId: b.id },
    { $set: fields },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ workout });
});

router.delete('/:id', async (req, res) => {
  await Workout.deleteOne({ userId: req.userId, clientId: req.params.id });
  res.status(204).end();
});

export default router;
