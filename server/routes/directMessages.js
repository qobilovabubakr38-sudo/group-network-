import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireDirectMessageAccess, canDirectMessage } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/direct-messages/conversations - List of 1-on-1 conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const db = await getDb();
    const myId = req.user.id;

    // Get all distinct conversation partners
    const partners = await db.all(`
      SELECT DISTINCT 
        CASE 
          WHEN sender_id = ? THEN recipient_id 
          ELSE sender_id 
        END as partner_id
      FROM direct_messages
      WHERE sender_id = ? OR recipient_id = ?
    `, [myId, myId, myId]);

    const conversations = [];

    for (const p of partners) {
      const partnerId = p.partner_id;

      // Ensure that user still has permission or partner is still active
      const canChat = await canDirectMessage(myId, partnerId);
      if (!canChat) continue; // Skip if group membership was revoked

      const partnerUser = await db.get(`
        SELECT id, first_name, last_name, username, relationship, avatar, status
        FROM users WHERE id = ?
      `, [partnerId]);

      if (!partnerUser || partnerUser.status !== 'active') continue;

      // Last message
      const lastMsg = await db.get(`
        SELECT id, sender_id, recipient_id, content, message_type, read, created_at
        FROM direct_messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY id DESC
        LIMIT 1
      `, [myId, partnerId, partnerId, myId]);

      // Unread count sent by partner to me
      const unreadRow = await db.get(`
        SELECT COUNT(*) as count
        FROM direct_messages
        WHERE sender_id = ? AND recipient_id = ? AND read = 0
      `, [partnerId, myId]);

      conversations.push({
        partner: partnerUser,
        lastMessage: lastMsg || null,
        unreadCount: unreadRow?.count || 0,
      });
    }

    // Sort by last message created_at descending
    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return res.json({ conversations });
  } catch (error) {
    console.error('[Get DM Conversations Error]:', error);
    return res.status(500).json({ error: 'Suhbatlar ro‘yxatini olishda xatolik yuz berdi.' });
  }
});

// GET /api/direct-messages/:recipientId - Messages in 1-on-1 chat
router.get('/:recipientId', requireDirectMessageAccess('recipientId'), async (req, res) => {
  try {
    const recipientId = parseInt(req.params.recipientId, 10);
    const myId = req.user.id;
    const db = await getDb();

    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Fetch recipient details
    const partner = await db.get(`
      SELECT id, first_name, last_name, username, relationship, avatar, status
      FROM users WHERE id = ?
    `, [recipientId]);

    if (!partner || partner.status !== 'active') {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    // Fetch messages
    const messages = await db.all(`
      SELECT dm.id, dm.sender_id, dm.recipient_id, dm.content, dm.message_type, 
             dm.reply_to, dm.read, dm.created_at, dm.edited_at,
             u.first_name, u.last_name, u.relationship, u.avatar
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = ? AND dm.recipient_id = ?) 
         OR (dm.sender_id = ? AND dm.recipient_id = ?)
      ORDER BY dm.id DESC
      LIMIT ? OFFSET ?
    `, [myId, recipientId, recipientId, myId, limit, offset]);

    messages.reverse();

    // Mark unread messages sent to me as read
    await db.run(`
      UPDATE direct_messages
      SET read = 1
      WHERE sender_id = ? AND recipient_id = ? AND read = 0
    `, [recipientId, myId]);

    // Attach reactions, attachments, and reply preview
    for (const msg of messages) {
      // Reactions
      const reactions = await db.all(`
        SELECT dmr.reaction, dmr.user_id, u.first_name, u.relationship
        FROM direct_message_reactions dmr
        JOIN users u ON dmr.user_id = u.id
        WHERE dmr.message_id = ?
      `, [msg.id]);

      const reactionMap = {};
      for (const r of reactions) {
        if (!reactionMap[r.reaction]) {
          reactionMap[r.reaction] = { emoji: r.reaction, count: 0, users: [], hasReacted: false };
        }
        reactionMap[r.reaction].count += 1;
        reactionMap[r.reaction].users.push({ id: r.user_id, name: r.first_name });
        if (r.user_id === myId) {
          reactionMap[r.reaction].hasReacted = true;
        }
      }
      msg.reactions = Object.values(reactionMap);

      // Attachments
      msg.attachments = await db.all(`
        SELECT id, file_url, file_name, mime_type, file_size, duration
        FROM direct_message_attachments
        WHERE direct_message_id = ?
      `, [msg.id]);

      // Reply preview
      if (msg.reply_to) {
        const replyMsg = await db.get(`
          SELECT dm.id, dm.content, dm.message_type, u.first_name, u.relationship
          FROM direct_messages dm
          JOIN users u ON dm.sender_id = u.id
          WHERE dm.id = ?
        `, [msg.reply_to]);
        msg.reply_preview = replyMsg || null;
      }
    }

    return res.json({ messages, partner });
  } catch (error) {
    console.error('[Get DM Messages Error]:', error);
    return res.status(500).json({ error: 'Xabarlarni yuklashda xatolik yuz berdi.' });
  }
});

// POST /api/direct-messages/:recipientId - Send 1-on-1 private message
router.post('/:recipientId', requireDirectMessageAccess('recipientId'), async (req, res) => {
  try {
    const recipientId = parseInt(req.params.recipientId, 10);
    const myId = req.user.id;
    const { content, message_type = 'text', reply_to, attachments = [] } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Xabar matni yoki fayl kiritilishi shart.' });
    }

    const db = await getDb();

    const result = await db.run(`
      INSERT INTO direct_messages (sender_id, recipient_id, content, message_type, reply_to)
      VALUES (?, ?, ?, ?, ?)
    `, [myId, recipientId, content || '', message_type, reply_to || null]);

    const messageId = result.lastID;

    // Insert attachments if any
    const savedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const attResult = await db.run(`
          INSERT INTO direct_message_attachments (direct_message_id, file_url, file_name, mime_type, file_size, duration, storage_type, cloud_file_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          messageId,
          att.file_url,
          att.file_name,
          att.mime_type,
          att.file_size || 0,
          att.duration || 0,
          att.storage_type || 'local',
          att.cloud_file_id || null,
        ]);
        savedAttachments.push({
          id: attResult.lastID,
          ...att,
        });
      }
    }

    // Fetch reply preview if exists
    let replyPreview = null;
    if (reply_to) {
      replyPreview = await db.get(`
        SELECT dm.id, dm.content, dm.message_type, u.first_name, u.relationship
        FROM direct_messages dm
        JOIN users u ON dm.sender_id = u.id
        WHERE dm.id = ?
      `, [reply_to]);
    }

    // In-app notification for the recipient
    const senderTitle = `${req.user.first_name} (${req.user.relationship})`;
    const notifBody = message_type === 'audio' 
      ? '🎤 Ovozli xabar yubordi' 
      : (content ? (content.length > 40 ? content.slice(0, 40) + '...' : content) : '📎 Fayl yubordi');

    await db.run(`
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (?, 'message', ?, ?, ?)
    `, [recipientId, senderTitle, notifBody, `/chat?dm=${myId}`]);

    const fullMessage = {
      id: messageId,
      sender_id: myId,
      recipient_id: recipientId,
      content: content || '',
      message_type,
      reply_to: reply_to || null,
      read: 0,
      created_at: new Date().toISOString(),
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      relationship: req.user.relationship,
      avatar: req.user.avatar,
      attachments: savedAttachments,
      reactions: [],
      reply_preview: replyPreview || null,
    };

    // Emit Socket.io event if socket instance exists on app
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${recipientId}`).emit('dm_new_message', fullMessage);
      io.to(`user_${myId}`).emit('dm_new_message', fullMessage);
    }

    return res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('[Send DM Message Error]:', error);
    return res.status(500).json({ error: 'Xabarni yuborishda xatolik yuz berdi.' });
  }
});

// POST /api/direct-messages/messages/:messageId/read - Mark messages as read
router.post('/messages/:messageId/read', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const db = await getDb();

    const msg = await db.get('SELECT sender_id, recipient_id FROM direct_messages WHERE id = ?', [messageId]);
    if (!msg || msg.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Ruxsat berilmadi.' });
    }

    await db.run('UPDATE direct_messages SET read = 1 WHERE id = ?', [messageId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${msg.sender_id}`).emit('dm_message_read', { messageId, readBy: req.user.id });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Xatolik yuz berdi.' });
  }
});

// POST /api/direct-messages/messages/:messageId/reaction - React to direct message
router.post('/messages/:messageId/reaction', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const { reaction } = req.body;
    if (!reaction) {
      return res.status(400).json({ error: 'Reaksiya kiritilmadi.' });
    }

    const db = await getDb();
    const msg = await db.get('SELECT sender_id, recipient_id FROM direct_messages WHERE id = ?', [messageId]);
    if (!msg || (msg.sender_id !== req.user.id && msg.recipient_id !== req.user.id)) {
      return res.status(403).json({ error: 'Kirish taqiqlangan.' });
    }

    // Check if already reacted with this emoji
    const existing = await db.get(`
      SELECT id FROM direct_message_reactions
      WHERE message_id = ? AND user_id = ? AND reaction = ?
    `, [messageId, req.user.id, reaction]);

    if (existing) {
      await db.run('DELETE FROM direct_message_reactions WHERE id = ?', [existing.id]);
    } else {
      await db.run(`
        INSERT INTO direct_message_reactions (message_id, user_id, reaction)
        VALUES (?, ?, ?)
      `, [messageId, req.user.id, reaction]);
    }

    // Return updated reactions
    const updatedReactions = await db.all(`
      SELECT dmr.reaction, dmr.user_id, u.first_name, u.relationship
      FROM direct_message_reactions dmr
      JOIN users u ON dmr.user_id = u.id
      WHERE dmr.message_id = ?
    `, [messageId]);

    const reactionMap = {};
    for (const r of updatedReactions) {
      if (!reactionMap[r.reaction]) {
        reactionMap[r.reaction] = { emoji: r.reaction, count: 0, users: [], hasReacted: false };
      }
      reactionMap[r.reaction].count += 1;
      reactionMap[r.reaction].users.push({ id: r.user_id, name: r.first_name });
      if (r.user_id === req.user.id) {
        reactionMap[r.reaction].hasReacted = true;
      }
    }

    const reactionList = Object.values(reactionMap);

    const io = req.app.get('io');
    if (io) {
      const partnerId = msg.sender_id === req.user.id ? msg.recipient_id : msg.sender_id;
      io.to(`user_${partnerId}`).emit('dm_reaction_updated', { messageId, reactions: reactionList });
      io.to(`user_${req.user.id}`).emit('dm_reaction_updated', { messageId, reactions: reactionList });
    }

    return res.json({ reactions: reactionList });
  } catch (error) {
    console.error('[DM Reaction Error]:', error);
    return res.status(500).json({ error: 'Reaksiyani saqlashda xatolik yuz berdi.' });
  }
});

// DELETE /api/direct-messages/messages/:messageId - Delete a direct message
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const db = await getDb();

    const msg = await db.get('SELECT * FROM direct_messages WHERE id = ?', [messageId]);
    if (!msg) {
      return res.status(404).json({ error: 'Xabar topilmadi.' });
    }

    // Only sender or admin can delete
    if (msg.sender_id !== req.user.id && req.user.is_admin !== 1) {
      return res.status(403).json({ error: 'Bu xabarni o‘chirish huquqingiz yo‘q.' });
    }

    await db.run('DELETE FROM direct_messages WHERE id = ?', [messageId]);
    await db.run('DELETE FROM direct_message_attachments WHERE message_id = ?', [messageId]);
    await db.run('DELETE FROM direct_message_reactions WHERE message_id = ?', [messageId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${msg.sender_id}`).emit('dm_message_deleted', { messageId: parseInt(messageId, 10) });
      io.to(`user_${msg.recipient_id}`).emit('dm_message_deleted', { messageId: parseInt(messageId, 10) });
      io.to('admin_surveillance').emit('dm_message_deleted', { messageId: parseInt(messageId, 10) });
    }

    return res.json({ success: true, messageId: parseInt(messageId, 10) });
  } catch (error) {
    console.error('[Delete DM Error]:', error);
    return res.status(500).json({ error: 'Xabarni o‘chirishda xatolik yuz berdi.' });
  }
});

export default router;
