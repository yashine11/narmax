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

initSchema();
seedDefaults();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust the first proxy (Back4App / Render / etc.) so express-rate-limit works
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

fs.mkdirSync(path.join(publicDir, 'uploads'), { recursive: true });
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'narmax' }));
app.use('/api', routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === 'Images only') {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`NARMAX API listening on http://localhost:${PORT}`);
});

function seedDefaults() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@narmax.local').toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || 'ChangeMeAdmin123!';
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      `INSERT INTO users (username, email, password, avatar, role)
       VALUES (?, ?, ?, '/uploads/default-avatar.svg', 'admin')`
    ).run(process.env.ADMIN_USERNAME || 'admin', adminEmail, hash);
    console.log('Seeded admin user:', adminEmail);
  }

  const kids = db.prepare('SELECT id FROM kids_access LIMIT 1').get();
  if (!kids) {
    const code = process.env.KIDS_DEFAULT_CODE || '1234';
    const kh = bcrypt.hashSync(String(code), 12);
    db.prepare('INSERT INTO kids_access (access_code) VALUES (?)').run(kh);
    console.log('Seeded kids access code (change in production):', code);
  }
}
