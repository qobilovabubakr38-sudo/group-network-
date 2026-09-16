import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin, requireGroupMembership } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/groups - List user's permitted groups (or all for Super Admin)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();

    let groups = [];
    if (req.user.is_admin === 1) {
      groups = await db.all(`
        SELECT g.id, g.name, g.description, g.category, g.created_at,
               COUNT(gm.user_id) as member_count
        FROM groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        GROUP BY g.id
        ORDER BY g.name ASC
      `);
    } else {
      groups = await db.all(`
        SELECT g.id, g.name, g.description, g.category, g.created_at, gm.joined_at,
               (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
        ORDER BY g.name ASC
      `, [req.user.id]);
    }

    // For each group, get last message info
    for (const g of groups) {
      const lastMsg = await db.get(`
        SELECT m.content, m.message_type, m.created_at, u.first_name, u.relationship
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = ?
        ORDER BY m.id DESC LIMIT 1
      `, [g.id]);
      g.last_message = lastMsg || null;
    }

    return res.json({ groups });
  } catch (error) {
    console.error('[Get Groups Error]:', error);
    return res.status(500).json({ error: 'Guruhlarni olishda xatolik yuz berdi.' });
  }
});

// GET /api/groups/:id - Get specific group details with membership verification (403 if unauthorized)
router.get('/:id', requireGroupMembership('id'), async (req, res) => {
  try {
    const groupId = req.params.id;
    const db = await getDb();

    const group = await db.get('SELECT id, name, description, category, created_at FROM groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ error: 'Guruh topilmadi.' });
    }

    // Get members of this group
    const members = await db.all(`
      SELECT u.id, u.first_name, u.last_name, u.relationship, u.gender, u.avatar, u.birthday, u.status, gm.joined_at
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ? AND u.status = 'active'
      ORDER BY u.first_name ASC
    `, [groupId]);

    group.members = members;
    return res.json({ group });
  } catch (error) {
    console.error('[Get Group Error]:', error);
    return res.status(500).json({ error: 'Guruh ma‘lumotlarini yuklashda xatolik.' });
  }
});

// POST /api/groups - Create a new group (Super Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, category = 'family', members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Guruh nomi kiritilishi shart.' });
    }

    const db = await getDb();
    const result = await db.run(`
      INSERT INTO groups (name, description, category, created_by)
      VALUES (?, ?, ?, ?)
    `, [name.trim(), description ? description.trim() : null, category || 'family', req.user.id]);

    const newGroupId = result.lastID;

    // Add selected members
    if (Array.isArray(members) && members.length > 0) {
      for (const userId of members) {
        await db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [newGroupId, userId]);
      }
    }

    // Log admin action
    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'CREATE_GROUP', 'GROUP', ?, ?)
    `, [req.user.id, newGroupId, `Yangi guruh yaratildi: ${name} (${category})`]);

    return res.status(201).json({
      message: 'Guruh muvaffaqiyatli yaratildi.',
      groupId: newGroupId,
    });
  } catch (error) {
    console.error('[Create Group Error]:', error);
    return res.status(500).json({ error: 'Guruh yaratishda xatolik yuz berdi.' });
  }
});

// PUT /api/groups/:id - Update group name, description, category and members (Super Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { name, description, category, members } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT id, name FROM groups WHERE id = ?', [groupId]);
    if (!existing) {
      return res.status(404).json({ error: 'Guruh topilmadi.' });
    }

    await db.run(`
      UPDATE groups SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category)
      WHERE id = ?
    `, [name ? name.trim() : null, description !== undefined ? description : null, category || null, groupId]);

    if (Array.isArray(members)) {
      await db.run('DELETE FROM group_members WHERE group_id = ?', [groupId]);
      for (const uId of members) {
        await db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, uId]);
      }
    }

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'UPDATE_GROUP', 'GROUP', ?, ?)
    `, [req.user.id, groupId, `Guruh yangilandi: ${name || existing.name}`]);

    return res.json({ message: 'Guruh muvaffaqiyatli yangilandi.' });
  } catch (error) {
    console.error('[Update Group Error]:', error);
    return res.status(500).json({ error: 'Guruhni yangilashda xatolik yuz berdi.' });
  }
});

// DELETE /api/groups/:id - Delete group (Super Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const groupId = req.params.id;
    const db = await getDb();

    const existing = await db.get('SELECT id, name FROM groups WHERE id = ?', [groupId]);
    if (!existing) {
      return res.status(404).json({ error: 'Guruh topilmadi.' });
    }

    await db.run('DELETE FROM groups WHERE id = ?', [groupId]);

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'DELETE_GROUP', 'GROUP', ?, ?)
    `, [req.user.id, groupId, `Guruh o‘chirildi: ${existing.name}`]);

    return res.json({ message: 'Guruh muvaffaqiyatli o‘chirildi.' });
  } catch (error) {
    console.error('[Delete Group Error]:', error);
    return res.status(500).json({ error: 'Guruhni o‘chirishda xatolik yuz berdi.' });
  }
});

export default router;
