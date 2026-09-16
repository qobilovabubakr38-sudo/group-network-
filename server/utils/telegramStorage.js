import { getDb } from '../db.js';

// Get Telegram configuration from database or env
export async function getTelegramConfig() {
  const db = await getDb();
  const tokenRow = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_bot_token'");
  const channelRow = await db.get("SELECT value FROM system_settings WHERE key = 'telegram_channel_id'");
  const enabledRow = await db.get("SELECT value FROM system_settings WHERE key = 'cloud_storage_enabled'");

  const botToken = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '';
  const channelId = channelRow?.value || process.env.TELEGRAM_CHANNEL_ID || '';
  const isEnabled = enabledRow?.value === '1' || Boolean(botToken && channelId);

  return {
    botToken: botToken.trim(),
    channelId: channelId.trim(),
    isEnabled,
  };
}

// Test Telegram bot credentials
export async function testTelegramConnection(botToken, channelId) {
  try {
    if (!botToken || !channelId) {
      return { success: false, error: 'Bot token va kanal ID kiritilishi shart.' };
    }

    // 1. Verify Bot Token via getMe
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return { success: false, error: `Bot token noto‘g‘ri: ${meData.description || 'Xatolik'}` };
    }

    // 2. Send test message to channel
    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: `🔒 FAMILY NETWORK — Xavfsiz Bulutli Xotira Ulandi!\nBot: @${meData.result.username}\nVaqt: ${new Date().toLocaleString()}`,
      }),
    });

    const msgData = await msgRes.json();
    if (!msgData.ok) {
      return {
        success: false,
        error: `Bot kanalga xabar yubora olmadi. Botni kanalingizga qo‘shib, unga "Admin" huquqini bering! (Telegram javobi: ${msgData.description})`,
      };
    }

    return {
      success: true,
      botUsername: meData.result.username,
      botName: meData.result.first_name,
      message: 'Telegram bulutli xotirasi muvaffaqiyatli ulandi va faollashtirildi!',
    };
  } catch (err) {
    return { success: false, error: `Ulanishda xatolik yuz berdi: ${err.message}` };
  }
}

// Upload encrypted buffer or file to private Telegram Channel
export async function uploadToTelegram(buffer, fileName, caption = '') {
  const config = await getTelegramConfig();
  if (!config.isEnabled || !config.botToken || !config.channelId) {
    return null; // Telegram not configured, fallback to local
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', config.channelId);
    if (caption) formData.append('caption', caption);

    const blob = new Blob([buffer]);
    formData.append('document', blob, fileName);

    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.ok) {
      console.warn('[Telegram Cloud Upload Failed]:', data.description);
      return null;
    }

    const document = data.result?.document || data.result?.photo?.pop() || data.result?.video || data.result?.audio;
    const fileId = document?.file_id;

    return {
      fileId,
      messageId: data.result.message_id,
    };
  } catch (err) {
    console.error('[Telegram Storage Error]:', err.message);
    return null; // Graceful fallback to local storage
  }
}

// Download file buffer from Telegram via file_id
export async function downloadFromTelegram(fileId) {
  const config = await getTelegramConfig();
  if (!config.botToken) return null;

  try {
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${config.botToken}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return null;
    }

    const downloadUrl = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.result.file_path}`;
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok) return null;

    const arrayBuffer = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[Telegram Download Error]:', err.message);
    return null;
  }
}
