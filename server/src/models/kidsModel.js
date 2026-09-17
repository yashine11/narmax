import { db } from '../config/database.js';

export function getKidsCodeRow() {
  return db.prepare('SELECT * FROM kids_access ORDER BY id LIMIT 1').get();
}

export function setKidsCodeHash(hash) {
  const row = getKidsCodeRow();
  if (row) {
    db.prepare('UPDATE kids_access SET access_code = ? WHERE id = ?').run(hash, row.id);
  } else {
    db.prepare('INSERT INTO kids_access (access_code) VALUES (?)').run(hash);
  }
}
