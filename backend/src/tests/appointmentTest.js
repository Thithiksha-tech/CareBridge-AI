/**
 * Automated test for Appointments, Doctor Feedback, and Visit Email Alerts
 */
const http = require('http');
const app = require('../server');

const TEST_PORT = 5005;

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

async function runAppointmentTests() {
  const server = app.listen(TEST_PORT, async () => {
    console.log(`\n🧪 [Appointments & Doctor Feedback Test] Running on ${TEST_PORT}\n`);

    try {
      const uniqueSuffix = Date.now();
      const testUser = {
        username: `appt_user_${uniqueSuffix}`,
        email: `patient_${uniqueSuffix}@example.com`,
        password: 'CareBridgeAppt123!',
        full_name: 'David Miller'
      };

      console.log('1️⃣ Registering Patient...');
      const reg = await request('/api/auth/register', { method: 'POST' }, testUser);
      if (reg.status !== 201) throw new Error('Registration failed');
      const token = reg.body.token;

      // 2. Log past visit with doctor feedback
      console.log('2️⃣ Logging Past Doctor Consultation with Clinical Feedback...');
      const pastVisit = await request('/api/appointments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        doctor_name: 'Dr. Sarah Vance, MD',
        specialty: 'Cardiothoracic Surgery',
        clinic_hospital: 'St. Jude Medical Pavilion - Suite 400',
        appointment_date: '2026-10-24 11:00 AM',
        appointment_type: 'past',
        purpose: 'Post-op Stent Placement Evaluation',
        doctor_feedback: 'Incision site is healing cleanly without signs of erythema or edema. Blood pressure well managed.',
        patient_improvements: 'Patient reports reduced chest pressure, walking 10 minutes comfortably.',
        vitals_recorded: 'BP: 120/78 mmHg, HR: 72 bpm, SpO2: 99%',
        status: 'completed'
      });

      console.log(`   Status: ${pastVisit.status}, Created ID: ${pastVisit.body.appointment.id}`);
      if (pastVisit.status !== 201 || !pastVisit.body.appointment.doctor_feedback) {
        throw new Error('Create past visit failed');
      }

      // 3. Schedule upcoming visit
      console.log('\n3️⃣ Scheduling Upcoming Doctor Appointment...');
      const upVisit = await request('/api/appointments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }, {
        doctor_name: 'Dr. Gregory Henderson, MD',
        specialty: 'Cardiology',
        clinic_hospital: 'Regional Heart & Vascular Clinic',
        appointment_date: '2026-11-05 10:30 AM',
        appointment_type: 'upcoming',
        purpose: 'Titration of Metoprolol, ECG review, and exercise clearance',
        status: 'scheduled'
      });

      console.log(`   Status: ${upVisit.status}, Created ID: ${upVisit.body.appointment.id}`);
      if (upVisit.status !== 201) throw new Error('Create upcoming visit failed');

      // 4. Retrieve /api/appointments
      console.log('\n4️⃣ Testing GET /api/appointments (Tracking past feedback & upcoming visits)...');
      const listRes = await request('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`   Status: ${listRes.status}`);
      console.log(`   Upcoming Visits: ${listRes.body.upcoming.length}`);
      console.log(`   Past Visits: ${listRes.body.past.length}`);
      console.log(`   Last Doctor Feedback: "${listRes.body.lastAppointmentSummary.doctor_feedback.substring(0, 60)}..."`);
      console.log(`   Recorded Improvements: "${listRes.body.lastAppointmentSummary.patient_improvements}"`);

      if (listRes.status !== 200 || listRes.body.upcoming.length !== 1 || listRes.body.past.length !== 1) {
        throw new Error('Appointments query count mismatch');
      }

      // 5. Send Appointment Reminder Email
      console.log('\n5️⃣ Testing POST /api/appointments/:id/send-email (Email Alert Bridge)...');
      const emailRes = await request(`/api/appointments/${upVisit.body.appointment.id}/send-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`   Status: ${emailRes.status}, Message: ${emailRes.body.message}`);
      if (emailRes.status !== 200) throw new Error('Send appointment email failed');

      console.log('\n✅ ALL APPOINTMENT TRACKING & DOCTOR FEEDBACK TESTS PASSED!\n');

    } catch (err) {
      console.error('❌ Appointment test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => process.exit(process.exitCode || 0));
    }
  });
}

runAppointmentTests();
