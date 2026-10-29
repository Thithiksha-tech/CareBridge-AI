/**
 * Multipart File Upload Test for CareBridge
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server');

const TEST_PORT = 5003;

async function runUploadTest() {
  const server = app.listen(TEST_PORT, async () => {
    console.log(`\n🧪 [Upload Test] Server running on ${TEST_PORT}\n`);

    try {
      // 1. Create unique user
      const uniqueSuffix = Date.now();
      const authPayload = JSON.stringify({
        username: `uploader_${uniqueSuffix}`,
        email: `uploader_${uniqueSuffix}@example.com`,
        password: 'CareBridgeFilePass123!'
      });

      const token = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: TEST_PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(authPayload)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const parsed = JSON.parse(data);
            resolve(parsed.token);
          });
        });
        req.on('error', reject);
        req.write(authPayload);
        req.end();
      });

      console.log('1️⃣ Patient Registered. Token acquired.');

      // 2. Prepare sample discharge file
      const sampleFilePath = path.join(__dirname, 'test_discharge.txt');
      fs.writeFileSync(sampleFilePath, `
DISCHARGE INSTRUCTIONS:
Diagnosis: Post-Operative Knee Arthroplasty
Medications:
1. Acetaminophen 650 mg PO q6h PRN pain
2. Enoxaparin 40 mg SC daily for DVT prophylaxis x 14 days
Diet: Low salt, encourage water 2L daily.
Activity: Ambulate with walker. No high impact sports. Ice knee 20 mins tid.
Follow-up: Orthopedic clinic in 10 days. Call 555-0199.
Warning Signs: Severe calf pain, fever > 101F, or bleeding from incision.
      `);

      // 3. Build multipart/form-data payload
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const fileData = fs.readFileSync(sampleFilePath);

      let body = '';
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="test_discharge.txt"\r\n`;
      body += `Content-Type: text/plain\r\n\r\n`;

      const payload = Buffer.concat([
        Buffer.from(body, 'utf-8'),
        fileData,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
      ]);

      console.log('2️⃣ Uploading sample discharge document to POST /api/discharge/upload...');

      const uploadResult = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: TEST_PORT,
          path: '/api/discharge/upload',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': payload.length
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      console.log(`   Status: ${uploadResult.status}`);
      console.log(`   Discharge ID: ${uploadResult.body.discharge_id}`);
      console.log(`   Filename: ${uploadResult.body.original_filename}`);
      console.log(`   Medications Extracted: ${uploadResult.body.data.medications.length}`);
      console.log(`   Pending Reviews: ${uploadResult.body.review_summary.pending_review}`);

      if (uploadResult.status !== 201) throw new Error('File upload failed');

      // Cleanup
      if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);

      console.log('\n✅ FILE UPLOAD & AI PARSING TEST PASSED!\n');
    } catch (err) {
      console.error('❌ Upload test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => process.exit(process.exitCode || 0));
    }
  });
}

runUploadTest();
