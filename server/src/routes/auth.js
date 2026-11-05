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

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user });
});

export default router;
