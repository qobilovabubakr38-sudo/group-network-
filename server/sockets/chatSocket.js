import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

// In-memory set of currently online user IDs
const onlineUsers = new Map(); // userId -> Set of socket IDs

export function initChatSocket(io) {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Also check cookies if available
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, c) => {
          const [key, val] = c.trim().split('=');
          acc[key] = val;
          return acc;
        }, {});
        token = cookies.token;
      }

      if (!token) {
        return next(new Error('Autentifikatsiya xatosi: Token topilmadi'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const db = await getDb();
      const user = await db.get(`
        SELECT id, first_name, last_name, username, relationship, avatar, is_admin, status
        FROM users WHERE id = ?
      `, [decoded.id]);

      if (!user || user.status !== 'active') {
        return next(new Error('Foydalanuvchi faol emas'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Yaroqsiz token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.first_name} (@${user.username}) [${socket.id}]`);

    // Track online presence
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
    }
    onlineUsers.get(user.id).add(socket.id);

    // Auto-join personal room for private 1-on-1 notifications & messages
    socket.join(`user_${user.id}`);
    if (user.is_admin === 1) {
      socket.join('admin_surveillance');
    }

    // Broadcast online status to all
    io.emit('presence_update', {
      userId: user.id,
      status: 'online',
      onlineUserIds: Array.from(onlineUsers.keys()),
    });

    // Send current online user IDs to newly connected socket
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // Event: join_group with strict server-side group isolation
    socket.on('join_group', async ({ groupId }) => {
      try {
        if (!groupId) return;

        const db = await getDb();
        // Check membership if not admin
        if (user.is_admin !== 1) {
          const member = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, user.id]);
          if (!member) {
            return socket.emit('error_message', { error: 'Kirish taqiqlangan: siz bu guruh a‘zosi emassiz.' });
          }
        }

        const roomName = `group_${groupId}`;
        socket.join(roomName);
        socket.emit('group_joined', { groupId });
        console.log(`[Socket] User ${user.first_name} joined room ${roomName}`);
      } catch (err) {
        console.error('[Socket Join Group Error]:', err);
      }
    });

    // Event: leave_group
    socket.on('leave_group', ({ groupId }) => {
      if (groupId) {
        socket.leave(`group_${groupId}`);
      }
    });

    // Event: group typing indicator
    socket.on('typing', async ({ groupId, isTyping }) => {
      if (!groupId) return;

      const db = await getDb();
      if (user.is_admin !== 1) {
        const member = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, user.id]);
        if (!member) return;
      }

      socket.to(`group_${groupId}`).emit('user_typing', {
        groupId,
        userId: user.id,
        userName: `${user.first_name} (${user.relationship})`,
        isTyping,
      });
    });

    // Event: direct message typing indicator
    socket.on('dm_typing', ({ recipientId, isTyping }) => {
      if (!recipientId) return;
      io.to(`user_${recipientId}`).emit('dm_user_typing', {
        senderId: user.id,
        senderName: `${user.first_name} (${user.relationship})`,
        isTyping,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${user.first_name} [${socket.id}]`);
      if (onlineUsers.has(user.id)) {
        const userSockets = onlineUsers.get(user.id);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          io.emit('presence_update', {
            userId: user.id,
            status: 'offline',
            onlineUserIds: Array.from(onlineUsers.keys()),
          });
        }
      }
    });
  });
}
