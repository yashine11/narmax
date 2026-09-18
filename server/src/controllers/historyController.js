import { ensureMovieFromTmdb } from '../models/movieModel.js';
import * as history from '../models/watchHistoryModel.js';

export async function list(req, res) {
  const rows = await history.listHistory(req.user.id);
  return res.json({ history: rows });
}

export async function add(req, res) {
  const tmdbId = Number(req.body.tmdbId);
  if (!tmdbId) return res.status(400).json({ message: 'tmdbId required' });
  const body = req.body;
  const mediaType = body.media_type === 'tv' ? 'tv' : 'movie';
  const movie = await ensureMovieFromTmdb({
    tmdb_id: tmdbId,
    title: body.title || `TMDB ${tmdbId}`,
    description: body.overview || '',
    category: body.category || '',
    image: body.poster_path || '',
    rating: body.vote_average ?? 0,
    media_type: mediaType,
  });
  const progress = body.progress_percent != null ? Number(body.progress_percent) : body.completed ? 100 : 0;
  const completed = !!body.completed || progress >= 90;
  await history.upsertWatchProgress(req.user.id, movie.id, progress, completed);
  return res.json({ ok: true, movieId: movie.id });
}

export async function progressList(req, res) {
  const rows = await history.listProgressByTmdb(req.user.id);
  return res.json({ progress: rows });
}

