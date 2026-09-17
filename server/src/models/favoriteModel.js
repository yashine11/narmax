import { db } from '../config/database.js';

export function addFavorite(userId, movieId) {
  const r = db.prepare('INSERT OR IGNORE INTO favorites (user_id, movie_id) VALUES (?, ?)').run(userId, movieId);
  return r.changes > 0;
}

export function removeFavorite(userId, movieId) {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?').run(userId, movieId);
}

export function isFavorite(userId, movieId) {
  const row = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?')
    .get(userId, movieId);
  return !!row;
}

export function listFavorites(userId) {
  return db
    .prepare(
      `SELECT m.* FROM favorites f
       JOIN movies m ON m.id = f.movie_id
       WHERE f.user_id = ?
       ORDER BY f.id DESC`
    )
    .all(userId);
}
