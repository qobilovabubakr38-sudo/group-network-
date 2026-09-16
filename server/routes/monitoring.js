import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/monitoring/stats - Surveillance overview statistics
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    const [
      totalGroupMsg,
      totalDirectMsg,
      totalAttachments,
      totalDirectAttachments,
      pendingPerms,
      blockedPerms,
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM messages'),
      db.get('SELECT COUNT(*) as count FROM direct_messages'),
      db.get('SELECT COUNT(*) as count FROM attachments'),
      db.get('SELECT COUNT(*) as count FROM direct_message_attachments'),
      db.get("SELECT COUNT(*) as count FROM chat_permissions WHERE status = 'pending'"),
      db.get("SELECT COUNT(*) as count FROM chat_permissions WHERE status = 'blocked'"),
    ]);

    // Media counts
    const voiceCount = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM messages WHERE message_type = 'audio') +
        (SELECT COUNT(*) FROM direct_messages WHERE message_type = 'audio') as count
    `);

    const imageVideoCount = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM attachments WHERE mime_type LIKE 'image/%' OR mime_type LIKE 'video/%') +
        (SELECT COUNT(*) FROM direct_message_attachments WHERE mime_type LIKE 'image/%' OR mime_type LIKE 'video/%') as count
    `);

    // Today's messages
    const today = new Date().toISOString().split('T')[0];
    const todayMsg = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM messages WHERE created_at >= ?) +
        (SELECT COUNT(*) FROM direct_messages WHERE created_at >= ?) as count
    `, [today, today]);

    return res.json({
      totalMessages: (totalGroupMsg?.count || 0) + (totalDirectMsg?.count || 0),
      groupMessages: totalGroupMsg?.count || 0,
      directMessages: totalDirectMsg?.count || 0,
      todayMessages: todayMsg?.count || 0,
      totalFiles: (totalAttachments?.count || 0) + (totalDirectAttachments?.count || 0),
      voiceMessages: voiceCount?.count || 0,
      imageVideoCount: imageVideoCount?.count || 0,
      pendingPermissions: pendingPerms?.count || 0,
      blockedPermissions: blockedPerms?.count || 0,
    });
  } catch (err) {
    console.error('[Monitoring Stats Error]:', err);
    return res.status(500).json({ error: 'Statistikani olishda xatolik.' });
  }
});

// GET /api/admin/monitoring/messages - Complete surveillance stream across all groups & direct chats
router.get('/messages', async (req, res) => {
  try {
    const db = await getDb();
    const {
      type = 'all', // 'all', 'direct', 'group'
      userId,
      groupId,
      mediaType = 'all', // 'all', 'audio', 'media'
      search,
      limit = 100,
      offset = 0,
    } = req.query;

    let groupList = [];
    let directList = [];

    // 1. Fetch Group Messages if requested
    if (type === 'all' || type === 'group') {
      let gQuery = `
        SELECT m.id, m.group_id, m.sender_id, m.content, m.message_type, m.created_at,
               g.name as group_name, g.category as group_category,
               u.first_name as sender_first_name, u.last_name as sender_last_name, 
               u.username as sender_username, u.relationship as sender_relationship,
               u.avatar as sender_avatar, u.gender as sender_gender
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        JOIN users u ON m.sender_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (groupId) {
        gQuery += ` AND m.group_id = ?`;
        params.push(groupId);
      }
      if (userId) {
        gQuery += ` AND m.sender_id = ?`;
        params.push(userId);
      }
      if (mediaType === 'audio') {
        gQuery += ` AND m.message_type = 'audio'`;
      } else if (mediaType === 'media') {
        gQuery += ` AND m.message_type IN ('image', 'video', 'audio', 'file')`;
      }
      if (search) {
        gQuery += ` AND m.content LIKE ?`;
        params.push(`%${search.trim()}%`);
      }

      gQuery += ` ORDER BY m.id DESC LIMIT ?`;
      params.push(parseInt(limit, 10));

      const rawGMsgs = await db.all(gQuery, params);

      for (const gm of rawGMsgs) {
        const atts = await db.all('SELECT id, file_url, file_name, mime_type, file_size, duration FROM attachments WHERE message_id = ?', [gm.id]);
        groupList.push({
          id: `g_${gm.id}`,
          original_id: gm.id,
          channel: 'group',
          group_id: gm.group_id,
          group_name: gm.group_name,
          group_category: gm.group_category,
          sender: {
            id: gm.sender_id,
            first_name: gm.sender_first_name,
            last_name: gm.sender_last_name,
            username: gm.sender_username,
            relationship: gm.sender_relationship,
            avatar: gm.sender_avatar,
            gender: gm.sender_gender,
          },
          recipient: null,
          content: gm.content,
          message_type: gm.message_type,
          created_at: gm.created_at,
          attachments: atts,
        });
      }
    }

    // 2. Fetch Direct 1-on-1 Messages if requested
    if (type === 'all' || type === 'direct') {
      let dQuery = `
        SELECT dm.id, dm.sender_id, dm.recipient_id, dm.content, dm.message_type, dm.read, dm.created_at,
               s.first_name as sender_first_name, s.last_name as sender_last_name, 
               s.username as sender_username, s.relationship as sender_relationship,
               s.avatar as sender_avatar, s.gender as sender_gender,
               r.first_name as recip_first_name, r.last_name as recip_last_name, 
               r.username as recip_username, r.relationship as recip_relationship,
               r.avatar as recip_avatar, r.gender as recip_gender
        FROM direct_messages dm
        JOIN users s ON dm.sender_id = s.id
        JOIN users r ON dm.recipient_id = r.id
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        dQuery += ` AND (dm.sender_id = ? OR dm.recipient_id = ?)`;
        params.push(userId, userId);
      }
      if (mediaType === 'audio') {
        dQuery += ` AND dm.message_type = 'audio'`;
      } else if (mediaType === 'media') {
        dQuery += ` AND dm.message_type IN ('image', 'video', 'audio', 'file')`;
      }
      if (search) {
        dQuery += ` AND dm.content LIKE ?`;
        params.push(`%${search.trim()}%`);
      }

      dQuery += ` ORDER BY dm.id DESC LIMIT ?`;
      params.push(parseInt(limit, 10));

      const rawDMs = await db.all(dQuery, params);

      for (const dm of rawDMs) {
        const atts = await db.all('SELECT id, file_url, file_name, mime_type, file_size, duration FROM direct_message_attachments WHERE direct_message_id = ?', [dm.id]);
        directList.push({
          id: `d_${dm.id}`,
          original_id: dm.id,
          channel: 'direct',
          group_id: null,
          group_name: 'Shaxsiy 1-on-1 Yozishma',
          group_category: 'direct',
          sender: {
            id: dm.sender_id,
            first_name: dm.sender_first_name,
            last_name: dm.sender_last_name,
            username: dm.sender_username,
            relationship: dm.sender_relationship,
            avatar: dm.sender_avatar,
            gender: dm.sender_gender,
          },
          recipient: {
            id: dm.recipient_id,
            first_name: dm.recip_first_name,
            last_name: dm.recip_last_name,
            username: dm.recip_username,
            relationship: dm.recip_relationship,
            avatar: dm.recip_avatar,
            gender: dm.recip_gender,
          },
          content: dm.content,
          message_type: dm.message_type,
          read: dm.read,
          created_at: dm.created_at,
          attachments: atts,
        });
      }
    }

    // Merge and sort chronologically descending
    const combined = [...groupList, ...directList];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginated = combined.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    return res.json({
      messages: paginated,
      totalCount: combined.length,
    });
  } catch (err) {
    console.error('[Monitoring Messages Error]:', err);
    return res.status(500).json({ error: 'Kuzatuv xabarlarini olishda xatolik.' });
  }
});

// GET /api/admin/monitoring/active-pairs - Map of all communicating user pairs with block action
router.get('/active-pairs', async (req, res) => {
  try {
    const db = await getDb();

    // Get all distinct active pairs
    const pairs = await db.all(`
      SELECT 
        CASE WHEN sender_id < recipient_id THEN sender_id ELSE recipient_id END as u1_id,
        CASE WHEN sender_id < recipient_id THEN recipient_id ELSE sender_id END as u2_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at
      FROM direct_messages
      GROUP BY u1_id, u2_id
      ORDER BY last_message_at DESC
    `);

    const result = [];
    for (const p of pairs) {
      const [u1, u2, perm] = await Promise.all([
        db.get('SELECT id, first_name, last_name, relationship, avatar, gender FROM users WHERE id = ?', [p.u1_id]),
        db.get('SELECT id, first_name, last_name, relationship, avatar, gender FROM users WHERE id = ?', [p.u2_id]),
        db.get('SELECT id, status, requested_by, approved_by, approved_at FROM chat_permissions WHERE user1_id = ? AND user2_id = ?', [p.u1_id, p.u2_id]),
      ]);

      if (u1 && u2) {
        result.push({
          user1: u1,
          user2: u2,
          isCrossGender: (u1.gender || 'male') !== (u2.gender || 'male'),
          messageCount: p.message_count,
          lastMessageAt: p.last_message_at,
          permissionStatus: perm ? perm.status : ((u1.gender !== u2.gender) ? 'requires_approval' : 'allowed'),
          permissionId: perm?.id || null,
        });
      }
    }

    return res.json({ pairs: result });
  } catch (err) {
    console.error('[Monitoring Active Pairs Error]:', err);
    return res.status(500).json({ error: 'Faol juftliklarni olishda xatolik.' });
  }
});

export default router;
