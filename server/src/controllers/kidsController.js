import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getKidsCodeRow, setKidsCodeHash } from '../models/kidsModel.js';
import { discoverKids } from '../services/tmdbService.js';

const IMG_W342 = process.env.IMG_W342 || 'https://image.tmdb.org/t/p/w342';
const IMG_W1280 = process.env.IMG_W1280 || 'https://image.tmdb.org/t/p/w1280';

function mapMovie(m) {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster_path: m.poster_path ? `${IMG_W342}${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG_W1280}${m.backdrop_path}` : null,
    vote_average: m.vote_average,
    genre_ids: m.genre_ids,
    release_date: m.release_date,
  };
}

function signKidsToken() {
  return jwt.sign({ scope: 'kids' }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export async function enter(req, res) {
  const { code } = req.body;
  if (!code || String(code).length < 2) {
    return res.status(400).json({ message: 'Code required' });
  }
  const row = getKidsCodeRow();
  if (!row) {
    return res.status(503).json({ message: 'Kids access not configured' });
  }
  const ok = await bcrypt.compare(String(code), row.access_code);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid code' });
  }
  return res.json({ token: signKidsToken() });
}

export async function exitKids(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: 'Code required' });
  const row = getKidsCodeRow();
  if (!row) return res.status(503).json({ message: 'Not configured' });
  const ok = await bcrypt.compare(String(code), row.access_code);
  if (!ok) return res.status(401).json({ message: 'Invalid code' });
  return res.json({ ok: true });
}

export async function setCode(req, res) {
  const { code } = req.body;
  if (!code || String(code).length < 4) {
    return res.status(400).json({ message: 'Code must be at least 4 characters' });
  }
  const hash = await bcrypt.hash(String(code), 12);
  setKidsCodeHash(hash);
  return res.json({ ok: true });
}

export async function kidsFeed(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const data = await discoverKids(page);
    return res.json({
      page: data.page,
      total_pages: data.total_pages,
      results: (data.results || []).map(mapMovie),
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load kids content' });
  }
}
