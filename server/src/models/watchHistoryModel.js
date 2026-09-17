import { db } from '../config/database.js';

export function recordWatch(userId, movieId) {
  upsertWatchProgress(userId, movieId, 100, true);
}

export function upsertWatchProgress(userId, movieId, progressPercent, completed) {
  const p = Math.min(100, Math.max(0, Number(progressPercent) || 0));
  const done = completed ? 1 : 0;
  const finalP = done ? 100 : p;
  db.prepare(
    `INSERT INTO watch_history (user_id, movie_id, progress_percent, completed, watched_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, movie_id) DO UPDATE SET
       progress_percent = excluded.progress_percent,
       completed = CASE WHEN excluded.completed = 1 THEN 1 ELSE watch_history.completed END,
       watched_at = datetime('now')`
  ).run(userId, movieId, finalP, done);
}

export function listHistory(userId, limit = 50) {
  return db
    .prepare(
      `SELECT m.*, w.watched_at, w.progress_percent, w.completed FROM watch_history w
       JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ?
       ORDER BY w.watched_at DESC
       LIMIT ?`
    )
    .all(userId, limit);
}

export function listProgressByTmdb(userId) {
  return db
    .prepare(
      `SELECT m.tmdb_id, m.media_type, w.progress_percent, w.completed
       FROM watch_history w
       JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ? AND m.tmdb_id IS NOT NULL`
    )
    .all(userId);
}
