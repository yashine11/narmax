import { db } from '../config/database.js';

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

export function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser({ username, email, passwordHash, avatar, role = 'user' }) {
  const info = db
    .prepare(
      `INSERT INTO users (username, email, password, avatar, role)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(username, email.toLowerCase(), passwordHash, avatar ?? '/uploads/default-avatar.svg', role);
  return findUserById(Number(info.lastInsertRowid));
}

export function listUsersAdmin({ limit = 200, offset = 0 } = {}) {
  return db
    .prepare(
      `SELECT id, username, email, avatar, role, created_at FROM users
       ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

export function updateUserAdmin(id, { username, email, role, avatar, passwordHash }) {
  const fields = [];
  const vals = [];
  if (username !== undefined) {
    fields.push('username = ?');
    vals.push(username);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    vals.push(email.toLowerCase());
  }
  if (role !== undefined) {
    fields.push('role = ?');
    vals.push(role);
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    vals.push(avatar);
  }
  if (passwordHash !== undefined) {
    fields.push('password = ?');
    vals.push(passwordHash);
  }
  if (!fields.length) return findUserById(id);
  vals.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return findUserById(id);
}

export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function updateProfile(id, { avatar, username }) {
  const fields = [];
  const vals = [];
  if (username !== undefined) {
    fields.push('username = ?');
    vals.push(username);
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    vals.push(avatar);
  }
  if (!fields.length) return findUserById(id);
  vals.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return findUserById(id);
}

export function updateUserPassword(id, passwordHash) {
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, id);
  return findUserById(id);
}
