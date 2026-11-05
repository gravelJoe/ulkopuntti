import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true, maxlength: 40 },
    weight: { type: Number, required: true, min: 0, max: 999 },
    sets: { type: [Boolean], required: true, validate: (v) => v.length >= 1 && v.length <= 20 },
  },
  { _id: false },
);

const workoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The id the app generates. Saving the same clientId twice updates
    // instead of duplicating (safe to retry after a network error).
    clientId: { type: String, required: true, maxlength: 64 },
    workoutId: { type: String, required: true, maxlength: 10 },
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
    startedAt: ret.startedAt.toISOString(),
    finishedAt: ret.finishedAt.toISOString(),
    exercises: ret.exercises,
  }),
});

export const Workout = mongoose.model('Workout', workoutSchema);
