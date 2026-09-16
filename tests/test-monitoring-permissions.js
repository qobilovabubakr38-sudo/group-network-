import { getDb } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from '../server/routes/auth.js';
import usersRouter from '../server/routes/users.js';
import groupsRouter from '../server/routes/groups.js';
import messagesRouter from '../server/routes/messages.js';
import directMessagesRouter from '../server/routes/directMessages.js';
import permissionsRouter from '../server/routes/permissions.js';
import monitoringRouter from '../server/routes/monitoring.js';

const TEST_PORT = 3002;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
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

async function startServer() {
  await seedDatabase();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/admin', usersRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/groups/:groupId/messages', messagesRouter);
  app.use('/api/direct-messages', directMessagesRouter);
  app.use('/api/permissions', permissionsRouter);
  app.use('/api/admin/monitoring', monitoringRouter);

  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on ${BASE_URL}`);
      resolve(server);
    });
  });
}

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function authFetch(token, endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // text response
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 SURVEILLANCE & CROSS-GENDER APPROVALS AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  try {
    await startServer();

    // 1. Log in Super Admin
    const adminLogin = await login('admin', 'Admin@2026');
    assert(adminLogin.status === 200, 'Super Admin logged in successfully');
    const adminToken = adminLogin.data.token;

    // 2. Log in Classmates (Jasur - male, Nigora - female)
    const jasurLogin = await login('jasur_sinfdosh', 'Family@2026');
    assert(jasurLogin.status === 200, 'Jasur (male classmate) logged in');
    const jasurToken = jasurLogin.data.token;
    const jasurId = jasurLogin.data.user.id;

    const nigoraLogin = await login('nigora_sinfdosh', 'Family@2026');
    assert(nigoraLogin.status === 200, 'Nigora (female classmate) logged in');
    const nigoraToken = nigoraLogin.data.token;
    const nigoraId = nigoraLogin.data.user.id;

    // Reset permissions table for this pair so tests are completely idempotent
    const db = await getDb();
    await db.run('DELETE FROM chat_permissions WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)', [jasurId, nigoraId, nigoraId, jasurId]);

    // 3. TEST 1: Cross-Gender Direct Message without Admin Approval -> Must be blocked!
    console.log('\n--- TEST 1: Cross-Gender Protection (Male to Female Without Approval) ---');
    const sendWithoutPerm = await authFetch(jasurToken, `/direct-messages/${nigoraId}`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Salom Nigora, vazifani qildingmi?' }),
    });
    assert(sendWithoutPerm.status === 403, 'Server returns 403 Forbidden for cross-gender message without approval');
    assert(sendWithoutPerm.data.reason === 'REQUIRES_APPROVAL', 'Server indicates reason: REQUIRES_APPROVAL');

    // 4. TEST 2: Request Chat Permission
    console.log('\n--- TEST 2: Request Chat Permission from Admin ---');
    const reqPerm = await authFetch(jasurToken, `/permissions/request/${nigoraId}`, {
      method: 'POST',
    });
    assert(reqPerm.status === 200, 'Permission request submitted successfully');
    assert(reqPerm.data.status === 'pending', 'Status is pending approval');

    // Check status via endpoint
    const statusCheck = await authFetch(jasurToken, `/permissions/status/${nigoraId}`);
    assert(statusCheck.data.permission.status === 'pending', 'Status endpoint returns pending');
    assert(statusCheck.data.permission.allowed === false, 'Permission is not allowed while pending');

    // 5. TEST 3: Super Admin reviews and approves permission
    console.log('\n--- TEST 3: Super Admin Approves Permission Request ---');
    const adminList = await authFetch(adminToken, '/permissions/admin/list');
    assert(adminList.status === 200, 'Super Admin fetched permissions list');
    const pendingItem = adminList.data.permissions.find(
      (p) => (p.user1_id === Math.min(jasurId, nigoraId) && p.user2_id === Math.max(jasurId, nigoraId))
    );
    assert(!!pendingItem, 'Pending permission request is visible in Super Admin queue');
    assert(pendingItem.status === 'pending', 'Item status is pending');

    const approveRes = await authFetch(adminToken, `/permissions/admin/${pendingItem.id}/approve`, {
      method: 'POST',
    });
    assert(approveRes.status === 200, 'Super Admin successfully approved permission');

    // 6. TEST 4: Now Cross-Gender Chat is unlocked!
    console.log('\n--- TEST 4: Direct Message Sent Successfully After Approval ---');
    const sendAfterApproval = await authFetch(jasurToken, `/direct-messages/${nigoraId}`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Salom Nigora! Admin ruxsat berdi, endi gaplasha olamiz.' }),
    });
    assert(sendAfterApproval.status === 201, 'Message delivered with 201 Created');
    assert(sendAfterApproval.data.message.content.includes('Admin ruxsat berdi'), 'Message content saved correctly');

    // Nigora responds back
    const nigoraReply = await authFetch(nigoraToken, `/direct-messages/${jasurId}`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Salom Jasur, ha rahmat! Men ham yozolayapman.' }),
    });
    assert(nigoraReply.status === 201, 'Female user can reply back with 201 Created');

    // 7. TEST 5: Super Admin Live Surveillance Center Sees Everything!
    console.log('\n--- TEST 5: Super Admin Surveillance Center Inspection ---');
    const monitorStats = await authFetch(adminToken, '/admin/monitoring/stats');
    assert(monitorStats.status === 200, 'Surveillance stats retrieved');
    assert(monitorStats.data.directMessages >= 2, 'Surveillance tracks direct messages count');

    const monitorMessages = await authFetch(adminToken, '/admin/monitoring/messages');
    assert(monitorMessages.status === 200, 'Surveillance messages feed retrieved');
    const foundJasurMsg = monitorMessages.data.messages.find(
      (m) => m.content && m.content.includes('Admin ruxsat berdi')
    );
    assert(!!foundJasurMsg, 'Super Admin can inspect private 1-on-1 message in surveillance feed');
    assert(foundJasurMsg.channel === 'direct', 'Message channel identified as direct');
    assert(foundJasurMsg.sender.first_name === 'Jasur', 'Sender correctly identified as Jasur');
    assert(foundJasurMsg.recipient.first_name === 'Nigora', 'Recipient correctly identified as Nigora');

    // 8. TEST 6: Super Admin Instantly Blocks Chat Pair
    console.log('\n--- TEST 6: Instant Admin Revocation / Chat Blocking ---');
    const blockRes = await authFetch(adminToken, `/permissions/admin/${pendingItem.id}/block`, {
      method: 'POST',
    });
    assert(blockRes.status === 200, 'Super Admin blocked the chat pair');

    const sendAfterBlock = await authFetch(jasurToken, `/direct-messages/${nigoraId}`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hali ham gaplashayapmizmi?' }),
    });
    assert(sendAfterBlock.status === 403, 'Message immediately blocked with 403 Forbidden');
    assert(sendAfterBlock.data.reason === 'BLOCKED', 'Rejection reason is BLOCKED');

    // 9. TEST 7: Group Isolation with Classmates vs Relatives
    console.log('\n--- TEST 7: Isolation between Classmates and Family Relatives ---');
    const sobirAmakiLogin = await login('sobir_amaki', 'Family@2026');
    const sobirToken = sobirAmakiLogin.data.token;
    const sobirId = sobirAmakiLogin.data.user.id;

    // Sobir amaki is in Dadam taraf. Jasur is in Sinfdoshlar.
    // Jasur cannot DM Sobir amaki (no shared group)!
    const jasurToSobir = await authFetch(jasurToken, `/direct-messages/${sobirId}`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Salom amaki' }),
    });
    assert(jasurToSobir.status === 403, 'Classmate CANNOT direct message a family relative (No common group)');
    assert(jasurToSobir.data.reason === 'NO_COMMON_GROUP', 'Isolation confirmed: NO_COMMON_GROUP');

    // 10. TEST 8: Regular User CANNOT access Admin Surveillance Center
    console.log('\n--- TEST 8: Regular Users Blocked from Surveillance Center ---');
    const userSpyAttempt = await authFetch(jasurToken, '/admin/monitoring/messages');
    assert(userSpyAttempt.status === 403, 'Regular relative/classmate blocked from /api/admin/monitoring/messages');

    const userPermAttempt = await authFetch(jasurToken, '/permissions/admin/list');
    assert(userPermAttempt.status === 403, 'Regular user blocked from /api/permissions/admin/list');

    console.log('\n================================================================');
    console.log(`🎉 ALL TESTS PASSED! (${passedTests} passed, ${failedTests} failed)`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Test Suite encountered an error:', err.message);
  } finally {
    if (server) {
      server.close();
      console.log('[Test Server] Closed.');
    }
  }
}

runTests();
