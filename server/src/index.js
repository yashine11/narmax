import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { initSchema, db } from './config/database.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust the first proxy (Back4App / Render / Koyeb / etc.) so express-rate-limit works
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

if (!process.env.VERCEL) {
  try {
    fs.mkdirSync(path.join(publicDir, 'uploads'), { recursive: true });
  } catch (_e) {}
}
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

let initPromise = null;
function getInitPromise() {
  if (!initPromise) {
    initPromise = (async () => {
      await initSchema();
      await seedDefaults();
    })();
  }
  return initPromise;
}

// Ensure database schema is ready on cold starts
app.use(async (_req, _res, next) => {
  try {
    await getInitPromise();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    next(err);
  }
});

app.get('/', (_req, res) => res.json({ ok: true, service: 'narmax' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'narmax' }));
app.use('/api', routes);

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  if (err.message === 'Images only') {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message || String(err)
  });
});

async function seedDefaults() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@narmax.local').toLowerCase();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || 'ChangeMeAdmin123!';
    const hash = await bcrypt.hash(password, 12);
    await db
      .prepare(
        `INSERT INTO users (username, email, password, avatar, role)
         VALUES (?, ?, ?, '/uploads/default-avatar.svg', 'admin')`
      )
      .run(process.env.ADMIN_USERNAME || 'admin', adminEmail, hash);
    console.log('Seeded admin user:', adminEmail);
  }

  const kids = await db.prepare('SELECT id FROM kids_access LIMIT 1').get();
  if (!kids) {
    const code = process.env.KIDS_DEFAULT_CODE || '1234';
    const kh = await bcrypt.hash(String(code), 12);
    await db.prepare('INSERT INTO kids_access (access_code) VALUES (?)').run(kh);
    console.log('Seeded kids access code (change in production):', code);
  }
}

async function startServer() {
  try {
    await getInitPromise();
    app.listen(PORT, () => {
      console.log(`NARMAX API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;


