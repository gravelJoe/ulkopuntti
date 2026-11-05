import mongoose from 'mongoose';

export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,20}$/;

const userSchema = new mongoose.Schema(
  {
    // Stored lowercase so login is case-insensitive.
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: USERNAME_PATTERN },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (doc, ret) => ({ id: String(ret._id), username: ret.username }),
});

export const User = mongoose.model('User', userSchema);
