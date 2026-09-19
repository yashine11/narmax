import { db } from '../config/database.js';

export async function listConversations(req, res) {
  try {
    const userId = req.user.id;
    const type = req.query.type === 'admin' ? 'admin' : 'user';

    if (type === 'admin') {
      // Admin messages received by the user
      const adminMessages = await db.prepare(`
        SELECT dm.*, u.username as sender_name, u.avatar as sender_avatar
        FROM direct_messages dm
        JOIN users u ON u.id = dm.sender_id
        WHERE dm.receiver_id = ? AND dm.is_admin_message = 1
        ORDER BY dm.created_at DESC
      `).all(userId);

      if (!adminMessages || adminMessages.length === 0) {
        return res.json({ conversations: [] });
      }

      const unreadCount = adminMessages.filter((m) => !m.is_read).length;
      const last = adminMessages[0];

      return res.json({
        conversations: [
          {
            id: 'admin',
            partner_id: 'admin',
            username: 'ADMINS',
            handle: '@admins',
            avatar: null,
            is_admin: true,
            last_message: last.content,
            created_at: last.created_at,
            unread_count: unreadCount,
          },
        ],
      });
    }

    // Normal User ↔ User conversations
    const rows = await db.prepare(`
      SELECT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
        content,
        created_at,
        is_read,
        sender_id,
        receiver_id
      FROM direct_messages
      WHERE (sender_id = ? OR receiver_id = ?) AND is_admin_message = 0
      ORDER BY created_at DESC
    `).all(userId, userId, userId);

    // Group by partner_id to find the latest message and unread count
    const partnerMap = new Map();
    for (const row of rows) {
      if (!partnerMap.has(row.partner_id)) {
        partnerMap.set(row.partner_id, {
          partner_id: row.partner_id,
          last_message: row.content,
          created_at: row.created_at,
          unread_count: 0,
        });
      }
      if (row.receiver_id === userId && !row.is_read) {
        const item = partnerMap.get(row.partner_id);
        item.unread_count += 1;
      }
    }

    const partnerIds = Array.from(partnerMap.keys());
    if (partnerIds.length === 0) {
      return res.json({ conversations: [] });
    }

    // Fetch user details for each partner
    const placeholders = partnerIds.map(() => '?').join(',');
    const users = await db.prepare(`
      SELECT id, username, avatar, role
      FROM users
      WHERE id IN (${placeholders})
    `).all(...partnerIds);

    const userMap = new Map(users.map((u) => [u.id, u]));

    const conversations = partnerIds
      .map((pid) => {
        const partner = userMap.get(pid);
        if (!partner) return null;
        const conv = partnerMap.get(pid);
        return {
          id: String(partner.id),
          partner_id: partner.id,
          username: partner.username,
          handle: `@${partner.username}`,
          avatar: partner.avatar,
          role: partner.role,
          last_message: conv.last_message,
          created_at: conv.created_at,
          unread_count: conv.unread_count,
        };
      })
      .filter(Boolean);

    return res.json({ conversations });
  } catch (e) {
    console.error('listConversations error:', e);
    return res.status(500).json({ message: 'Failed to load conversations' });
  }
}

export async function getConversation(req, res) {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    if (partnerId === 'admin') {
      // Mark all admin messages as read
      await db.prepare(`
        UPDATE direct_messages
        SET is_read = 1
        WHERE receiver_id = ? AND is_admin_message = 1
      `).run(userId);

      const messages = await db.prepare(`
        SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar, u.role as sender_role
        FROM direct_messages dm
        JOIN users u ON u.id = dm.sender_id
        WHERE dm.receiver_id = ? AND dm.is_admin_message = 1
        ORDER BY dm.created_at ASC
      `).all(userId);

      return res.json({
        partner: {
          id: 'admin',
          username: 'ADMINS',
          handle: '@admins',
          is_admin: true,
        },
        messages,
      });
    }

    const targetId = Number(partnerId);
    if (!targetId) {
      return res.status(400).json({ message: 'Invalid partner id' });
    }

    const partner = await db.prepare('SELECT id, username, avatar, role FROM users WHERE id = ?').get(targetId);
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark messages from partner as read
    await db.prepare(`
      UPDATE direct_messages
      SET is_read = 1
      WHERE receiver_id = ? AND sender_id = ? AND is_admin_message = 0
    `).run(userId, targetId);

    const messages = await db.prepare(`
      SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE ((dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?))
        AND dm.is_admin_message = 0
      ORDER BY dm.created_at ASC
    `).all(userId, targetId, targetId, userId);

    return res.json({
      partner: {
        id: partner.id,
        username: partner.username,
        handle: `@${partner.username}`,
        avatar: partner.avatar,
        role: partner.role,
      },
      messages,
    });
  } catch (e) {
    console.error('getConversation error:', e);
    return res.status(500).json({ message: 'Failed to load conversation' });
  }
}

export async function sendMessage(req, res) {
  try {
    const senderId = req.user.id;
    const { receiver_id, content } = req.body;

    const text = String(content || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
    }

    if (receiver_id === 'admin') {
      return res.status(403).json({ message: "You can't reply to admin messages." });
    }

    const receiverId = Number(receiver_id);
    if (!receiverId || receiverId === senderId) {
      return res.status(400).json({ message: 'Invalid recipient' });
    }

    const receiver = await db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const info = await db.prepare(`
      INSERT INTO direct_messages (sender_id, receiver_id, content, is_admin_message, is_read)
      VALUES (?, ?, ?, 0, 0)
    `).run(senderId, receiverId, text);

    const created = await db.prepare(`
      SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE dm.id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json({ message: created });
  } catch (e) {
    console.error('sendMessage error:', e);
    return res.status(500).json({ message: 'Failed to send message' });
  }
}

export async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const row = await db.prepare(`
      SELECT COUNT(*) as count
      FROM direct_messages
      WHERE receiver_id = ? AND is_read = 0
    `).get(userId);

    return res.json({ unreadCount: row?.count || 0 });
  } catch (e) {
    console.error('getUnreadCount error:', e);
    return res.status(500).json({ message: 'Failed to count unread messages' });
  }
}

export async function searchUsers(req, res) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) {
      return res.json({ users: [] });
    }

    const users = await db.prepare(`
      SELECT id, username, avatar, role
      FROM users
      WHERE LOWER(username) LIKE ? AND id != ?
      ORDER BY username ASC
      LIMIT 10
    `).all(`%${q}%`, req.user.id);

    return res.json({ users });
  } catch (e) {
    console.error('searchUsers error:', e);
    return res.status(500).json({ message: 'Failed to search users' });
  }
}
