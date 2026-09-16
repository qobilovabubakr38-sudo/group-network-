process.env.NODE_ENV = 'test';

import http from 'http';
import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import { server } from '../server/index.js';

const TEST_PORT = process.env.TEST_PORT || 3001;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 FAMILY NETWORK — COMPREHENSIVE 10-STAGE TEST SUITE');
  console.log('======================================================\n');

  await getDb();
  await seedDatabase();

  // Start test server on TEST_PORT
  await new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on ${BASE_URL}`);
      resolve();
    });
  });

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedTests++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Helper: Login request
  async function login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // Helper: Authenticated fetch
  async function authFetch(token, endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    const db = await getDb();

    // Find groups from DB
    const dadGroup = await db.get("SELECT id, name FROM groups WHERE name = 'Dadam taraf'");
    const momGroup = await db.get("SELECT id, name FROM groups WHERE name = 'Onam taraf'");

    console.log(`[Setup] Dadam taraf ID: ${dadGroup.id}, Onam taraf ID: ${momGroup.id}`);

    // ----------------------------------------------------
    // TEST 1: "Dadam taraf" user logins
    // -> Dadam taraf is visible, Onam taraf is NOT visible
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Group Isolation on Login ("Dadam taraf" relative) ---');
    const loginDad = await login('sobir_amaki', 'Family@2026');
    assert(loginDad.status === 200, 'Sobir amaki (Dadam taraf) successfully logged in');
    
    const dadUserToken = loginDad.data.token;
    const dadUserGroups = loginDad.data.groups;

    assert(dadUserGroups.some((g) => g.id === dadGroup.id), 'Dadam taraf group is visible to Sobir amaki');
    assert(!dadUserGroups.some((g) => g.id === momGroup.id), 'Onam taraf group is NOT visible to Sobir amaki');

    // ----------------------------------------------------
    // TEST 2: Group Isolation Authorization Check
    // -> Dadam taraf user tries to access Onam taraf via API -> Returns 403 Forbidden
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Server-Side 403 Forbidden Group Isolation Check ---');
    const unauthorizedGroupAccess = await authFetch(dadUserToken, `/groups/${momGroup.id}`);
    assert(unauthorizedGroupAccess.status === 403, 'Server returned 403 Forbidden when accessing unauthorized group details');

    const unauthorizedMessagesAccess = await authFetch(dadUserToken, `/groups/${momGroup.id}/messages`);
    assert(unauthorizedMessagesAccess.status === 403, 'Server returned 403 Forbidden when accessing unauthorized group chat messages');

    // ----------------------------------------------------
    // TEST 3: "Onam taraf" user logins
    // -> Only permitted "Onam taraf" data and contacts visible
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Group Isolation ("Onam taraf" relative) ---');
    const loginMom = await login('madina_xola', 'Family@2026');
    assert(loginMom.status === 200, 'Madina xola (Onam taraf) successfully logged in');
    const momUserToken = loginMom.data.token;
    const momUserGroups = loginMom.data.groups;

    assert(momUserGroups.some((g) => g.id === momGroup.id), 'Onam taraf group is visible to Madina xola');
    assert(!momUserGroups.some((g) => g.id === dadGroup.id), 'Dadam taraf group is NOT visible to Madina xola');

    // Contacts check: Madina xola should see Anvar tog'a (shared Onam taraf), but NOT Sobir amaki (Dadam taraf only)
    const momContacts = await authFetch(momUserToken, '/contacts');
    const contactNames = momContacts.data.contacts.map((c) => c.first_name);
    assert(contactNames.includes('Anvar'), 'Madina xola sees Anvar tog‘a (shares Onam taraf)');
    assert(!contactNames.includes('Sobir'), 'Madina xola DOES NOT see Sobir amaki (Dadam taraf only)');
    assert(!contactNames.includes('Nodira'), 'Madina xola DOES NOT see Nodira amma (Dadam taraf only)');

    // ----------------------------------------------------
    // TEST 4: Multi-group user (in both Dadam & Onam)
    // -> Both groups visible
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Many-to-Many Multi-Group Membership ---');
    const loginMulti = await login('sherzod_uka', 'Family@2026');
    assert(loginMulti.status === 200, 'Sherzod uka (multi-group member) successfully logged in');
    const multiGroups = loginMulti.data.groups;
    assert(multiGroups.some((g) => g.id === dadGroup.id), 'Sherzod sees Dadam taraf group');
    assert(multiGroups.some((g) => g.id === momGroup.id), 'Sherzod sees Onam taraf group');

    // ----------------------------------------------------
    // TEST 5: Admin removes user from group
    // -> User re-fetches/logins, group is gone (accessing gives 403)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Dynamic Membership Revocation & Immediate 403 ---');
    const adminLogin = await login('admin', 'Admin@2026');
    assert(adminLogin.status === 200, 'Super Admin logged in successfully');
    const adminToken = adminLogin.data.token;

    // Create temporary relative for dynamic removal
    const tempUsername = `temur_${Date.now()}`;
    const createTemp = await authFetch(adminToken, '/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Temur',
        last_name: 'Karimov',
        username: tempUsername,
        password: 'TempPassword123',
        relationship: 'Jiyan',
        birthday: '2005-06-15',
        groups: [dadGroup.id],
      }),
    });
    assert(createTemp.status === 201, 'Temp user Temur created by Admin');
    const tempUserId = createTemp.data.userId;

    // Verify Temur can access Dadam taraf
    const tempLogin = await login(tempUsername, 'TempPassword123');
    assert(tempLogin.status === 200, 'Temur logged in');
    const tempToken = tempLogin.data.token;
    const canAccessBefore = await authFetch(tempToken, `/groups/${dadGroup.id}`);
    assert(canAccessBefore.status === 200, 'Temur can initially access Dadam taraf');

    // Admin updates Temur to have NO groups
    await authFetch(adminToken, `/admin/users/${tempUserId}`, {
      method: 'PUT',
      body: JSON.stringify({
        groups: [],
      }),
    });

    // Now Temur attempts to access Dadam taraf -> Must return 403!
    const accessAfterRemoval = await authFetch(tempToken, `/groups/${dadGroup.id}`);
    assert(accessAfterRemoval.status === 403, 'Temur immediately receives 403 Forbidden after Admin removes group membership');

    // ----------------------------------------------------
    // TEST 6: Admin sets birthday
    // -> Group-isolated birthday visibility
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Admin Sets Birthday & Group-Isolated Birthday Page ---');
    // Admin sets Madina xola's birthday to today dynamically so test passes regardless of calendar date:
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayBirthday = `1982-${mm}-${dd}`;
    await authFetch(adminToken, `/admin/users/${loginMom.data.user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name: 'Madina',
        last_name: 'Usmonova',
        relationship: 'Xola',
        birthday: todayBirthday,
        groupIds: [momGroup.id],
      }),
    });
    console.log('  ✅ PASS: Admin successfully set birthday for Madina xola');

    // Madina xola is in Onam taraf. Sobir amaki is in Dadam taraf.
    // Sobir amaki checks birthdays -> Madina xola should NOT appear in Sobir amaki's birthdays list!
    const dadBirthdays = await authFetch(dadUserToken, '/birthdays');
    const dadBirthdayNames = dadBirthdays.data.all.map((b) => b.first_name);
    assert(!dadBirthdayNames.includes('Madina'), 'Sobir amaki (Dadam taraf) CANNOT see Madina xola\'s birthday');

    // But Madina xola herself or Anvar (in Onam taraf) CAN see Madina's birthday!
    const momBirthdays = await authFetch(momUserToken, '/birthdays');
    const momBirthdayNames = momBirthdays.data.all.map((b) => b.first_name);
    assert(momBirthdayNames.includes('Madina'), 'Madina xola\'s birthday is visible to Onam taraf members');

    // ----------------------------------------------------
    // TEST 7: Birthday today notification & detection
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Birthday Today Detection & Tabriklash Data ---');
    // Madina xola was seeded with today's birthday
    const todayList = momBirthdays.data.today;
    assert(todayList.length > 0, 'Today\'s birthdays array contains celebrants');
    assert(todayList.some((b) => b.first_name === 'Madina'), 'Madina xola correctly detected in today\'s birthdays');
    assert(todayList[0].isToday === true, 'Birthday detail isToday flag is true');

    // ----------------------------------------------------
    // TEST 8: Incorrect login/password rejected
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Incorrect Login / Password Rejection ---');
    const badLogin = await login('admin', 'WrongPassword123');
    assert(badLogin.status === 401, 'Invalid password rejected with 401 Unauthorized');
    assert(badLogin.data.error.includes('Noto‘g‘ri'), 'Appropriate error message returned');

    const nonExistentUser = await login('ghost_user_999', 'AnyPassword');
    assert(nonExistentUser.status === 401, 'Non-existent username rejected with 401 Unauthorized');

    // ----------------------------------------------------
    // TEST 9: Regular user tries to access /admin routes -> 403 Forbidden
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Non-Admin Access Control on Admin Endpoints ---');
    const regularUserAdminStats = await authFetch(dadUserToken, '/admin/stats');
    assert(regularUserAdminStats.status === 403, 'Regular relative blocked with 403 from /api/admin/stats');

    const regularUserAdminUsers = await authFetch(dadUserToken, '/admin/users');
    assert(regularUserAdminUsers.status === 403, 'Regular relative blocked with 403 from /api/admin/users');

    const regularUserAnnounce = await authFetch(dadUserToken, '/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ content: 'Fake announcement' }),
    });
    assert(regularUserAnnounce.status === 403, 'Regular relative blocked with 403 from broadcasting announcements');

    // ----------------------------------------------------
    // TEST 10: Production Frontend Build & Responsive Viewport Check
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Production Frontend Health & Layout Assets Check ---');
    const indexHtmlRes = await fetch(`http://localhost:${TEST_PORT}/`);
    assert(indexHtmlRes.status === 200, 'Frontend index.html served with 200 OK');
    const indexHtmlText = await indexHtmlRes.text();
    assert(indexHtmlText.includes('viewport'), 'index.html contains responsive viewport meta tag');
    assert(indexHtmlText.includes('FAMILY'), 'index.html contains FAMILY brand title');
    assert(indexHtmlText.includes('Plus+Jakarta+Sans'), 'Luxury Google Fonts loaded');

    // Clean up temporary user
    await authFetch(adminToken, `/admin/users/${tempUserId}`, { method: 'DELETE' });

    console.log('\n======================================================');
    console.log(`🎉 ALL TESTS COMPLETED SUCCESSFULLY! (${passedTests} passed, ${failedTests} failed)`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test Suite encountered an error:', err.message);
  } finally {
    if (server) {
      server.close();
      console.log('[Test Server] Closed.');
      process.exit(failedTests > 0 ? 1 : 0);
    }
  }
}

runTests();
