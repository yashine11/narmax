import { db } from '../config/database.js';

export async function ensureMovieFromTmdb(row) {
  const mediaType = row.media_type === 'tv' ? 'tv' : 'movie';
  const existing = await db
    .prepare('SELECT * FROM movies WHERE tmdb_id = ? AND media_type = ?')
    .get(row.tmdb_id, mediaType);
  if (existing) return existing;

  const info = await db
    .prepare(
      `INSERT INTO movies (title, description, category, image, video_url, rating, tmdb_id, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.title,
      row.description ?? '',
      row.category ?? '',
      row.image ?? '',
      row.video_url ?? '',
      row.rating ?? 0,
      row.tmdb_id,
      mediaType
    );

  const rid = Number(info.lastInsertRowid);
  return await db.prepare('SELECT * FROM movies WHERE id = ?').get(rid);
}

export async function getMovieById(id) {
  return await db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
}

export async function getMovieByTmdbId(tmdbId, mediaType = 'movie') {
  const mt = mediaType === 'tv' ? 'tv' : 'movie';
  return await db.prepare('SELECT * FROM movies WHERE tmdb_id = ? AND media_type = ?').get(tmdbId, mt);
}

export async function listMoviesAdmin({ limit = 100, offset = 0 } = {}) {
  return await db
    .prepare('SELECT * FROM movies ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
}

export async function createMovie(data) {
  const info = await db
    .prepare(
      `INSERT INTO movies (title, description, category, image, video_url, rating, tmdb_id, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.title,
      data.description ?? '',
      data.category ?? '',
      data.image ?? '',
      data.video_url ?? '',
      data.rating ?? 0,
      data.tmdb_id ?? null,
      data.media_type === 'tv' ? 'tv' : 'movie'
    );
  return await getMovieById(Number(info.lastInsertRowid));
}

export async function updateMovie(id, data) {
  const fields = [];
  const vals = [];
  ['title', 'description', 'category', 'image', 'video_url', 'rating', 'tmdb_id', 'media_type'].forEach((k) => {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      const v = k === 'media_type' ? (data[k] === 'tv' ? 'tv' : 'movie') : data[k];
      vals.push(v);
    }
  });
  if (!fields.length) return await getMovieById(id);
  vals.push(id);
  await db.prepare(`UPDATE movies SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return await getMovieById(id);
}

export async function deleteMovie(id) {
  await db.prepare('DELETE FROM movies WHERE id = ?').run(id);
}

