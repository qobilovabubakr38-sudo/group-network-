import express from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/contacts - Strictly group-isolated contacts list
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const search = req.query.q ? `%${req.query.q.trim()}%` : null;

    let contacts = [];
    if (req.user.is_admin === 1) {
      if (search) {
        contacts = await db.all(`
          SELECT id, first_name, last_name, username, relationship, birthday, avatar, status
          FROM users
          WHERE status = 'active'
            AND (first_name LIKE ? OR last_name LIKE ? OR relationship LIKE ? OR username LIKE ?)
          ORDER BY first_name ASC
        `, [search, search, search, search]);
      } else {
        contacts = await db.all(`
          SELECT id, first_name, last_name, username, relationship, birthday, avatar, status
          FROM users
          WHERE status = 'active'
          ORDER BY first_name ASC
        `);
      }
    } else {
      if (search) {
        contacts = await db.all(`
          SELECT DISTINCT u.id, u.first_name, u.last_name, u.relationship, u.birthday, u.avatar, u.status
          FROM users u
          JOIN group_members gm_target ON u.id = gm_target.user_id
          JOIN group_members gm_user ON gm_target.group_id = gm_user.group_id
          WHERE gm_user.user_id = ?
            AND u.id != ?
            AND u.status = 'active'
            AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.relationship LIKE ?)
          ORDER BY u.first_name ASC
        `, [req.user.id, req.user.id, search, search, search]);
      } else {
        contacts = await db.all(`
          SELECT DISTINCT u.id, u.first_name, u.last_name, u.relationship, u.birthday, u.avatar, u.status
          FROM users u
          JOIN group_members gm_target ON u.id = gm_target.user_id
          JOIN group_members gm_user ON gm_target.group_id = gm_user.group_id
          WHERE gm_user.user_id = ?
            AND u.id != ?
            AND u.status = 'active'
          ORDER BY u.first_name ASC
        `, [req.user.id, req.user.id]);
      }
    }

    // Attach shared groups and birthday info for each contact
    for (const c of contacts) {
      let sharedGroups = [];
      if (req.user.is_admin === 1) {
        sharedGroups = await db.all(`
          SELECT g.id, g.name
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = ?
        `, [c.id]);
      } else {
        sharedGroups = await db.all(`
          SELECT g.id, g.name
          FROM groups g
          JOIN group_members gm1 ON g.id = gm1.group_id
          JOIN group_members gm2 ON g.id = gm2.group_id
          WHERE gm1.user_id = ? AND gm2.user_id = ?
        `, [req.user.id, c.id]);
      }
      c.shared_groups = sharedGroups;

      if (c.birthday) {
        const parts = c.birthday.split('-');
        if (parts.length === 3) {
          c.birthday_formatted = `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
      }
    }

    return res.json({ contacts });
  } catch (error) {
    console.error('[Get Contacts Error]:', error);
    return res.status(500).json({ error: 'Kontaktlarni yuklashda xatolik yuz berdi.' });
  }
});

export default router;
