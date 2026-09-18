import bcrypt from 'bcryptjs';
import { findUserById, updateProfile, updateUserPassword } from '../models/userModel.js';
import { ensureMovieFromTmdb, getMovieByTmdbId } from '../models/movieModel.js';
import * as favorites from '../models/favoriteModel.js';
import * as history from '../models/watchHistoryModel.js';

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  });
}

export async function updateMe(req, res) {
  try {
    const { username } = req.body;
    let avatar = undefined;
    if (req.file) {
      avatar = `/uploads/${req.file.filename}`;
    }
    const user = await updateProfile(req.user.id, { username, avatar });
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Profile update failed' });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(String(currentPassword), user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const nextHash = await bcrypt.hash(String(newPassword), 12);
    await updateUserPassword(req.user.id, nextHash);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Password update failed' });
  }
}

export async function listFavorites(req, res) {
  const rows = await favorites.listFavorites(req.user.id);
  return res.json({ favorites: rows });
}

export async function addFavorite(req, res) {
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

  await favorites.addFavorite(req.user.id, movie.id);
  return res.json({ ok: true, movieId: movie.id });
}

export async function removeFavorite(req, res) {
  const movieId = Number(req.params.movieId);
  if (!movieId) return res.status(400).json({ message: 'Invalid movie id' });
  await favorites.removeFavorite(req.user.id, movieId);
  return res.json({ ok: true });
}

export async function favoriteStatus(req, res) {
  const tmdbId = Number(req.query.tmdbId);
  if (!tmdbId) return res.status(400).json({ message: 'tmdbId required' });
  const mediaType = req.query.type === 'tv' ? 'tv' : 'movie';
  const m = await getMovieByTmdbId(tmdbId, mediaType);
  if (!m) return res.json({ inList: false, movieId: null });
  const inList = await favorites.isFavorite(req.user.id, m.id);
  return res.json({
    inList,
    movieId: m.id,
  });
}

