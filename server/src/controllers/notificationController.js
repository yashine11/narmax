import { db } from '../config/database.js';

export async function list(req, res) {
  try {
    const userId = req.user.id;
    // Auto-delete notifications older than 24 hours
    await db.prepare(
      `DELETE FROM notifications WHERE created_at < datetime('now', '-24 hours')`
    ).run();
    const notifications = await db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);
    return res.json({ notifications });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

export async function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (id === 'all') {
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    } else {
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
}

export async function deleteOne(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId);
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
}

export async function createNotification(userId, type, title, message, link) {
  try {
    await db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, title, message, link);
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}
