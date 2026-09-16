import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

export async function seedDatabase() {
  const db = await getDb();

  // Check if any admin exists
  const existingAdmin = await db.get('SELECT id FROM users WHERE is_admin = 1');
  if (existingAdmin) {
    // Ensure gender is updated for existing initial users
    await db.run("UPDATE users SET gender = 'male' WHERE username IN ('admin', 'sobir_amaki', 'anvar_toga', 'sherzod_uka')");
    await db.run("UPDATE users SET gender = 'female' WHERE username IN ('nodira_amma', 'madina_xola')");

    // Check if Sinfdoshlar group exists
    let classGroup = await db.get("SELECT id FROM groups WHERE category = 'classmates' OR name = 'Sinfdoshlar'");
    if (!classGroup) {
      console.log('[Seed] Seeding Sinfdoshlar group and classmates...');
      const adminId = existingAdmin.id;

      const cgResult = await db.run(`
        INSERT INTO groups (name, description, category, created_by)
        VALUES (?, ?, ?, ?)
      `, ['Sinfdoshlar', 'Maktabdagi qadrdon sinfdoshlar davrasi', 'classmates', adminId]);

      const classGroupId = cgResult.lastID;
      const salt = await bcrypt.genSalt(10);
      const userPass = await bcrypt.hash('Family@2026', salt);

      const jasur = await db.run(`
        INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
      `, ['Jasur', 'Mirzayev', 'jasur_sinfdosh', userPass, 'Sinfdosh', 'male', '1995-04-12', '/avatars/male1.png']);

      const nigora = await db.run(`
        INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
      `, ['Nigora', 'Aliyeva', 'nigora_sinfdosh', userPass, 'Sinfdosh', 'female', '1995-07-22', '/avatars/female1.png']);

      const farhod = await db.run(`
        INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
      `, ['Farhod', 'Karimov', 'farhod_sinfdosh', userPass, 'Partadosh', 'male', '1995-11-05', '/avatars/male2.png']);

      const nilufar = await db.run(`
        INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')
      `, ['Nilufar', 'Qosimova', 'nilufar_sinfdosh', userPass, 'Sinfdosh', 'female', '1995-09-18', '/avatars/female2.png']);

      await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [classGroupId, jasur.lastID]);
      await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [classGroupId, nigora.lastID]);
      await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [classGroupId, farhod.lastID]);
      await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [classGroupId, nilufar.lastID]);

      await db.run(`
        INSERT INTO messages (group_id, sender_id, content, message_type)
        VALUES (?, ?, ?, 'text')
      `, [classGroupId, jasur.lastID, 'Salom sinfdoshlar! Barchani ko‘rganimdan xursandman!']);
      console.log('[Seed] Sinfdoshlar group & members created.');
    }

    console.log('[Seed] Super Admin already exists.');
    return;
  }

  console.log('[Seed] Seeding initial Super Admin and family data...');

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@2026', salt);
  const userPasswordHash = await bcrypt.hash('Family@2026', salt);

  // Today's date formatted as YYYY-MM-DD
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayBirthday = `1982-${currentMonth}-${currentDay}`;

  // Tomorrow's date
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowBirthday = `1975-${tomorrowMonth}-${tomorrowDay}`;

  // 1. Create Super Admin
  const adminResult = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, gender, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, 'male', ?, ?, 1, 'active')
  `, ['Azizbek', 'Rahimov', 'admin', adminPasswordHash, 'Oila Boshlig‘i (Super Admin)', '1990-01-01', '/avatars/admin.png']);

  const adminId = adminResult.lastID;

  // 2. Create Initial Groups
  const dadGroup = await db.run(`
    INSERT INTO groups (name, description, created_by)
    VALUES (?, ?, ?)
  `, ['Dadam taraf', 'Dadam tomondagi barcha aziz qarindoshlar', adminId]);

  const momGroup = await db.run(`
    INSERT INTO groups (name, description, created_by)
    VALUES (?, ?, ?)
  `, ['Onam taraf', 'Onam tomondagi barcha suyukli qarindoshlar', adminId]);

  const dadGroupId = dadGroup.lastID;
  const momGroupId = momGroup.lastID;

  // 3. Create Sample Relatives
  // Dadam taraf relatives:
  const sobir = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
  `, ['Sobir', 'Rahimov', 'sobir_amaki', userPasswordHash, 'Amaki', '1968-08-15', '/avatars/male1.png']);

  const nodira = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
  `, ['Nodira', 'Rahimova', 'nodira_amma', userPasswordHash, 'Amma', '1972-11-20', '/avatars/female1.png']);

  // Onam taraf relatives:
  const madina = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
  `, ['Madina', 'Karimova', 'madina_xola', userPasswordHash, 'Xola', todayBirthday, '/avatars/female2.png']);

  const anvar = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
  `, ['Anvar', 'Karimov', 'anvar_toga', userPasswordHash, 'Tog‘a', tomorrowBirthday, '/avatars/male2.png']);

  // Multi-group relative (in both groups):
  const sherzod = await db.run(`
    INSERT INTO users (first_name, last_name, username, password_hash, relationship, birthday, avatar, is_admin, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')
  `, ['Sherzod', 'Rahimov', 'sherzod_uka', userPasswordHash, 'Uka', '2000-05-10', '/avatars/male3.png']);

  // Assign memberships
  // Dadam taraf: Sobir (Amaki), Nodira (Amma), Sherzod (Uka)
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [dadGroupId, sobir.lastID]);
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [dadGroupId, nodira.lastID]);
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [dadGroupId, sherzod.lastID]);

  // Onam taraf: Madina (Xola), Anvar (Tog'a), Sherzod (Uka)
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [momGroupId, madina.lastID]);
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [momGroupId, anvar.lastID]);
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [momGroupId, sherzod.lastID]);

  // Seed sample initial messages in Dadam taraf
  const m1 = await db.run(`
    INSERT INTO messages (group_id, sender_id, content, message_type)
    VALUES (?, ?, ?, 'text')
  `, [dadGroupId, sobir.lastID, 'Assalomu alaykum qadrdonlar! Oilaviy platformamiz muborak bo‘lsin!']);

  await db.run(`
    INSERT INTO message_reactions (message_id, user_id, reaction)
    VALUES (?, ?, '❤️')
  `, [m1.lastID, nodira.lastID]);

  // Seed sample initial messages in Onam taraf
  await db.run(`
    INSERT INTO messages (group_id, sender_id, content, message_type)
    VALUES (?, ?, ?, 'text')
  `, [momGroupId, madina.lastID, 'Assalomu alaykum hammaga! Qanday ajoyib yangilik!']);

  // Audit log
  await db.run(`
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
    VALUES (?, 'INITIAL_SEED', 'SYSTEM', 0, 'Dastlabki Super Admin, guruhlar va qarindoshlar yaratildi')
  `, [adminId]);

  console.log('[Seed] Database successfully seeded with initial test data.');
  console.log('--- ADMIN CREDENTIALS ---');
  console.log('Username: admin');
  console.log('Password: Admin@2026');
  console.log('-------------------------');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
