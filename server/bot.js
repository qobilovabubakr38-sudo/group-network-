import { getDb } from './db.js';
import { getTelegramConfig } from './utils/telegramStorage.js';

let isPolling = false;
let pollOffset = 0;

export async function sendTelegramAdminAlert(permId, requesterName, targetName, requesterGender, targetGender) {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken || !config.channelId) return false;

    const text = '🛡️ *YANGI YOZISHISH SO‘ROVI*\n\n' +
      '👤 *So‘rovchi:* ' + requesterName + ' (' + (requesterGender === 'male' ? 'O‘g‘il bola' : 'Qiz bola') + ')\n' +
      '🎯 *Suhbatdosh:* ' + targetName + ' (' + (targetGender === 'male' ? 'O‘g‘il bola' : 'Qiz bola') + ')\n' +
      '📅 *Vaqt:* ' + new Date().toLocaleString('uz-UZ') + '\n\n' +
      'Qarama-qarshi jinsdagi a‘zolar shaxsiy yozishish uchun sizdan ruxsat so‘ramoqda.';

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Ruxsat berish', callback_data: 'perm_approve_' + permId },
          { text: '❌ Bloklash', callback_data: 'perm_block_' + permId }
        ]
      ]
    };

    const res = await fetch('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.channelId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      })
    });

    return res.ok;
  } catch (err) {
    console.error('[Telegram Admin Alert Error]:', err.message);
    return false;
  }
}

async function handleCallbackQuery(cb, token, io) {
  try {
    const data = cb.data;
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const db = await getDb();

    if (data.startsWith('perm_approve_')) {
      const permId = parseInt(data.replace('perm_approve_', ''), 10);
      const perm = await db.get('SELECT * FROM chat_permissions WHERE id = ?', [permId]);
      if (perm) {
        await db.run('UPDATE chat_permissions SET status = \'approved\', approved_at = CURRENT_TIMESTAMP WHERE id = ?', [permId]);

        if (io) {
          io.to('user_' + perm.user1_id).emit('permission_status_changed', {
            partnerId: perm.user2_id,
            status: 'approved',
          });
          io.to('user_' + perm.user2_id).emit('permission_status_changed', {
            partnerId: perm.user1_id,
            status: 'approved',
          });
        }

        await fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: '✅ Ruxsat berildi!',
            show_alert: true,
          })
        });

        await fetch('https://api.telegram.org/bot' + token + '/editMessageText', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: (cb.message.text || '') + '\n\n✅ *SUPER ADMIN RUXSAT BERDI!* (Tasdiqlandi: ' + new Date().toLocaleTimeString('uz-UZ') + ')',
            parse_mode: 'Markdown',
          })
        });
      }
    } else if (data.startsWith('perm_block_')) {
      const permId = parseInt(data.replace('perm_block_', ''), 10);
      const perm = await db.get('SELECT * FROM chat_permissions WHERE id = ?', [permId]);
      if (perm) {
        await db.run('UPDATE chat_permissions SET status = \'blocked\', approved_at = CURRENT_TIMESTAMP WHERE id = ?', [permId]);

        if (io) {
          io.to('user_' + perm.user1_id).emit('permission_status_changed', {
            partnerId: perm.user2_id,
            status: 'blocked',
          });
          io.to('user_' + perm.user2_id).emit('permission_status_changed', {
            partnerId: perm.user1_id,
            status: 'blocked',
          });
        }

        await fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: '❌ Yozishuv bloklandi.',
            show_alert: true,
          })
        });

        await fetch('https://api.telegram.org/bot' + token + '/editMessageText', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: (cb.message.text || '') + '\n\n❌ *SUPER ADMIN TOMONIDAN BLOKLANDI!*',
            parse_mode: 'Markdown',
          })
        });
      }
    }
  } catch (e) {
    console.error('[Callback Query Error]:', e.message);
  }
}

async function handleMessage(msg, token) {
  try {
    const text = msg.text?.trim() || '';
    const chatId = msg.chat.id;
    const db = await getDb();

    if (text === '/start') {
      const welcome = '✨ *GROUP — Private Network Bot*\n\n' +
        'Assalomu alaykum! GROUP xavfsiz tarmog‘ining rasmiy boshqaruv botiga xush kelibsiz.\n\n' +
        '🛡️ *Vazifalari:*\n' +
        '• Bepul va cheksiz bulutli xotira (rasm, video, audio Telegramda saqlanadi);\n' +
        '• Qarama-qarshi jinsdagi yozishuv so‘rovlarini shu yerdan turib tasdiqlash yoki bloklash;\n' +
        '• Yangi xabarlar va tizim nazorati.\n\n' +
        '📌 *Mavjud buyruqlar:*\n' +
        '/status — Sayt va server holati\n' +
        '/ruxsatlar — Kutilayotgan ruxsat so‘rovlari\n' +
        '/foydalanuvchilar — Ro‘yxatdagi a‘zolar soni';

      await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcome,
          parse_mode: 'Markdown'
        })
      });
    } else if (text === '/status') {
      const usersRow = await db.get('SELECT COUNT(*) as c FROM users');
      const groupsRow = await db.get('SELECT COUNT(*) as c FROM groups');
      const pendingRow = await db.get('SELECT COUNT(*) as c FROM chat_permissions WHERE status = \'pending\'');

      const statusMsg = '📊 *GROUP Tizim Holati:*\n\n' +
        '🟢 *Server:* Faol (Online)\n' +
        '👥 *Foydalanuvchilar:* ' + (usersRow?.c || 0) + ' nafar\n' +
        '📁 *Guruhlar:* ' + (groupsRow?.c || 0) + ' ta\n' +
        '🛡️ *Kutilayotgan ruxsatlar:* ' + (pendingRow?.c || 0) + ' ta\n' +
        '☁️ *Telegram Cloud:* Faol\n' +
        '⏰ *Vaqt:* ' + new Date().toLocaleString('uz-UZ');

      await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: statusMsg,
          parse_mode: 'Markdown'
        })
      });
    } else if (text === '/ruxsatlar') {
      const pendings = await db.all(
        'SELECT cp.id, u1.first_name as u1_name, u2.first_name as u2_name ' +
        'FROM chat_permissions cp ' +
        'JOIN users u1 ON cp.user1_id = u1.id ' +
        'JOIN users u2 ON cp.user2_id = u2.id ' +
        'WHERE cp.status = \'pending\''
      );

      if (!pendings || pendings.length === 0) {
        await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ Hozircha kutilayotgan yangi ruxsat so‘rovlari yo‘q.',
          })
        });
      } else {
        for (const p of pendings) {
          await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '🛡️ So‘rov: *' + p.u1_name + '* va *' + p.u2_name + '* o‘rtasida shaxsiy chat ochish',
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Ruxsat berish', callback_data: 'perm_approve_' + p.id },
                    { text: '❌ Bloklash', callback_data: 'perm_block_' + p.id }
                  ]
                ]
              }
            })
          });
        }
      }
    }
  } catch (e) {
    console.error('[Bot Handle Message Error]:', e.message);
  }
}

export async function startTelegramBot(io) {
  if (isPolling) return;
  const config = await getTelegramConfig();
  if (!config.botToken) {
    console.log('[Bot] Telegram Bot Token kiritilmagan. Bot sozlanganidan so‘ng faollashadi.');
    return;
  }

  isPolling = true;
  console.log('[Bot] GROUP Telegram Bot muvaffaqiyatli ishga tushirildi!');

  const poll = async () => {
    if (!isPolling) return;
    try {
      const curConfig = await getTelegramConfig();
      if (!curConfig.botToken) {
        isPolling = false;
        return;
      }

      const res = await fetch('https://api.telegram.org/bot' + curConfig.botToken + '/getUpdates?offset=' + pollOffset + '&timeout=20');
      const data = await res.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          pollOffset = update.update_id + 1;
          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, curConfig.botToken, io);
          } else if (update.message) {
            await handleMessage(update.message, curConfig.botToken);
          }
        }
      }
    } catch (e) {
      // polling error or timeout
    }
    setTimeout(poll, 1500);
  };

  poll();
}
