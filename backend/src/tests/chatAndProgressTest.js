/**
 * Automated test for Task Progress calculation and AI Chatbot with Task Inquiry
 */
const http = require('http');
const app = require('../server');

const TEST_PORT = 5004;

function request(pathUrl, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: pathUrl,
      method: options.method || 'GET',
      headers
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  const server = app.listen(TEST_PORT, async () => {
    console.log(`\n🧪 [Chat & Task Progress Test] Running on ${TEST_PORT}\n`);

    try {
      // 1. Register test patient
      const uniqueSuffix = Date.now();
      const testUser = {
        username: `dashboard_pt_${uniqueSuffix}`,
        email: `dashboard_pt_${uniqueSuffix}@example.com`,
        password: 'CareBridgePass123!',
        full_name: 'Sarah Connor'
      };

      console.log('1️⃣ Registering Patient...');
      const regRes = await request('/api/auth/register', { method: 'POST' }, testUser);
      if (regRes.status !== 201) throw new Error('Registration failed');
      const token = regRes.body.token;
      console.log(`   Patient registered: ${regRes.body.user.fullName}`);

      // 2. Create 3 care tasks
      console.log('\n2️⃣ Creating Patient Care Tasks...');
      const t1 = await request('/api/reminders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, { title: 'Take Metoprolol 25mg', description: 'Take with morning breakfast', category: 'medication' });

      const t2 = await request('/api/reminders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, { title: 'Post-Surgery Ankle Pumps', description: '10 repetitions in bed', category: 'exercise' });

      const t3 = await request('/api/reminders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, { title: 'Drink 500ml Water', description: 'Hydration goal', category: 'diet' });

      if (t1.status !== 201 || t2.status !== 201 || t3.status !== 201) {
        throw new Error('Failed to create test tasks');
      }

      // 3. Check Initial Progress (should be 0%)
      console.log('\n3️⃣ Checking Initial Progress Calculation...');
      const p1 = await request('/api/reminders', { headers: { 'Authorization': `Bearer ${token}` } });
      console.log(`   Total: ${p1.body.progress.total}, Completed: ${p1.body.progress.completed}, Pending: ${p1.body.progress.pending}, Percentage: ${p1.body.progress.percentage}%`);
      if (p1.body.progress.percentage !== 0 || p1.body.progress.total !== 3) {
        throw new Error('Initial progress calculation mismatch');
      }

      // 4. Toggle 2 tasks to Completed
      console.log('\n4️⃣ Toggling 2 Tasks to Completed...');
      const toggle1 = await request(`/api/reminders/${t1.body.reminder.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const toggle2 = await request(`/api/reminders/${t2.body.reminder.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`   Updated Progress: ${toggle2.body.progress.completed} of ${toggle2.body.progress.total} (${toggle2.body.progress.percentage}%)`);
      if (toggle2.body.progress.completed !== 2 || toggle2.body.progress.percentage !== 67) {
        throw new Error('Progress after toggle calculation mismatch');
      }

      // 5. Test AI Chatbot with General Question
      console.log('\n5️⃣ Testing AI Care Assistant Bot (General Clinical Question)...');
      const chat1 = await request('/api/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        message: 'When should I call the doctor if I get a fever?'
      });

      console.log(`   Status: ${chat1.status}`);
      console.log(`   AI Reply Preview: "${chat1.body.reply.substring(0, 100)}..."`);
      if (chat1.status !== 200 || !chat1.body.reply) {
        throw new Error('Chat general question failed');
      }

      // 6. Test AI Chatbot with Specific Selected Task Context
      console.log('\n6️⃣ Testing AI Care Assistant Bot with Selected Task Context...');
      const chat2 = await request('/api/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        message: 'Can I take this medication on an empty stomach or do I need food?',
        task_context: 'Take Metoprolol 25mg: Take with morning breakfast'
      });

      console.log(`   Status: ${chat2.status}`);
      console.log(`   Task Context: "${chat2.body.task_context}"`);
      console.log(`   AI Reply Preview: "${chat2.body.reply.substring(0, 100)}..."`);
      if (chat2.status !== 200 || !chat2.body.task_context) {
        throw new Error('Chat with task context failed');
      }

      // 7. Test Chat History
      console.log('\n7️⃣ Testing GET /api/chat/history...');
      const hist = await request('/api/chat/history', { headers: { 'Authorization': `Bearer ${token}` } });
      console.log(`   Chat History Count: ${hist.body.messages.length}`);
      if (hist.body.messages.length < 4) { // 2 user messages + 2 assistant replies
        throw new Error('Chat history count mismatch');
      }

      console.log('\n✅ ALL TASK PROGRESS & AI ASSISTANT CHATBOT TESTS PASSED!\n');

    } catch (err) {
      console.error('❌ Test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => process.exit(process.exitCode || 0));
    }
  });
}

runTests();
