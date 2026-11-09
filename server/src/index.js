import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';
import programRoutes from './routes/program.js';

const isProduction = process.env.NODE_ENV === 'production';
const {
  MONGODB_URI,
  JWT_SECRET,
  PORT = 4000,
  // Dev: only reachable from this Mac (the phone goes through the Vite proxy).
  // Production: the host's load balancer needs to reach it.
  HOST = isProduction ? '0.0.0.0' : '127.0.0.1',
} = process.env;

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Missing MONGODB_URI or JWT_SECRET — copy server/.env.example to server/.env');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/program', programRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the same server also serves the built app (npm run build → dist/).
if (isProduction) {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
  app.use(
    express.static(distDir, {
      setHeaders(res, filePath) {
        // Hashed files never change; everything else must be re-checked.
        res.setHeader(
          'Cache-Control',
          filePath.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  app.get('/{*path}', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Express 5 forwards errors from async handlers here.
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  if (err.expose) return res.status(err.status ?? 400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

// Local development only: make sure the "dev" test account exists, so the
// welcome screen's dev login button works. Never runs on Render.
if (!isProduction) {
  const { ensureDevUser } = await import('./devUser.js');
  await ensureDevUser();
}

app.listen(PORT, HOST, () => console.log(`Listening on http://${HOST}:${PORT}`));
