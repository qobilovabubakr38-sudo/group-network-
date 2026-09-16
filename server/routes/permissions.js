import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin, checkDirectMessagePermission } from '../middleware/auth.js';
import { sendTelegramAdminAlert } from '../bot.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/permissions/status/:recipientId - Check current DM permission status
router.get('/status/:recipientId', async (req, res) => {
  try {
    const recipientId = parseInt(req.params.recipientId, 10);
    const db = await getDb();

    const recipient = await db.get(`
      SELECT id, first_name, last_name, username, relationship, gender, avatar, status
      FROM users WHERE id = ?
    `, [recipientId]);

    if (!recipient || recipient.status !== 'active') {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    const check = await checkDirectMessagePermission(req.user.id, recipientId);
    return res.json({
      recipient,
      permission: check,
      allowed: check.allowed,
      status: check.status,
      reason: check.reason,
      message: check.message,
    });
  } catch (err) {
    console.error('[Check Permission Status Error]:', err);
    return res.status(500).json({ error: 'Ruxsat holatini tekshirishda xatolik yuz berdi.' });
  }
});

// POST /api/permissions/request/:recipientId - User requests permission to chat with cross-gender contact
router.post('/request/:recipientId', async (req, res) => {
  try {
    const recipientId = parseInt(req.params.recipientId, 10);
    const myId = req.user.id;

    if (myId === recipientId) {
      return res.status(400).json({ error: 'O‘z-o‘zingizga ruxsat talab etilmaydi.' });
    }

    const db = await getDb();
    const recipient = await db.get(`
      SELECT id, first_name, last_name, gender, relationship FROM users WHERE id = ?
    `, [recipientId]);

    if (!recipient) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    // Check common group
    const common = await db.get(`
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = ? AND gm2.user_id = ?
      LIMIT 1
    `, [myId, recipientId]);

    if (!common && req.user.is_admin !== 1) {
      return res.status(403).json({ error: 'Umumiy guruh bo‘lmagan foydalanuvchi bilan yozishish so‘ralmaydi.' });
    }

    const [user1_id, user2_id] = myId < recipientId ? [myId, recipientId] : [recipientId, myId];

    // Check existing
    const existing = await db.get(`
      SELECT * FROM chat_permissions WHERE user1_id = ? AND user2_id = ?
    `, [user1_id, user2_id]);

    if (existing && existing.status === 'blocked') {
      return res.status(403).json({ error: 'Ushbu suhbatdosh bilan yozishish Admin tomonidan bloklangan.' });
    }

    if (existing && existing.status === 'approved') {
      return res.json({ success: true, message: 'Yozishishga allaqachon ruxsat berilgan.', status: 'approved' });
    }

    let permId = existing?.id;
    if (existing) {
      await db.run(`
        UPDATE chat_permissions
        SET status = 'pending', requested_by = ?, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [myId, existing.id]);
    } else {
      const ins = await db.run(`
        INSERT INTO chat_permissions (user1_id, user2_id, status, requested_by)
        VALUES (?, ?, 'pending', ?)
      `, [user1_id, user2_id, myId]);
      permId = ins.lastID;
    }

    // Notify Super Admin(s)
    const admins = await db.all('SELECT id FROM users WHERE is_admin = 1');
    const reqTitle = `Yangi Yozishish So‘rovi 🛡️`;
    const reqBody = `${req.user.first_name} (${req.user.relationship}) va ${recipient.first_name} (${recipient.relationship}) shaxsiy gaplashish uchun ruxsat so‘ramoqda.`;

    for (const adm of admins) {
      await db.run(`
        INSERT INTO notifications (user_id, type, title, body, link)
        VALUES (?, 'system', ?, ?, '/admin')
      `, [adm.id, reqTitle, reqBody]);
    }

    // Socket alert to admins
    const io = req.app.get('io');
    if (io) {
      io.emit('admin_permission_request', {
        id: permId,
        user1_id,
        user2_id,
        requester: { id: req.user.id, name: `${req.user.first_name} ${req.user.last_name}` },
        target: { id: recipient.id, name: `${recipient.first_name} ${recipient.last_name}` },
        status: 'pending',
      });
    }

    // Telegram Bot alert to Admin
    sendTelegramAdminAlert(
      permId,
      `${req.user.first_name} ${req.user.last_name}`,
      `${recipient.first_name} ${recipient.last_name}`,
      req.user.gender,
      recipient.gender
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'So‘rov Super Adminga muvaffaqiyatli yuborildi. Admin ruxsat bergach, yozishishingiz mumkin.',
      status: 'pending',
    });
  } catch (err) {
    console.error('[Request Permission Error]:', err);
    return res.status(500).json({ error: 'Ruxsat so‘rashda xatolik yuz berdi.' });
  }
});

// GET /api/permissions/admin/list - Super Admin views all permission requests & blocks
router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    const permissions = await db.all(`
      SELECT 
        cp.id, cp.user1_id, cp.user2_id, cp.status, cp.requested_by, 
        cp.approved_by, cp.approved_at, cp.created_at,
        u1.first_name as u1_first_name, u1.last_name as u1_last_name, u1.gender as u1_gender, u1.relationship as u1_relationship, u1.avatar as u1_avatar,
        u2.first_name as u2_first_name, u2.last_name as u2_last_name, u2.gender as u2_gender, u2.relationship as u2_relationship, u2.avatar as u2_avatar,
        req.first_name as requester_name
      FROM chat_permissions cp
      JOIN users u1 ON cp.user1_id = u1.id
      JOIN users u2 ON cp.user2_id = u2.id
      LEFT JOIN users req ON cp.requested_by = req.id
      ORDER BY 
        CASE cp.status 
          WHEN 'pending' THEN 1 
          WHEN 'blocked' THEN 2 
          ELSE 3 
        END ASC,
        cp.created_at DESC
    `);

    return res.json({ permissions });
  } catch (err) {
    console.error('[Admin Get Permissions Error]:', err);
    return res.status(500).json({ error: 'Ruxsatlar ro‘yxatini olishda xatolik.' });
  }
});

// POST /api/permissions/admin/:id/approve - Super Admin approves a request
router.post('/admin/:id/approve', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = await getDb();

    const perm = await db.get('SELECT * FROM chat_permissions WHERE id = ?', [id]);
    if (!perm) {
      return res.status(404).json({ error: 'Ruxsat yozuvi topilmadi.' });
    }

    await db.run(`
      UPDATE chat_permissions
      SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.id, id]);

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CHAT_PERMISSION_APPROVED', 'CHAT_PERMISSION', ?, ?)
    `, [req.user.id, id, `User ${perm.user1_id} va User ${perm.user2_id} o'rtasida yozishishga ruxsat berildi`]);

    // Notify requester
    if (perm.requested_by) {
      const partnerId = perm.requested_by === perm.user1_id ? perm.user2_id : perm.user1_id;
      const partner = await db.get('SELECT first_name FROM users WHERE id = ?', [partnerId]);
      await db.run(`
        INSERT INTO notifications (user_id, type, title, body, link)
        VALUES (?, 'system', 'Ruxsat Tasdiqlandi! ✅', ?, ?)
      `, [perm.requested_by, `Super Admin ${partner?.first_name || 'suhbatdosh'} bilan shaxsiy yozishishingizga ruxsat berdi!`, `/chat?dm=${partnerId}`]);
    }

    // Socket alert to both users
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${perm.user1_id}`).emit('permission_status_changed', {
        partnerId: perm.user2_id,
        status: 'approved',
      });
      io.to(`user_${perm.user2_id}`).emit('permission_status_changed', {
        partnerId: perm.user1_id,
        status: 'approved',
      });
    }

    return res.json({ success: true, message: 'Yozishishga ruxsat berildi.' });
  } catch (err) {
    console.error('[Approve Permission Error]:', err);
    return res.status(500).json({ error: 'Ruxsat berishda xatolik.' });
  }
});

// POST /api/permissions/admin/:id/block - Super Admin blocks a chat pair
router.post('/admin/:id/block', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = await getDb();

    const perm = await db.get('SELECT * FROM chat_permissions WHERE id = ?', [id]);
    if (!perm) {
      return res.status(404).json({ error: 'Ruxsat yozuvi topilmadi.' });
    }

    await db.run(`
      UPDATE chat_permissions
      SET status = 'blocked', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.id, id]);

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CHAT_BLOCKED', 'CHAT_PERMISSION', ?, ?)
    `, [req.user.id, id, `User ${perm.user1_id} va User ${perm.user2_id} o'rtasidagi yozishuv bloklandi`]);

    // Socket alert to both users
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${perm.user1_id}`).emit('permission_status_changed', {
        partnerId: perm.user2_id,
        status: 'blocked',
      });
      io.to(`user_${perm.user2_id}`).emit('permission_status_changed', {
        partnerId: perm.user1_id,
        status: 'blocked',
      });
    }

    return res.json({ success: true, message: 'Yozishish muvaffaqiyatli bloklandi.' });
  } catch (err) {
    console.error('[Block Permission Error]:', err);
    return res.status(500).json({ error: 'Bloklashda xatolik.' });
  }
});

// POST /api/permissions/admin/block-pair - Super Admin blocks any two users
router.post('/admin/block-pair', requireAdmin, async (req, res) => {
  try {
    const { user1_id: u1, user2_id: u2 } = req.body;
    const id1 = parseInt(u1, 10);
    const id2 = parseInt(u2, 10);

    if (!id1 || !id2 || id1 === id2) {
      return res.status(400).json({ error: 'Foydalanuvchilar noto‘g‘ri ko‘rsatilgan.' });
    }

    const [user1_id, user2_id] = id1 < id2 ? [id1, id2] : [id2, id1];
    const db = await getDb();

    const existing = await db.get(`
      SELECT id FROM chat_permissions WHERE user1_id = ? AND user2_id = ?
    `, [user1_id, user2_id]);

    if (existing) {
      await db.run(`
        UPDATE chat_permissions
        SET status = 'blocked', approved_by = ?, approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [req.user.id, existing.id]);
    } else {
      await db.run(`
        INSERT INTO chat_permissions (user1_id, user2_id, status, approved_by, approved_at)
        VALUES (?, ?, 'blocked', ?, CURRENT_TIMESTAMP)
      `, [user1_id, user2_id, req.user.id]);
    }

    // Audit log
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CHAT_BLOCKED_DIRECT', 'USERS', 0, ?)
    `, [req.user.id, `User ${user1_id} va ${user2_id} o'rtasida yozishuv bloklandi`]);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user1_id}`).emit('permission_status_changed', { partnerId: user2_id, status: 'blocked' });
      io.to(`user_${user2_id}`).emit('permission_status_changed', { partnerId: user1_id, status: 'blocked' });
    }

    return res.json({ success: true, message: 'Foydalanuvchilar o‘rtasidagi yozishma bloklandi.' });
  } catch (err) {
    console.error('[Block Pair Error]:', err);
    return res.status(500).json({ error: 'Bloklashda xatolik yuz berdi.' });
  }
});

export default router;
