import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & admin check to all routes in this file
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/stats - Overview statistics
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const totalGroups = await db.get('SELECT COUNT(*) as count FROM groups');
    const activeUsers = await db.get("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    
    // Today's birthdays
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayPattern = `%-${mm}-${dd}`;

    const birthdaysToday = await db.all(`
      SELECT id, first_name, last_name, relationship, birthday, avatar
      FROM users
      WHERE birthday LIKE ? AND status = 'active'
    `, [todayPattern]);

    const totalMessages = await db.get('SELECT COUNT(*) as count FROM messages');

    return res.json({
      totalUsers: totalUsers.count,
      totalGroups: totalGroups.count,
      activeUsers: activeUsers.count,
      birthdaysToday: birthdaysToday.length,
      birthdaysTodayList: birthdaysToday,
      totalMessages: totalMessages.count,
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return res.status(500).json({ error: 'Statistikani olishda xatolik yuz berdi.' });
  }
});

// GET /api/admin/users - List all users with their assigned groups
router.get('/users', async (req, res) => {
  try {
    const db = await getDb();

    const users = await db.all(`
      SELECT id, first_name, last_name, username, relationship, gender, birthday, avatar, is_admin, status, created_at
      FROM users
      ORDER BY id DESC
    `);

    // For each user, attach assigned groups
    for (const u of users) {
      const groups = await db.all(`
        SELECT g.id, g.name
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
      `, [u.id]);
      u.groups = groups;
    }

    return res.json({ users });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({ error: 'Foydalanuvchilarni olishda xatolik yuz berdi.' });
  }
});

// POST /api/admin/users - Create a new relative
router.post('/users', async (req, res) => {
  try {
    const { first_name, last_name, username, password, relationship, gender = 'male', birthday, avatar, groups } = req.body;

    if (!first_name || !last_name || !username || !password || !relationship) {
      return res.status(400).json({ error: 'Ism, familiya, login, parol va qarindoshlik turi kiritilishi shart.' });
    }

    const db = await getDb();

    // Check if username already exists
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Ushbu login band. Boshqa login tanlang.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userResult = await db.run(`
      INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
    `, [
      first_name.trim(),
      last_name.trim(),
      username.trim(),
      password_hash,
      relationship.trim(),
      gender || 'male',
      birthday || null,
      avatar || null,
    ]);

    const newUserId = userResult.lastID;

    // Assign to groups if specified
    if (Array.isArray(groups) && groups.length > 0) {
      for (const groupId of groups) {
        await db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, newUserId]);
      }
    }

    // Log admin action
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CREATE_USER', 'USER', ?, ?)
    `, [
      req.user.id,
      newUserId,
      `Yangi foydalanuvchi yaratildi: ${first_name} ${last_name} (${relationship}, @${username})`
    ]);

    return res.status(201).json({
      message: 'Foydalanuvchi muvaffaqiyatli qo‘shildi.',
      userId: newUserId,
    });
  } catch (error) {
    console.error('[Admin Create User Error]:', error);
    return res.status(500).json({ error: 'Qarindoshni qo‘shishda xatolik yuz berdi.' });
  }
});

// PUT /api/admin/users/:id - Update relative details & groups
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, username, relationship, gender, birthday, avatar, groups } = req.body;

    const db = await getDb();
    const targetUser = await db.get('SELECT id, is_admin FROM users WHERE id = ?', [userId]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    // Check username conflict if changed
    if (username) {
      const conflict = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [username.trim(), userId]);
      if (conflict) {
        return res.status(400).json({ error: 'Ushbu login boshqa foydalanuvchi tomonidan band.' });
      }
    }

    await db.run(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        username = COALESCE(?, username),
        relationship = COALESCE(?, relationship),
        gender = COALESCE(?, gender),
        birthday = COALESCE(?, birthday),
        avatar = COALESCE(?, avatar),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      username ? username.trim() : null,
      relationship ? relationship.trim() : null,
      gender || null,
      birthday !== undefined ? birthday : null,
      avatar !== undefined ? avatar : null,
      userId
    ]);

    // Update group memberships if groups array is provided
    if (Array.isArray(groups)) {
      await db.run('DELETE FROM group_members WHERE user_id = ?', [userId]);
      for (const gId of groups) {
        await db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [gId, userId]);
      }
    }

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'UPDATE_USER', 'USER', ?, ?)
    `, [req.user.id, userId, `Foydalanuvchi ma‘lumotlari yangilandi (ID: ${userId})`]);

    return res.json({ message: 'Ma‘lumotlar muvaffaqiyatli yangilandi.' });
  } catch (error) {
    console.error('[Admin Update User Error]:', error);
    return res.status(500).json({ error: 'Tahrirlashda xatolik yuz berdi.' });
  }
});

// POST /api/admin/users/:id/reset-password - Reset password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const userId = req.params.id;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Yangi parol kamida 6 belgidan iborat bo‘lishi kerak.' });
    }

    const db = await getDb();
    const targetUser = await db.get('SELECT id, first_name, last_name FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await db.run('UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password_hash, userId]);

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'RESET_PASSWORD', 'USER', ?, ?)
    `, [req.user.id, userId, `Parol yangilandi va barcha faol sessiyalar bekor qilindi: ${targetUser.first_name} ${targetUser.last_name}`]);

    return res.json({ message: 'Parol muvaffaqiyatli yangilandi va barcha faol sessiyalar to‘xtatildi.' });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ error: 'Parolni tiklashda xatolik yuz berdi.' });
  }
});

// PUT /api/admin/users/:id/status - Toggle active/disabled
router.put('/users/:id/status', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Noto‘g‘ri status.' });
    }

    const db = await getDb();
    const targetUser = await db.get('SELECT id, is_admin, first_name FROM users WHERE id = ?', [userId]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    if (targetUser.is_admin === 1) {
      return res.status(400).json({ error: 'Super Admin holatini o‘zgartirib bo‘lmaydi.' });
    }

    await db.run('UPDATE users SET status = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, userId]);

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CHANGE_STATUS', 'USER', ?, ?)
    `, [req.user.id, userId, `Status o‘zgartirildi: ${targetUser.first_name} -> ${status} (sessiyalar bekor qilindi)`]);

    return res.json({ message: `Foydalanuvchi holati: ${status === 'active' ? 'Faollashtirildi' : 'Faolsizlantirildi (barcha sessiyalari o‘chirildi)'}` });
  } catch (error) {
    console.error('[Change Status Error]:', error);
    return res.status(500).json({ error: 'Holatni o‘zgartirishda xatolik yuz berdi.' });
  }
});

// DELETE /api/admin/users/:id - Delete relative
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const db = await getDb();

    const targetUser = await db.get('SELECT id, is_admin, first_name, last_name FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    if (targetUser.is_admin === 1) {
      return res.status(400).json({ error: 'Super Adminni o‘chirib bo‘lmaydi.' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'DELETE_USER', 'USER', ?, ?)
    `, [req.user.id, userId, `Foydalanuvchi o‘chirildi: ${targetUser.first_name} ${targetUser.last_name}`]);

    return res.json({ message: 'Qarindosh tizimdan muvaffaqiyatli o‘chirildi.' });
  } catch (error) {
    console.error('[Delete User Error]:', error);
    return res.status(500).json({ error: 'O‘chirishda xatolik yuz berdi.' });
  }
});

export default router;
