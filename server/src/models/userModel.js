import { db } from '../config/database.js';

export async function findUserByEmail(email) {
  return await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

export async function findUserByUsername(username) {
  return await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export async function findUserById(id) {
  return await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export async function findUserByOAuth(provider, oauthId) {
  return await db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?').get(provider, String(oauthId));
}

export async function createUser({ username, email, passwordHash, avatar, role = 'user' }) {
  const info = await db
    .prepare(
      `INSERT INTO users (username, email, password, avatar, role)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(username, email.toLowerCase(), passwordHash, avatar ?? '/uploads/default-avatar.svg', role);
  return await findUserById(Number(info.lastInsertRowid));
}

export async function createOAuthUser({ username, email, avatar, role = 'user', oauthProvider, oauthId }) {
  const dummyPass = `oauth_verified_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const info = await db
    .prepare(
      `INSERT INTO users (username, email, password, avatar, role, oauth_provider, oauth_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(username, email.toLowerCase(), dummyPass, avatar ?? '/uploads/default-avatar.svg', role, oauthProvider, String(oauthId));
  return await findUserById(Number(info.lastInsertRowid));
}

export async function linkOAuthToUser(id, { oauthProvider, oauthId, avatar }) {
  if (avatar) {
    await db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar = COALESCE(avatar, ?) WHERE id = ?').run(oauthProvider, String(oauthId), avatar, id);
  } else {
    await db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?').run(oauthProvider, String(oauthId), id);
  }
  return await findUserById(id);
}

export async function listUsersAdmin({ limit = 200, offset = 0 } = {}) {
  return await db
    .prepare(
      `SELECT id, username, email, avatar, role, created_at FROM users
       ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

export async function updateUserAdmin(id, { username, email, role, avatar, passwordHash }) {
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
  if (!fields.length) return await findUserById(id);
  vals.push(id);
  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return await findUserById(id);
}

export async function deleteUser(id) {
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export async function updateProfile(id, { avatar, username }) {
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
  if (!fields.length) return await findUserById(id);
  vals.push(id);
  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return await findUserById(id);
}

export async function updateUserPassword(id, passwordHash) {
  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, id);
  return await findUserById(id);
}

