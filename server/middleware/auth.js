import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'family_secret_key_gold_2026_super_secure';

export async function requireAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Kirish talab qilinadi. Iltimos, tizimga kiring.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDb();

    const user = await db.get(`
      SELECT id, first_name, last_name, username, relationship, birthday, avatar, is_admin, status, token_version, created_at
      FROM users WHERE id = ?
    `, [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    if (user.status !== 'active') {
      res.clearCookie('token');
      return res.status(403).json({ error: 'Akkauntingiz faolsizlantirilgan. Admin bilan bog‘laning.' });
    }

    // Instant session invalidation check
    if (decoded.token_version && user.token_version && decoded.token_version !== user.token_version) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'Xavfsizlik talabi: Sessiyangiz muddati tugadi yoki parol yangilandi. Iltimos, qayta kiring.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Yaroqsiz yoki muddati o‘tgan sessiya tokeni.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ error: 'Ruxsat berilmagan: bu amal faqat Super Admin uchun.' });
  }
  next();
}

export function requireGroupMembership(paramName = 'groupId') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Kirish talab qilinadi.' });
      }

      // Super Admin has access to all groups
      if (req.user.is_admin === 1) {
        return next();
      }

      const groupId = req.params[paramName] || req.body[paramName] || req.query[paramName];
      if (!groupId) {
        return res.status(400).json({ error: 'Guruh ID si ko‘rsatilmadi.' });
      }

      const db = await getDb();
      const membership = await db.get(`
        SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?
      `, [groupId, req.user.id]);

      if (!membership) {
        return res.status(403).json({ error: 'Kirish taqiqlangan: siz ushbu guruh a‘zosi emassiz.' });
      }

      next();
    } catch (err) {
      console.error('[Auth Group Error]:', err);
      return res.status(500).json({ error: 'Guruh ruxsatini tekshirishda xatolik yuz berdi.' });
    }
  };
}

export async function checkDirectMessagePermission(user1Id, user2Id) {
  if (!user1Id || !user2Id) {
    return { allowed: false, reason: 'INVALID_ID', message: 'Foydalanuvchi ko‘rsatilmadi.' };
  }
  const id1 = parseInt(user1Id, 10);
  const id2 = parseInt(user2Id, 10);

  if (id1 === id2) {
    return { allowed: true, reason: 'SELF', message: 'O‘z-o‘ziga xabar yuborish' };
  }

  const db = await getDb();
  const u1 = await db.get('SELECT id, first_name, is_admin, gender, status FROM users WHERE id = ?', [id1]);
  const u2 = await db.get('SELECT id, first_name, is_admin, gender, status FROM users WHERE id = ?', [id2]);

  if (!u1 || !u2 || u1.status !== 'active' || u2.status !== 'active') {
    return { allowed: false, reason: 'INACTIVE', message: 'Foydalanuvchi faol emas yoki topilmadi.' };
  }

  // Super Admin can communicate with anyone directly
  if (u1.is_admin === 1 || u2.is_admin === 1) {
    return { allowed: true, reason: 'ADMIN', message: 'Super Admin aloqasi' };
  }

  // Common group check
  const commonGroup = await db.get(`
    SELECT 1
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = ? AND gm2.user_id = ?
    LIMIT 1
  `, [id1, id2]);

  if (!commonGroup) {
    return { allowed: false, reason: 'NO_COMMON_GROUP', message: 'Siz bu foydalanuvchi bilan umumiy guruhda emassiz.' };
  }

  // Normalize user IDs for chat_permissions table (smaller ID first)
  const [user1_id, user2_id] = id1 < id2 ? [id1, id2] : [id2, id1];

  const perm = await db.get(`
    SELECT id, status, requested_by, approved_by, approved_at
    FROM chat_permissions
    WHERE user1_id = ? AND user2_id = ?
  `, [user1_id, user2_id]);

  // If chat is explicitly blocked by admin
  if (perm && perm.status === 'blocked') {
    return {
      allowed: false,
      reason: 'BLOCKED',
      status: 'blocked',
      permissionId: perm.id,
      message: 'Ushbu suhbatdosh bilan yozishish Super Admin tomonidan bloklangan.',
    };
  }

  // Cross-gender check (e.g. boy <-> girl)
  const g1 = (u1.gender || 'male').toLowerCase();
  const g2 = (u2.gender || 'male').toLowerCase();
  const isCrossGender = g1 !== g2;

  if (isCrossGender) {
    if (!perm || perm.status !== 'approved') {
      return {
        allowed: false,
        reason: 'REQUIRES_APPROVAL',
        status: perm ? perm.status : 'not_requested',
        permissionId: perm ? perm.id : null,
        requestedBy: perm ? perm.requested_by : null,
        message: 'Qarama-qarshi jinsdagi sinfdosh/qarindosh bilan yozishish uchun Super Admin ruxsati zarur.',
      };
    }
  }

  return {
    allowed: true,
    reason: perm?.status === 'approved' ? 'APPROVED' : 'SAME_GENDER',
    status: perm?.status || 'allowed',
    permissionId: perm?.id || null,
    message: 'Yozishishga ruxsat berilgan.',
  };
}

export async function canDirectMessage(user1Id, user2Id) {
  const check = await checkDirectMessagePermission(user1Id, user2Id);
  return check.allowed;
}

export function requireDirectMessageAccess(paramName = 'recipientId') {
  return async (req, res, next) => {
    try {
      const recipientId = parseInt(req.params[paramName] || req.body[paramName], 10);
      if (!recipientId) {
        return res.status(400).json({ error: 'Foydalanuvchi ID si ko‘rsatilmadi.' });
      }

      const check = await checkDirectMessagePermission(req.user.id, recipientId);
      if (!check.allowed) {
        return res.status(403).json({
          error: check.message,
          reason: check.reason,
          status: check.status,
          permissionId: check.permissionId,
        });
      }

      next();
    } catch (err) {
      console.error('[DM Auth Error]:', err);
      return res.status(500).json({ error: 'Ruxsatni tekshirishda xatolik yuz berdi.' });
    }
  };
}


