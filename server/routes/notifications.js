import express from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const db = await getDb();

    const notifications = await db.all(`
      SELECT id, type, title, body, link, read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = await db.get(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND read = 0
    `, [req.user.id]);

    return res.json({
      notifications,
      unreadCount: unreadCount.count,
    });
  } catch (error) {
    console.error('[Get Notifications Error]:', error);
    return res.status(500).json({ error: 'Bildirishnomalarni olishda xatolik.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: 'O‘qilgan deb belgilandi.' });
  } catch (error) {
    console.error('[Mark Notification Read Error]:', error);
    return res.status(500).json({ error: 'Bildirishnomani yangilashda xatolik.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ message: 'Barcha bildirishnomalar o‘qilgan deb belgilandi.' });
  } catch (error) {
    console.error('[Mark All Read Error]:', error);
    return res.status(500).json({ error: 'Yangilashda xatolik.' });
  }
});

export default router;
