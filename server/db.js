import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_FILE || path.join(dbDir, 'family_network.sqlite');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');
  await dbInstance.run('PRAGMA journal_mode = WAL;');

  await initSchema(dbInstance);

  return dbInstance;
}

async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      relationship TEXT NOT NULL,
      gender TEXT DEFAULT 'male',
      birthday TEXT,
      avatar TEXT,
      is_admin INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      token_version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'family',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, reaction)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      duration REAL DEFAULT 0,
      storage_type TEXT DEFAULT 'local',
      cloud_file_id TEXT
    );

    CREATE TABLE IF NOT EXISTS direct_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      reply_to INTEGER REFERENCES direct_messages(id) ON DELETE SET NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS direct_message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, reaction)
    );

    CREATE TABLE IF NOT EXISTS direct_message_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direct_message_id INTEGER NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      duration REAL DEFAULT 0,
      storage_type TEXT DEFAULT 'local',
      cloud_file_id TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_direct_messages_participants ON direct_messages(sender_id, recipient_id);
    CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, read);
    CREATE INDEX IF NOT EXISTS idx_chat_permissions_users ON chat_permissions(user1_id, user2_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  `);

  // Safe schema migrations for existing database files:
  try {
    const userColumns = await db.all("PRAGMA table_info(users);");
    if (!userColumns.some((col) => col.name === 'token_version')) {
      await db.run("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1;");
    }
    if (!userColumns.some((col) => col.name === 'gender')) {
      await db.run("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'male';");
    }
  } catch (e) {
    // Column already exists or table freshly created
  }

  try {
    const groupColumns = await db.all("PRAGMA table_info(groups);");
    if (!groupColumns.some((col) => col.name === 'category')) {
      await db.run("ALTER TABLE groups ADD COLUMN category TEXT DEFAULT 'family';");
    }
  } catch (e) {
    // Column already exists or table freshly created
  }

  try {
    const attColumns = await db.all("PRAGMA table_info(attachments);");
    if (!attColumns.some((col) => col.name === 'storage_type')) {
      await db.run("ALTER TABLE attachments ADD COLUMN storage_type TEXT DEFAULT 'local';");
    }
    if (!attColumns.some((col) => col.name === 'cloud_file_id')) {
      await db.run("ALTER TABLE attachments ADD COLUMN cloud_file_id TEXT;");
    }
  } catch (e) {
    // Column already exists or table freshly created
  }
}

export default { getDb };
