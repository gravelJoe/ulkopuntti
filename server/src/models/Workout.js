import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true, maxlength: 40 },
    weight: { type: Number, required: true, min: 0, max: 999 },
    sets: { type: [Boolean], required: true, validate: (v) => v.length >= 1 && v.length <= 20 },
    // Barbell exercises indoors: which bar was used (so it can be preselected next time).
    bar: {
      type: new mongoose.Schema(
        { name: { type: String, maxlength: 30 }, weight: { type: Number, min: 0, max: 100 } },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { _id: false },
);

const workoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The id the app generates. Saving the same clientId twice updates
    // instead of duplicating (safe to retry after a network error).
    clientId: { type: String, required: true, maxlength: 64 },
    workoutId: { type: String, required: true, maxlength: 40 },
    // Indoor and outdoor weights are kept apart for prefill.
    place: { type: String, enum: ['outdoor', 'indoor'], default: 'outdoor' },
    // Indoor: which gym (weights are remembered per gym).
    gymId: { type: String, maxlength: 40, default: null },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    exercises: { type: [exerciseSchema], validate: (v) => v.length <= 20 },
  },
  { timestamps: true },
);

workoutSchema.index({ userId: 1, clientId: 1 }, { unique: true });
workoutSchema.index({ userId: 1, finishedAt: -1 });

// Same shape the app uses: { id, workoutId, startedAt, finishedAt, exercises }
workoutSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret.clientId,
    workoutId: ret.workoutId,
    place: ret.place ?? 'outdoor',
    gymId: ret.gymId ?? null,
    startedAt: ret.startedAt.toISOString(),
    finishedAt: ret.finishedAt.toISOString(),
    exercises: ret.exercises,
  }),
});

export const Workout = mongoose.model('Workout', workoutSchema);
