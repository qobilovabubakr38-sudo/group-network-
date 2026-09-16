import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireGroupMembership } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth);
router.use(requireGroupMembership('groupId'));

// GET /api/groups/:groupId/messages - Get messages of group
router.get('/', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const db = await getDb();

    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const messages = await db.all(`
      SELECT m.id, m.group_id, m.sender_id, m.content, m.message_type, m.reply_to, m.created_at, m.edited_at,
             u.first_name, u.last_name, u.relationship, u.avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
    `, [groupId, limit, offset]);

    // Reverse to chronological order
    messages.reverse();

    // Fetch reactions and attachments for each message
    for (const msg of messages) {
      // Reactions
      const reactions = await db.all(`
        SELECT mr.reaction, mr.user_id, u.first_name, u.relationship
        FROM message_reactions mr
        JOIN users u ON mr.user_id = u.id
        WHERE mr.message_id = ?
      `, [msg.id]);

      // Group reactions by emoji
      const reactionMap = {};
      for (const r of reactions) {
        if (!reactionMap[r.reaction]) {
          reactionMap[r.reaction] = { emoji: r.reaction, count: 0, users: [], hasReacted: false };
        }
        reactionMap[r.reaction].count += 1;
        reactionMap[r.reaction].users.push({ id: r.user_id, name: r.first_name });
        if (r.user_id === req.user.id) {
          reactionMap[r.reaction].hasReacted = true;
        }
      }
      msg.reactions = Object.values(reactionMap);

      // Attachments
      const attachments = await db.all(`
        SELECT id, file_url, file_name, mime_type, file_size, duration
        FROM attachments
        WHERE message_id = ?
      `, [msg.id]);
      msg.attachments = attachments;

      // Quoted reply preview
      if (msg.reply_to) {
        const replyMsg = await db.get(`
          SELECT m.id, m.content, m.message_type, u.first_name, u.relationship
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [msg.reply_to]);
        msg.reply_preview = replyMsg || null;
      }
    }

    return res.json({ messages });
  } catch (error) {
    console.error('[Get Messages Error]:', error);
    return res.status(500).json({ error: 'Xabarlarni olishda xatolik yuz berdi.' });
  }
});

// POST /api/groups/:groupId/messages - Send message to group
router.post('/', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { content, message_type = 'text', reply_to, attachments = [] } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Xabar matni yoki biriktirma kiritilishi shart.' });
    }

    const db = await getDb();

    const result = await db.run(`
      INSERT INTO messages (group_id, sender_id, content, message_type, reply_to)
      VALUES (?, ?, ?, ?, ?)
    `, [groupId, req.user.id, content || '', message_type, reply_to || null]);

    const messageId = result.lastID;

    // Insert attachments if provided
    const insertedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        const attResult = await db.run(`
          INSERT INTO attachments (message_id, file_url, file_name, mime_type, file_size, duration)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, att.file_url, att.file_name, att.mime_type, att.file_size || 0, att.duration || 0]);

        insertedAttachments.push({
          id: attResult.lastID,
          file_url: att.file_url,
          file_name: att.file_name,
          mime_type: att.mime_type,
          file_size: att.file_size || 0,
          duration: att.duration || 0,
        });
      }
    }

    // Fetch reply preview if exists
    let replyPreview = null;
    if (reply_to) {
      replyPreview = await db.get(`
        SELECT m.id, m.content, m.message_type, u.first_name, u.relationship
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [reply_to]);
    }

    const fullMessage = {
      id: messageId,
      group_id: parseInt(groupId, 10),
      sender_id: req.user.id,
      content: content || '',
      message_type,
      reply_to: reply_to || null,
      created_at: new Date().toISOString(),
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      relationship: req.user.relationship,
      avatar: req.user.avatar,
      reactions: [],
      attachments: insertedAttachments,
      reply_preview: replyPreview || null,
    };

    // Emit via socket.io if available on req.app
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('new_message', fullMessage);
    }

    return res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('[Send Message Error]:', error);
    return res.status(500).json({ error: 'Xabar yuborishda xatolik yuz berdi.' });
  }
});

// POST /api/groups/:groupId/messages/:messageId/reactions - Toggle reaction
router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: 'Reaksiya belgisi tanlanmadi.' });
    }

    const db = await getDb();

    // Check if user already reacted with this emoji
    const existing = await db.get(`
      SELECT id FROM message_reactions
      WHERE message_id = ? AND user_id = ? AND reaction = ?
    `, [messageId, req.user.id, reaction]);

    if (existing) {
      await db.run('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
    } else {
      await db.run(`
        INSERT INTO message_reactions (message_id, user_id, reaction)
        VALUES (?, ?, ?)
      `, [messageId, req.user.id, reaction]);
    }

    // Get updated reactions for this message
    const allReactions = await db.all(`
      SELECT mr.reaction, mr.user_id, u.first_name, u.relationship
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = ?
    `, [messageId]);

    const reactionMap = {};
    for (const r of allReactions) {
      if (!reactionMap[r.reaction]) {
        reactionMap[r.reaction] = { emoji: r.reaction, count: 0, users: [], hasReacted: false };
      }
      reactionMap[r.reaction].count += 1;
      reactionMap[r.reaction].users.push({ id: r.user_id, name: r.first_name });
      if (r.user_id === req.user.id) {
        reactionMap[r.reaction].hasReacted = true;
      }
    }
    const updatedReactions = Object.values(reactionMap);

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('message_reaction_updated', {
        messageId: parseInt(messageId, 10),
        reactions: updatedReactions,
      });
    }

    return res.json({ reactions: updatedReactions });
  } catch (error) {
    console.error('[Reaction Error]:', error);
    return res.status(500).json({ error: 'Reaksiya bildirishda xatolik.' });
  }
});

// DELETE /api/groups/:groupId/messages/:messageId - Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const db = await getDb();

    const message = await db.get('SELECT id, sender_id FROM messages WHERE id = ? AND group_id = ?', [messageId, groupId]);
    if (!message) {
      return res.status(404).json({ error: 'Xabar topilmadi.' });
    }

    // Only sender or Super Admin can delete
    if (message.sender_id !== req.user.id && req.user.is_admin !== 1) {
      return res.status(403).json({ error: 'Faqat o‘z xabaringizni o‘chira olasiz.' });
    }

    await db.run('DELETE FROM messages WHERE id = ?', [messageId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('message_deleted', {
        messageId: parseInt(messageId, 10),
        groupId: parseInt(groupId, 10),
      });
    }

    return res.json({ message: 'Xabar muvaffaqiyatli o‘chirildi.' });
  } catch (error) {
    console.error('[Delete Message Error]:', error);
    return res.status(500).json({ error: 'Xabarni o‘chirishda xatolik.' });
  }
});

export default router;
