import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// Accounts are created on the server with `npm run user -- <username>`
// (see scripts/user.js) — there is no public sign-up.

// Compared against when the username doesn't exist, so a wrong username
// takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Tiny in-memory brute-force guard: max 10 failed logins per username per 15 min.
const failures = new Map();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;
function isLocked(username) {
  const f = failures.get(username);
  if (!f || Date.now() - f.first > WINDOW_MS) return false;
  return f.count >= MAX_FAILURES;
}
function recordFailure(username) {
  const f = failures.get(username);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(username, { first: Date.now(), count: 1 });
  else f.count += 1;
}

function readCredentials(body) {
  const username = String(body?.username ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { username, password };
}

router.post('/login', async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (isLocked(username)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  const user = username ? await User.findOne({ username }) : null;
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordFailure(username);
    return res.status(401).json({ error: 'Wrong username or password' });
  }
  failures.delete(username);
  res.json({ token: signToken(user), user });
});

// Change your own password. Wrong current password → 400 (not 401, so the
// app doesn't treat it as an expired login).
router.post('/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  if (isLocked(user.username)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    recordFailure(user.username);
    return res.status(400).json({ error: 'Current password is wrong' });
  }
  if (newPassword.length < 8 || newPassword.length > 200) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from the current one' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  failures.delete(user.username);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user });
});

export default router;
