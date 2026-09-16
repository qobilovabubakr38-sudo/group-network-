import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { testTelegramConnection } from '../utils/telegramStorage.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/settings - View current cloud and security settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const tokenRow = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_bot_token'");
    const channelRow = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_channel_id'");
    const enabledRow = await db.get("SELECT value FROM system_settings WHERE key = 'cloud_storage_enabled'");

    const rawToken = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '';
    const maskedToken = rawToken
      ? `${rawToken.substring(0, 8)}...${rawToken.substring(rawToken.length - 4)}`
      : '';

    return res.json({
      telegram_bot_token: maskedToken,
      has_bot_token: Boolean(rawToken),
      telegram_channel_id: channelRow?.value || process.env.TELEGRAM_CHANNEL_ID || '',
      cloud_storage_enabled: enabledRow?.value === '1',
      security: {
        aes_256_encryption: 'FAOL (AES-256-GCM)',
        rate_limiting: 'FAOL (Brute-Force & DDoS Guard)',
        session_guard: 'FAOL (Instant Token Revocation)',
        exif_stripper: 'FAOL (GPS Privacy Shield)',
        group_isolation: 'FAOL (Server-Side 403)',
      },
    });
  } catch (err) {
    console.error('[Get Settings Error]:', err);
    return res.status(500).json({ error: 'Sozlamalarni olishda xatolik.' });
  }
});

// POST /api/admin/settings - Save cloud storage settings
router.post('/', async (req, res) => {
  try {
    const { telegram_bot_token, telegram_channel_id, cloud_storage_enabled } = req.body;
    const db = await getDb();

    if (telegram_bot_token && !telegram_bot_token.includes('...')) {
      await db.run(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('telegram_bot_token', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        [telegram_bot_token.trim()]
      );
    }

    if (telegram_channel_id !== undefined) {
      await db.run(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('telegram_channel_id', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        [telegram_channel_id.trim()]
      );
    }

    if (cloud_storage_enabled !== undefined) {
      await db.run(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('cloud_storage_enabled', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        [cloud_storage_enabled ? '1' : '0']
      );
    }

    await db.run(`
      INSERT INTO audit_logs (admin_id, action, target_type, details)
      VALUES (?, 'UPDATE_SETTINGS', 'SYSTEM', 'Bulutli xotira (Telegram) sozlamalari yangilandi')
    `, [req.user.id]);

    return res.json({ message: 'Sozlamalar muvaffaqiyatli saqlandi!' });
  } catch (err) {
    console.error('[Save Settings Error]:', err);
    return res.status(500).json({ error: 'Sozlamalarni saqlashda xatolik.' });
  }
});

// POST /api/admin/settings/test-telegram - Test Telegram Bot connection
router.post('/test-telegram', async (req, res) => {
  try {
    let { botToken, channelId } = req.body;
    const db = await getDb();

    // If masked token sent, read from DB
    if (!botToken || botToken.includes('...')) {
      const row = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_bot_token'");
      botToken = row?.value || process.env.TELEGRAM_BOT_TOKEN;
    }

    if (!channelId) {
      const row = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_channel_id'");
      channelId = row?.value || process.env.TELEGRAM_CHANNEL_ID;
    }

    const testResult = await testTelegramConnection(botToken, channelId);
    return res.json(testResult);
  } catch (err) {
    console.error('[Test Telegram Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
