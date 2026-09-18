import { db } from '../config/database.js';

export async function addFavorite(userId, movieId) {
  const r = await db.prepare('INSERT OR IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)').run(userId, movieId);
  return r.changes > 0;
}

export async function removeFavorite(userId, movieId) {
  await db.prepare('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?').run(userId, movieId);
}

export async function isFavorite(userId, movieId) {
  const row = await db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?')
    .get(userId, movieId);
  return !!row;
}

export async function listFavorites(userId) {
  return await db
    .prepare(
      `SELECT m.* FROM favorites f
       JOIN movies m ON m.id = f.movie_id
       WHERE f.user_id = ?
       ORDER BY f.id DESC`
    )
    .all(userId);
}

