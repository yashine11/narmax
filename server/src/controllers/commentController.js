import { ensureMovieFromTmdb, getMovieByTmdbId } from '../models/movieModel.js';
import * as comments from '../models/commentModel.js';
import { createNotification } from '../controllers/notificationController.js';
import { db } from '../config/database.js';

export async function list(req, res) {
  const movieId = Number(req.params.movieId);
  if (!movieId) return res.status(400).json({ message: 'Invalid movie id' });
  const viewerId = req.user?.id ?? null;
  const rows = await comments.listCommentsFlat(movieId, viewerId);
  return res.json({ comments: rows });
}

export async function listByTmdb(req, res) {
  const tmdbId = Number(req.params.tmdbId);
  if (!tmdbId) return res.status(400).json({ message: 'Invalid tmdb id' });
  const mediaType = req.query.type === 'tv' ? 'tv' : 'movie';
  const movie = await getMovieByTmdbId(tmdbId, mediaType);
  if (!movie) return res.json({ comments: [], movieId: null });
  const viewerId = req.user?.id ?? null;
  const rows = await comments.listCommentsFlat(movie.id, viewerId);
  return res.json({ comments: rows, movieId: movie.id });
}

export async function create(req, res) {
  try {
    const { tmdbId, content, parent_id } = req.body;
    const tmdb = Number(tmdbId);
    if (!tmdb || !content || !String(content).trim()) {
      return res.status(400).json({ message: 'tmdbId and content are required' });
    }
    if (String(content).length > 2000) {
      return res.status(400).json({ message: 'Comment too long' });
    }

    const mediaType = req.body.media_type === 'tv' ? 'tv' : 'movie';
    const movie = await ensureMovieFromTmdb({
      tmdb_id: tmdb,
      title: req.body.title || `TMDB ${tmdb}`,
      description: req.body.overview || '',
      category: '',
      image: req.body.poster_path || '',
      rating: req.body.vote_average ?? 0,
      media_type: mediaType,
    });

    const parentId = parent_id != null ? Number(parent_id) : null;
    const full = await comments.addComment(req.user.id, movie.id, String(content).trim(), parentId || null);

    // Notify the original commenter about the reply
    if (parentId) {
      const parent = await comments.getCommentById(parentId);
      if (parent && parent.user_id !== req.user.id) {
        const replierName = req.user.username || 'Someone';
        const movieTitle = full.title || movie.title || 'a title';
        await createNotification(
          parent.user_id,
          'reply',
          `${replierName} replied to your comment`,
          `"${String(content).trim().slice(0, 80)}"`,
          `/${movie.media_type === 'tv' ? 'tv' : 'movie'}/${movie.tmdb_id || movie.id}`
        );
      }
    }

    return res.status(201).json({ comment: full });
  } catch (e) {
    if (e.message === 'Invalid reply target') {
      return res.status(400).json({ message: e.message });
    }
    throw e;
  }
}

export async function react(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const row = await comments.getCommentById(id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    let vote = req.body?.vote;
    if (vote === 'up') vote = 1;
    if (vote === 'down') vote = -1;
    vote = Number(vote);
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return res.status(400).json({ message: 'vote must be 1, -1, or 0' });
    }
    await comments.setReaction(req.user.id, id, vote);
    const flat = await comments.listCommentsFlat(row.movie_id, req.user.id);
    const updated = flat.find((c) => Number(c.id) === id) || null;
    return res.json({ ok: true, comment: updated });
  } catch (e) {
    console.error('comment react:', e);
    return res.status(500).json({ message: e.message || 'Vote failed' });
  }
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const row = await comments.getCommentById(id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await comments.deleteComment(id);
  return res.json({ ok: true });
}

