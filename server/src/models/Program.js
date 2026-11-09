import mongoose from 'mongoose';

// One program per user: their exercise library and workouts.
// Shape is validated in routes/program.js; stored as plain data.
//
// exercises: [{ id, name, sets, step, archived? }]
// workouts:  [{ id, name, badge, weekday (0–6 | null), slots: [{ options: [exerciseId] }], archived? }]
const programSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    exercises: { type: [mongoose.Schema.Types.Mixed], default: [] },
    workouts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false },
);

programSchema.set('toJSON', {
  transform: (doc, ret) => ({ exercises: ret.exercises, workouts: ret.workouts }),
});

export const Program = mongoose.model('Program', programSchema);
