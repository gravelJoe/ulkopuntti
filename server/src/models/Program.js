import mongoose from 'mongoose';

// One program per user: their exercise library and workouts.
// Shape is validated in routes/program.js; stored as plain data.
//
// exercises: [{ id, name, place, kind ('machine'|'barbell'), sets, step, archived?, restSeconds (null | 30–600 s, steps of 15) }]
// workouts:  [{ id, name, badge, place, weekday (0–6 | null), slots: [{ options: [exerciseId] }], archived? }]
// gyms:      [{ id, name, lat?, lon?, radius, plateSource ('gym'|'own'), plates: [{ weight, pairs }], bars: [{ id, name, weight }] }]
// ownPlates: [{ weight, pairs }] — the user's own plate set
// trainingMode: 'outdoor' | 'indoor' | 'both' (both = detect with GPS)
// holdWeeks: weeks a lowered weight is held after a Go down (0 = no hold)
// alarmTune: id of the rest alarm tune (the app lists the ids; unknown ids play 'beep')
// ringWhenSilent: play the alarm in iPhone silent mode (pauses music)
// Indoor exercises may also carry progression: { increase, anchor?: { weight, at } }
const programSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    exercises: { type: [mongoose.Schema.Types.Mixed], default: [] },
    workouts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    gyms: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ownPlates: { type: [mongoose.Schema.Types.Mixed], default: [] },
    trainingMode: { type: String, enum: ['outdoor', 'indoor', 'both'], default: 'outdoor' },
    holdWeeks: { type: Number, default: 1 },
    alarmTune: { type: String, default: 'beep' },
    ringWhenSilent: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);

programSchema.set('toJSON', {
  transform: (doc, ret) => ({
    exercises: ret.exercises,
    workouts: ret.workouts,
    gyms: ret.gyms ?? [],
    ownPlates: ret.ownPlates ?? [],
    trainingMode: ret.trainingMode ?? 'outdoor',
    holdWeeks: ret.holdWeeks ?? 1,
    alarmTune: ret.alarmTune ?? 'beep',
    ringWhenSilent: ret.ringWhenSilent ?? true,
  }),
});

export const Program = mongoose.model('Program', programSchema);
