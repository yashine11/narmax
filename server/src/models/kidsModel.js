import { db } from '../config/database.js';

export async function getKidsCodeRow() {
  return await db.prepare('SELECT * FROM kids_access ORDER BY id LIMIT 1').get();
}

export async function setKidsCodeHash(hash) {
  const row = await getKidsCodeRow();
  if (row) {
    await db.prepare('UPDATE kids_access SET access_code = ? WHERE id = ?').run(hash, row.id);
  } else {
    await db.prepare('INSERT INTO kids_access (access_code) VALUES (?)').run(hash);
  }
}

