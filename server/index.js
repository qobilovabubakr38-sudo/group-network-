import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';

import { getDb } from './db.js';
import { seedDatabase } from './seed.js';
import { initChatSocket } from './sockets/chatSocket.js';
import { startTelegramBot } from './bot.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import groupsRouter from './routes/groups.js';
import messagesRouter from './routes/messages.js';
import mediaRouter from './routes/media.js';
import birthdaysRouter from './routes/birthdays.js';
import contactsRouter from './routes/contacts.js';
import announcementsRouter from './routes/announcements.js';
import auditRouter from './routes/audit.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';
import directMessagesRouter from './routes/directMessages.js';
import permissionsRouter from './routes/permissions.js';
import monitoringRouter from './routes/monitoring.js';
import { apiLimiter } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB
});

// Attach io to express app so routes can broadcast events
app.set('io', io);
initChatSocket(io);

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows media streaming & local blob urls
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads folder
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Static public/avatars folder
const avatarsDir = path.join(__dirname, '../public/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use('/avatars', express.static(avatarsDir));

// API Routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/admin', usersRouter);
app.use('/api/admin/announcements', announcementsRouter);
app.use('/api/admin/audit-logs', auditRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/groups/:groupId/messages', messagesRouter);
app.use('/api/upload', mediaRouter);
app.use('/api/birthdays', birthdaysRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/direct-messages', directMessagesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/admin/monitoring', monitoringRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'GROUP — Private Network' });
});

// Serve frontend dist in production or when built
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/avatars')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Server ichki xatoligi yuz berdi.',
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await getDb();
    console.log('[DB] SQLite database connected & schema initialized.');
    
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`✨ GROUP — Premium Private Network Platform`);
      console.log(`🚀 Server running on: http://localhost:${PORT}`);
      console.log(`🔒 Group Isolation & Server-side Authorization: ACTIVE`);
      console.log(`======================================================\n`);
    });

    startTelegramBot(io);
  } catch (err) {
    console.error('[Startup Error]:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1] && (process.argv[1].endsWith('server/index.js') || process.argv[1].endsWith('server\\index.js'));
if (isMain && process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server, startServer };
