import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/audit-logs
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit, 10) || 100;

    const logs = await db.all(`
      SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
             u.first_name as admin_name, u.username as admin_username
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.id DESC
      LIMIT ?
    `, [limit]);

    return res.json({ logs });
  } catch (error) {
    console.error('[Audit Logs Error]:', error);
    return res.status(500).json({ error: 'Audit jurnalini olishda xatolik.' });
  }
});

export default router;
