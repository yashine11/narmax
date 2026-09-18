import { db } from '../config/database.js';

export async function addComment(userId, movieId, content, parentId = null) {
  if (parentId) {
    const p = await getCommentById(parentId);
    if (!p || p.movie_id !== movieId) {
      throw new Error('Invalid reply target');
    }
  }
  const info = await db
    .prepare('INSERT INTO comments (user_id, movie_id, content, parent_id) VALUES (?, ?, ?, ?)')
    .run(userId, movieId, content, parentId);
  return await getCommentById(Number(info.lastInsertRowid));
}

export async function getCommentById(id) {
  return await db
    .prepare(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`
    )
    .get(id);
}

export async function listCommentsFlat(movieId, viewerId = null) {
  const rows = await db
    .prepare(
      `SELECT c.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM comment_reactions r WHERE r.comment_id = c.id AND r.vote = 1) AS likes_up,
        (SELECT COUNT(*) FROM comment_reactions r WHERE r.comment_id = c.id AND r.vote = -1) AS likes_down
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.movie_id = ?
       ORDER BY c.created_at ASC`
    )
    .all(movieId);

  if (!viewerId) {
    return rows.map((r) => ({ ...r, my_vote: 0 }));
  }
  const votes = await db
    .prepare('SELECT comment_id, vote FROM comment_reactions WHERE user_id = ?')
    .all(viewerId);
  const map = {};
  votes.forEach((v) => {
    map[v.comment_id] = v.vote;
  });
  return rows.map((r) => ({ ...r, my_vote: map[r.id] ?? 0 }));
}

export async function setReaction(userId, commentId, vote) {
  if (vote === 0 || vote === null || vote === undefined) {
    await db.prepare('DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?').run(userId, commentId);
    return;
  }
  if (vote !== 1 && vote !== -1) return;
  const existing = await db
    .prepare('SELECT id FROM comment_reactions WHERE user_id = ? AND comment_id = ?')
    .get(userId, commentId);
  if (existing) {
    await db.prepare('UPDATE comment_reactions SET vote = ? WHERE user_id = ? AND comment_id = ?').run(vote, userId, commentId);
  } else {
    await db.prepare('INSERT INTO comment_reactions (comment_id, user_id, vote) VALUES (?, ?, ?)').run(commentId, userId, vote);
  }
}

export async function deleteCommentCascade(id) {
  const order = [];
  async function walk(cid) {
    const kids = await db.prepare('SELECT id FROM comments WHERE parent_id = ?').all(cid);
    for (const k of kids) {
      await walk(k.id);
    }
    order.push(cid);
  }
  await walk(id);
  for (const i of order) {
    await db.prepare('DELETE FROM comments WHERE id = ?').run(i);
  }
}

export async function deleteComment(id) {
  await deleteCommentCascade(id);
}

export async function countComments() {
  const row = await db.prepare('SELECT COUNT(*) as n FROM comments').get();
  return row ? row.n : 0;
}

