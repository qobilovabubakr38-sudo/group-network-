import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

// POST /api/admin/announcements - Broadcast announcement to selected or all groups
router.post('/', async (req, res) => {
  try {
    const { title, content, targetGroups } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'E‘lon matni kiritilishi shart.' });
    }

    if (!Array.isArray(targetGroups) || targetGroups.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta guruh tanlanishi shart.' });
    }

    const db = await getDb();
    const io = req.app.get('io');

    const formattedContent = title && title.trim()
      ? `📢 **${title.trim()}**\n\n${content.trim()}`
      : `📢 ${content.trim()}`;

    const sentGroups = [];

    for (const groupId of targetGroups) {
      const group = await db.get('SELECT id, name FROM groups WHERE id = ?', [groupId]);
      if (!group) continue;

      const result = await db.run(`
        INSERT INTO messages (group_id, sender_id, content, message_type)
        VALUES (?, ?, ?, 'announcement')
      `, [groupId, req.user.id, formattedContent]);

      const messageId = result.lastID;
      sentGroups.push(group.name);

      const fullMessage = {
        id: messageId,
        group_id: parseInt(groupId, 10),
        sender_id: req.user.id,
        content: formattedContent,
        message_type: 'announcement',
        reply_to: null,
        created_at: new Date().toISOString(),
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        relationship: req.user.relationship,
        avatar: req.user.avatar,
        reactions: [],
        attachments: [],
      };

      if (io) {
        io.to(`group_${groupId}`).emit('new_message', fullMessage);
        io.to(`group_${groupId}`).emit('announcement_received', {
          title: title || 'Yangi rasmiy e‘lon',
          content: content.trim(),
          groupName: group.name,
        });
      }

      // Create notification for group members
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?', [groupId, req.user.id]);
      for (const m of members) {
        await db.run(`
          INSERT INTO notifications (user_id, type, title, body, link)
          VALUES (?, 'announcement', ?, ?, ?)
        `, [
          m.user_id,
          `📢 ${group.name} guruhiga e‘lon`,
          title || content.substring(0, 60),
          `/chat/${groupId}`
        ]);
      }
    }

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, details)
      VALUES (?, 'BROADCAST_ANNOUNCEMENT', 'GROUPS', ?)
    `, [req.user.id, `Rasmiy e‘lon yuborildi: [${sentGroups.join(', ')}]`]);

    return res.status(201).json({
      message: 'E‘lon belgilangan guruhlarga muvaffaqiyatli yuborildi.',
      sentGroups,
    });
  } catch (error) {
    console.error('[Broadcast Announcement Error]:', error);
    return res.status(500).json({ error: 'E‘lonni yuborishda xatolik yuz berdi.' });
  }
});

export default router;
