import express from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// Helper to calculate days until next birthday
function getBirthdayDetails(birthdayStr) {
  if (!birthdayStr) return null;
  const parts = birthdayStr.split('-');
  if (parts.length !== 3) return null;

  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const birthDay = parseInt(parts[2], 10);

  const now = new Date();
  const currentYear = now.getFullYear();

  let nextBday = new Date(currentYear, birthMonth, birthDay);
  // If already passed this year, set to next year
  const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (nextBday < todayReset) {
    nextBday = new Date(currentYear + 1, birthMonth, birthDay);
  }

  const diffTime = nextBday.getTime() - todayReset.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;

  // Calculate age turning
  const birthYear = parseInt(parts[0], 10);
  const turningAge = nextBday.getFullYear() - birthYear;

  return {
    daysUntil,
    isToday,
    isTomorrow,
    turningAge,
    formattedDate: `${String(birthDay).padStart(2, '0')}.${String(birthMonth + 1).padStart(2, '0')}.${birthYear}`,
  };
}

// GET /api/birthdays - Strictly group-isolated birthdays
router.get('/', async (req, res) => {
  try {
    const db = await getDb();

    let relatives = [];
    if (req.user.is_admin === 1) {
      relatives = await db.all(`
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.relationship, u.birthday, u.avatar
        FROM users u
        WHERE u.status = 'active' AND u.birthday IS NOT NULL AND u.birthday != ''
        ORDER BY u.first_name ASC
      `);
    } else {
      // ONLY users who share AT LEAST ONE group with current user
      relatives = await db.all(`
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.relationship, u.birthday, u.avatar
        FROM users u
        JOIN group_members gm_target ON u.id = gm_target.user_id
        JOIN group_members gm_user ON gm_target.group_id = gm_user.group_id
        WHERE gm_user.user_id = ?
          AND u.status = 'active'
          AND u.birthday IS NOT NULL
          AND u.birthday != ''
        ORDER BY u.first_name ASC
      `, [req.user.id]);
    }

    const todayList = [];
    const tomorrowList = [];
    const upcomingList = [];
    const fullList = [];

    for (const r of relatives) {
      const details = getBirthdayDetails(r.birthday);
      if (!details) continue;

      // Get shared groups with current user for quick greeting action
      let sharedGroups = [];
      if (req.user.is_admin === 1) {
        sharedGroups = await db.all(`
          SELECT g.id, g.name
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = ?
        `, [r.id]);
      } else {
        sharedGroups = await db.all(`
          SELECT g.id, g.name
          FROM groups g
          JOIN group_members gm1 ON g.id = gm1.group_id
          JOIN group_members gm2 ON g.id = gm2.group_id
          WHERE gm1.user_id = ? AND gm2.user_id = ?
        `, [req.user.id, r.id]);
      }

      const item = {
        ...r,
        ...details,
        shared_groups: sharedGroups,
      };

      if (details.isToday) {
        todayList.push(item);
      } else if (details.isTomorrow) {
        tomorrowList.push(item);
      } else if (details.daysUntil <= 30) {
        upcomingList.push(item);
      }

      fullList.push(item);
    }

    // Sort fullList and upcoming by days until
    upcomingList.sort((a, b) => a.daysUntil - b.daysUntil);
    fullList.sort((a, b) => a.daysUntil - b.daysUntil);

    return res.json({
      today: todayList,
      tomorrow: tomorrowList,
      upcoming: upcomingList,
      all: fullList,
    });
  } catch (error) {
    console.error('[Birthdays Error]:', error);
    return res.status(500).json({ error: 'Tug‘ilgan kunlar ro‘yxatini olishda xatolik.' });
  }
});

export default router;
