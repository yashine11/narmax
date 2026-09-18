import { db } from '../config/database.js';

export async function listLiked(req, res) {
  try {
    const userId = req.user.id;
    const cast = await db.prepare(`
      SELECT * FROM liked_cast 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);
    
    return res.json({ cast });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to fetch liked cast' });
  }
}

export async function toggleLike(req, res) {
  try {
    const userId = req.user.id;
    const { cast_id, name, profile_path } = req.body;
    
    if (!cast_id || !name) {
      return res.status(400).json({ message: 'Missing cast details' });
    }
    
    const existing = await db.prepare('SELECT id FROM liked_cast WHERE user_id = ? AND cast_id = ?').get(userId, cast_id);
    
    if (existing) {
      await db.prepare('DELETE FROM liked_cast WHERE id = ?').run(existing.id);
      return res.json({ success: true, action: 'removed' });
    } else {
      await db.prepare(`
        INSERT INTO liked_cast (user_id, cast_id, name, profile_path)
        VALUES (?, ?, ?, ?)
      `).run(userId, cast_id, name, profile_path || null);
      return res.json({ success: true, action: 'added' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to toggle cast like' });
  }
}

export async function checkStatus(req, res) {
  try {
    const userId = req.user.id;
    const { cast_id } = req.query;
    const existing = await db.prepare('SELECT id FROM liked_cast WHERE user_id = ? AND cast_id = ?').get(userId, cast_id);
    return res.json({ liked: !!existing });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to check status' });
  }
}

