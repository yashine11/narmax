import { db } from '../config/database.js';

export function list(req, res) {
  try {
    const userId = req.user.id;
    const notifications = db.prepare(`
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

export function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (id === 'all') {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }
    
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
}

export function createNotification(userId, type, title, message, link) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, title, message, link);
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}
