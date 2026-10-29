/**
 * Comprehensive Automated Test Suite for CareBridge Dashboard & AI Extraction
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server');

let server;
const TEST_PORT = 5002;

function request(pathUrl, options = {}, body = null, isMultipart = false, multipartData = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      ...(options.headers || {})
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

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

    if (isMultipart && multipartData) {
      req.write(multipartData);
    } else if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Sample discharge clinical summary
const sampleDischargeNotes = `
PATIENT DISCHARGE SUMMARY
Hospital: St. Jude Medical Center
Patient: Robert Miller | DOB: 05/14/1962 | Attending: Dr. Sarah Vance, MD (Cardiothoracic Surgery)
Discharge Date: October 25, 2026
Admission Diagnosis: Acute Coronary Syndrome s/p Drug-Eluting Stent Placement

DISCHARGE MEDICATIONS:
1. Aspirin 81 mg PO q.d. - Antiplatelet therapy. Take with meals.
2. Clopidogrel (Plavix) 75 mg PO daily - Do not discontinue without consulting cardiologist.
3. Atorvastatin 40 mg PO q.h.s. - Lipid management.
4. Metoprolol Tartrate 25 mg PO b.i.d. - Heart rate and BP control. Hold if systolic BP < 100 or HR < 55.

ACTIVITY & EXERCISE RESTRICTIONS:
- Ambulation ad lib with caregiver assist for first 72 hours.
- Strict lifting restriction: No lifting > 10 lbs for 2 weeks.
- Physical therapy: Perform gentle ankle pumps and 5-10 minute level indoor walks daily.
- No driving until cleared by physician at follow-up.

DIETARY GUIDELINES:
- Low sodium diet (< 2000 mg/day). DASH dietary pattern.
- Fluid intake maintain at 2 liters daily. Avoid excessive caffeine or alcohol.
- Small, frequent nutrient-rich meals.

FOLLOW-UP APPOINTMENTS:
- Dr. Sarah Vance (Cardiology Clinic): Follow-up in 10-14 days. Call 555-0144 to schedule.
- Primary Care Physician: F/U in 30 days for routine lab work and metabolic panel.

RED FLAG WARNING SIGNS:
- Call clinic immediately for: Temperature > 101°F, persistent nausea, progressive swelling (edema) in lower extremities.
- Call 911 / Go to nearest ED for: Recurrent acute chest pressure, dyspnea at rest, syncope, or sudden severe bleeding from catheterization site.
`;

async function runTests() {
  server = app.listen(TEST_PORT, async () => {
    console.log(`\n🧪 [Dashboard & AI Test Suite] Running on port ${TEST_PORT}\n`);

    try {
      const uniqueSuffix = Date.now();
      const testUser = {
        username: `attender_${uniqueSuffix}`,
        email: `caregiver_${uniqueSuffix}@example.com`,
        password: 'CareBridgeSecure99!',
        full_name: 'Emily Miller (Family Caregiver)'
      };

      // 1. Register user
      console.log('1️⃣ Registering Patient & Caregiver...');
      const regRes = await request('/api/auth/register', { method: 'POST' }, testUser);
      if (regRes.status !== 201) throw new Error('Registration failed: ' + JSON.stringify(regRes.body));
      const token = regRes.body.token;
      console.log(`   Registered: ${regRes.body.user.fullName} (${regRes.body.user.email})`);

      // 2. Direct Text AI Processing
      console.log('\n2️⃣ Testing AI Extraction & Simplification (Direct Text Analysis)...');
      const analyzeRes = await request('/api/discharge/analyze-text', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        text: sampleDischargeNotes,
        title: 'Post-Cardiac Stent Discharge Summary'
      });

      console.log(`   Status: ${analyzeRes.status}`);
      if (analyzeRes.status !== 201) throw new Error('Direct text analyze failed: ' + JSON.stringify(analyzeRes.body));

      const dischargeId = analyzeRes.body.discharge_id;
      const data = analyzeRes.body.data;

      console.log(`   Discharge ID Created: ${dischargeId}`);
      console.log(`   Medications Extracted: ${data.medications.length}`);
      console.log(`   Dietary Guidelines: ${data.dietary_guidelines.length}`);
      console.log(`   Exercises / Restrictions: ${data.exercises.length}`);
      console.log(`   Doctor Appointments: ${data.appointments.length}`);
      console.log(`   Red Flag Warnings: ${data.red_flags.length}`);
      console.log(`   Care Roadmap Phases: ${data.care_roadmap.length}`);

      // 3. Verify Original vs. Simplified Pairing
      console.log('\n3️⃣ Verifying Original vs. Simplified Text Pairing...');
      const sampleMed = data.medications[0];
      console.log(`   Medication: ${sampleMed.drug_name}`);
      console.log(`   - Original Medical Text: "${sampleMed.original_text}"`);
      console.log(`   - Simplified Patient Text: "${sampleMed.simplified_text}"`);
      console.log(`   - Initial Review Status: "${sampleMed.review_status}"`);
      if (!sampleMed.original_text || !sampleMed.simplified_text) {
        throw new Error('Missing original or simplified text on medication item');
      }

      const sampleExercise = data.exercises[0];
      console.log(`   Exercise/Restriction:`);
      console.log(`   - Original: "${sampleExercise.original_text}"`);
      console.log(`   - Simplified: "${sampleExercise.simplified_text}"`);

      // 4. Test Single Instruction Review
      console.log('\n4️⃣ Testing User Review on Individual Instruction (confirm with custom note)...');
      const reviewRes = await request(`/api/discharge/${dischargeId}/review`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        instruction_id: sampleMed.id,
        status: 'confirmed',
        user_notes: 'Confirmed by caregiver Emily: Dad takes this with 8 AM breakfast.'
      });

      console.log(`   Status: ${reviewRes.status}`);
      console.log(`   Review Result: ${reviewRes.body.message}`);
      if (reviewRes.status !== 200 || reviewRes.body.review.status !== 'confirmed') {
        throw new Error('Instruction review update failed');
      }

      // 5. Test Bulk Review / Confirm All
      console.log('\n5️⃣ Testing Bulk Instruction Review (Approve/Confirm all remaining instructions)...');
      const bulkRes = await request(`/api/discharge/${dischargeId}/review-bulk`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        action: 'confirm_all'
      });

      console.log(`   Status: ${bulkRes.status}`);
      console.log(`   Review Summary: Total: ${bulkRes.body.review_summary.total_instructions}, Confirmed: ${bulkRes.body.review_summary.confirmed}, Pending: ${bulkRes.body.review_summary.pending_review}`);
      if (bulkRes.body.review_summary.pending_review !== 0) {
        throw new Error('Bulk confirm did not clear pending items');
      }

      // 6. Test Fetching Single Discharge Record
      console.log('\n6️⃣ Testing GET /api/discharge/:id to verify updated review states...');
      const getRecRes = await request(`/api/discharge/${dischargeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`   Status: ${getRecRes.status}, All Reviewed: ${getRecRes.body.review_summary.all_reviewed}`);
      if (getRecRes.status !== 200) throw new Error('Get discharge record failed');

      // 7. Test Synchronizing Confirmed Instructions to Active Reminders
      console.log('\n7️⃣ Testing POST /api/discharge/:id/sync-reminders...');
      const syncRes = await request(`/api/discharge/${dischargeId}/sync-reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`   Status: ${syncRes.status}, Synced Count: ${syncRes.body.synced_count}`);
      if (syncRes.status !== 200 || syncRes.body.synced_count <= 0) {
        throw new Error('Sync reminders failed');
      }

      // 8. Test Listing Patient Reminders
      console.log('\n8️⃣ Testing GET /api/reminders...');
      const remListRes = await request('/api/reminders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`   Status: ${remListRes.status}, Total Active Reminders: ${remListRes.body.reminders.length}`);
      if (remListRes.status !== 200 || remListRes.body.reminders.length === 0) {
        throw new Error('Reminders list is empty');
      }

      // 9. Send Immediate Reminder Email for First Synced Task
      const firstReminder = remListRes.body.reminders[0];
      console.log(`\n9️⃣ Testing POST /api/reminders/${firstReminder.id}/send (Email Alert Bridge)...`);
      const sendRemRes = await request(`/api/reminders/${firstReminder.id}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`   Status: ${sendRemRes.status}, Message: ${sendRemRes.body.message}`);
      if (sendRemRes.status !== 200) throw new Error('Send reminder email failed');

      console.log('\n✅ ALL DASHBOARD, AI EXTRACTION, SIMPLIFICATION, USER REVIEW & REMINDER SYNC TESTS PASSED!\n');

    } catch (err) {
      console.error('\n❌ Test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('🏁 Test server closed.');
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runTests();
