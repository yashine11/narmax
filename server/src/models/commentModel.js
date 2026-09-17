import { db } from '../config/database.js';

export function addComment(userId, movieId, content, parentId = null) {
  if (parentId) {
    const p = getCommentById(parentId);
    if (!p || p.movie_id !== movieId) {
      throw new Error('Invalid reply target');
    }
  }
  const info = db
    .prepare('INSERT INTO comments (user_id, movie_id, content, parent_id) VALUES (?, ?, ?, ?)')
    .run(userId, movieId, content, parentId);
  return getCommentById(Number(info.lastInsertRowid));
}

export function getCommentById(id) {
  return db
    .prepare(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`
    )
    .get(id);
}

export function listCommentsFlat(movieId, viewerId = null) {
  const rows = db
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
  const votes = db
    .prepare('SELECT comment_id, vote FROM comment_reactions WHERE user_id = ?')
    .all(viewerId);
  const map = {};
  votes.forEach((v) => {
    map[v.comment_id] = v.vote;
  });
  return rows.map((r) => ({ ...r, my_vote: map[r.id] ?? 0 }));
}

export function setReaction(userId, commentId, vote) {
  if (vote === 0 || vote === null || vote === undefined) {
    db.prepare('DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?').run(userId, commentId);
    return;
  }
  if (vote !== 1 && vote !== -1) return;
  const existing = db
    .prepare('SELECT id FROM comment_reactions WHERE user_id = ? AND comment_id = ?')
    .get(userId, commentId);
  if (existing) {
    db.prepare('UPDATE comment_reactions SET vote = ? WHERE user_id = ? AND comment_id = ?').run(vote, userId, commentId);
  } else {
    db.prepare('INSERT INTO comment_reactions (comment_id, user_id, vote) VALUES (?, ?, ?)').run(commentId, userId, vote);
  }
}

export function deleteCommentCascade(id) {
  const order = [];
  function walk(cid) {
    const kids = db.prepare('SELECT id FROM comments WHERE parent_id = ?').all(cid);
    kids.forEach((k) => walk(k.id));
    order.push(cid);
  }
  walk(id);
  const del = db.prepare('DELETE FROM comments WHERE id = ?');
  order.forEach((i) => del.run(i));
}

export function deleteComment(id) {
  deleteCommentCascade(id);
}

export function countComments() {
  return db.prepare('SELECT COUNT(*) as n FROM comments').get().n;
}
