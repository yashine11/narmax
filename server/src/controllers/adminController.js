import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import * as movieModel from '../models/movieModel.js';
import * as userModel from '../models/userModel.js';
import * as commentModel from '../models/commentModel.js';
import { delCachePattern } from '../services/cacheService.js';
import { createNotification } from '../controllers/notificationController.js';

export async function dashboard(req, res) {
  const users = (await db.prepare('SELECT COUNT(*) as n FROM users').get())?.n ?? 0;
  const movies = (await db.prepare('SELECT COUNT(*) as n FROM movies').get())?.n ?? 0;
  const comments = (await db.prepare('SELECT COUNT(*) as n FROM comments').get())?.n ?? 0;
  const favorites = (await db.prepare('SELECT COUNT(*) as n FROM favorites').get())?.n ?? 0;
  return res.json({ users, movies, comments, favorites });
}

export async function listMovies(req, res) {
  const rows = await movieModel.listMoviesAdmin({ limit: 500, offset: 0 });
  return res.json({ movies: rows });
}

export async function createMovie(req, res) {
  const b = req.body;
  if (!b.title) return res.status(400).json({ message: 'Title required' });
  let image = b.image || '';
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
  }
  const row = await movieModel.createMovie({
    title: b.title,
    description: b.description,
    category: b.category,
    image,
    video_url: b.video_url,
    rating: Number(b.rating) || 0,
    tmdb_id: b.tmdb_id ? Number(b.tmdb_id) : null,
    media_type: b.media_type,
  });
  delCachePattern('tmdb:');
  return res.status(201).json({ movie: row });
}

export async function patchMovie(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const b = req.body;
  const data = { ...b };
  if (req.file) {
    data.image = `/uploads/${req.file.filename}`;
  }
  if (data.rating !== undefined) data.rating = Number(data.rating);
  if (data.tmdb_id !== undefined) data.tmdb_id = data.tmdb_id ? Number(data.tmdb_id) : null;
  const row = await movieModel.updateMovie(id, data);
  if (!row) return res.status(404).json({ message: 'Not found' });
  delCachePattern('tmdb:');
  return res.json({ movie: row });
}

export async function removeMovie(req, res) {
  const id = Number(req.params.id);
  await movieModel.deleteMovie(id);
  delCachePattern('tmdb:');
  return res.json({ ok: true });
}

export async function listUsers(req, res) {
  const rows = await userModel.listUsersAdmin({ limit: 500, offset: 0 });
  return res.json({ users: rows });
}

export async function patchUser(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const b = req.body;
  const data = {};
  if (b.username !== undefined) data.username = b.username;
  if (b.email !== undefined) data.email = b.email;
  if (b.role !== undefined) data.role = b.role;
  if (b.password && String(b.password).length >= 8) {
    data.passwordHash = await bcrypt.hash(String(b.password), 12);
  }
  if (req.file) {
    data.avatar = `/uploads/${req.file.filename}`;
  }
  try {
    const row = await userModel.updateUserAdmin(id, data);
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        avatar: row.avatar,
        role: row.role,
      },
    });
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      return res.status(409).json({ message: 'Email or username already taken' });
    }
    throw e;
  }
}

export async function removeUser(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete yourself' });
  }
  await userModel.deleteUser(id);
  return res.json({ ok: true });
}

export async function listComments(req, res) {
  const rows = await db
    .prepare(
      `SELECT c.*, u.username, m.title as movie_title FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN movies m ON m.id = c.movie_id
       ORDER BY c.created_at DESC
       LIMIT 500`
    )
    .all();
  return res.json({ comments: rows });
}

export async function removeComment(req, res) {
  const id = Number(req.params.id);
  await commentModel.deleteComment(id);
  return res.json({ ok: true });
}


export async function broadcastMessage(req, res) {
  try {
    const { target, message, title, link } = req.body;
    if (!message || !title) {
      return res.status(400).json({ message: 'title and message required' });
    }
    const users = await db.prepare('SELECT id FROM users').all();
    let targetIds = [];
    if (target === 'all') {
      targetIds = users.map(u => u.id);
    } else if (target === 'user') {
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: 'username required' });
      const u = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (!u) return res.status(404).json({ message: 'User not found' });
      targetIds = [u.id];
    } else {
      return res.status(400).json({ message: 'Invalid target' });
    }
    for (const uid of targetIds) {
      await createNotification(uid, 'admin', title, message, link || null);
    }
    return res.json({ success: true, sent: targetIds.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to broadcast' });
  }
}
