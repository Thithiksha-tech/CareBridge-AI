/**
 * Automated Verification Script for CareBridge Auth & Email Bridge
 */
const http = require('http');
const app = require('../server');

let server;
const TEST_PORT = 5001;

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(TEST_PORT, async () => {
    console.log(`\n🧪 [Test Suite] Test server running on port ${TEST_PORT}\n`);

    try {
      // 1. Health check
      console.log('1️⃣ Testing GET /api/health...');
      const healthRes = await request('/api/health');
      console.log(`   Status: ${healthRes.status}, Service: ${healthRes.body.service}`);
      if (healthRes.status !== 200) throw new Error('Health check failed');

      // Unique test user
      const uniqueSuffix = Date.now();
      const testUser = {
        username: `patient_${uniqueSuffix}`,
        email: `patient_${uniqueSuffix}@example.com`,
        password: 'CareBridgePassword123!',
        full_name: 'John CareBridge Doe'
      };

      // 2. Register
      console.log('\n2️⃣ Testing POST /api/auth/register...');
      const regRes = await request('/api/auth/register', { method: 'POST' }, testUser);
      console.log(`   Status: ${regRes.status}, Message: ${regRes.body.message}`);
      if (regRes.status !== 201 || !regRes.body.token) throw new Error('Registration failed');
      const token = regRes.body.token;

      // 3. Prevent duplicate email / username
      console.log('\n3️⃣ Testing Duplicate Registration Prevention...');
      const dupRes = await request('/api/auth/register', { method: 'POST' }, testUser);
      console.log(`   Status: ${dupRes.status} (Expected 409), Message: ${dupRes.body.message}`);
      if (dupRes.status !== 409) throw new Error('Duplicate check failed');

      // 4. Login with Username
      console.log('\n4️⃣ Testing POST /api/auth/login using Username...');
      const loginUserRes = await request('/api/auth/login', { method: 'POST' }, {
        identifier: testUser.username,
        password: testUser.password
      });
      console.log(`   Status: ${loginUserRes.status}, Patient: ${loginUserRes.body.user.fullName}`);
      if (loginUserRes.status !== 200 || !loginUserRes.body.token) throw new Error('Login by username failed');

      // 5. Login with Email
      console.log('\n5️⃣ Testing POST /api/auth/login using Email (Reminder Bridge)...');
      const loginEmailRes = await request('/api/auth/login', { method: 'POST' }, {
        identifier: testUser.email,
        password: testUser.password
      });
      console.log(`   Status: ${loginEmailRes.status}, Verified Email: ${loginEmailRes.body.user.email}`);
      if (loginEmailRes.status !== 200 || !loginEmailRes.body.token) throw new Error('Login by email failed');

      // 6. Protected /api/auth/me
      console.log('\n6️⃣ Testing Protected GET /api/auth/me with Bearer Token...');
      const meRes = await request('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`   Status: ${meRes.status}, User: ${meRes.body.user.username}, Reminders Enabled: ${meRes.body.user.emailRemindersEnabled}`);
      if (meRes.status !== 200) throw new Error('Get profile failed');

      // 7. Test Reminder Email Trigger
      console.log('\n7️⃣ Testing POST /api/auth/test-email (Email Reminder Bridge)...');
      const emailTestRes = await request('/api/auth/test-email', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        category: 'medication',
        note: 'Take Aspirin 81mg with lunch.'
      });
      console.log(`   Status: ${emailTestRes.status}, Result: ${emailTestRes.body.message}`);
      if (emailTestRes.status !== 200) throw new Error('Email test failed');

      console.log('\n✅ ALL BACKEND AUTH & REMINDER BRIDGE TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
      console.error('\n❌ Test failed:', err.message);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('🏁 Test server stopped.');
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runTests();
