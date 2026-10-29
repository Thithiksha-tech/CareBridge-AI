const path = require('path');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));
}
const db = require('./index');

async function seed() {
  console.log('[CareBridge Seeder] Seeding database with demo patient and discharge data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Patient: Robert Davis
  let robert = db.prepare('SELECT id FROM users WHERE email = ?').get('robert.davis@example.com');
  if (!robert) {
    const res = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_email_verified, email_reminders_enabled)
      VALUES (?, ?, ?, ?, ?, 'patient', 1, 1)
    `).run('robertdavis', 'robert.davis@example.com', passwordHash, 'Robert Davis', '+1 (555) 234-5678');
    robert = { id: res.lastInsertRowid };
    console.log(`[CareBridge Seeder] Created patient: Robert Davis (ID: ${robert.id})`);
  } else {
    db.prepare("UPDATE users SET role = 'patient', is_email_verified = 1 WHERE id = ?").run(robert.id);
  }

  // 2. Caretaker: Sarah Davis
  let sarah = db.prepare('SELECT id FROM users WHERE email = ?').get('sarah.davis@example.com');
  if (!sarah) {
    const res = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_email_verified, assigned_patient_id, email_reminders_enabled)
      VALUES (?, ?, ?, ?, ?, 'caretaker', 1, ?, 1)
    `).run('sarahdavis', 'sarah.davis@example.com', passwordHash, 'Sarah Davis (Caretaker)', '+1 (555) 987-6543', robert.id);
    sarah = { id: res.lastInsertRowid };
    console.log(`[CareBridge Seeder] Created caretaker: Sarah Davis (ID: ${sarah.id})`);
  } else {
    db.prepare("UPDATE users SET role = 'caretaker', is_email_verified = 1, assigned_patient_id = ? WHERE id = ?").run(robert.id, sarah.id);
  }

  // 3. Doctor: Dr. Sarah Jenkins
  let doctor = db.prepare('SELECT id FROM users WHERE email = ?').get('doctor.jenkins@example.com');
  if (!doctor) {
    const res = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_email_verified, hospital_name, hospital_department, email_reminders_enabled)
      VALUES (?, ?, ?, ?, ?, 'doctor', 1, 'St. Jude Memorial Hospital', 'Cardiology Pavilion', 1)
    `).run('drjenkins', 'doctor.jenkins@example.com', passwordHash, 'Dr. Sarah Jenkins, MD, FACC', '+1 (555) 345-6789');
    doctor = { id: res.lastInsertRowid };
    console.log(`[CareBridge Seeder] Created doctor: Dr. Sarah Jenkins (ID: ${doctor.id})`);
  } else {
    db.prepare("UPDATE users SET role = 'doctor', is_email_verified = 1, hospital_name = 'St. Jude Memorial Hospital', hospital_department = 'Cardiology Pavilion' WHERE id = ?").run(doctor.id);
  }

  // Insert or verify discharge record for Robert
  let discharge = db.prepare('SELECT id FROM discharge_records WHERE user_id = ?').get(robert.id);
  const structuredData = {
    patientName: 'Robert Davis',
    admissionReason: 'Non-ST Elevation Myocardial Infarction (NSTEMI) post-PCI with LAD drug-eluting stent',
    dischargeDate: 'October 24, 2026',
    attendingPhysician: 'Dr. Sarah Jenkins, MD, FACC',
    hospital: 'St. Jude Memorial Healthcare System',
    medications: [
      {
        name: 'Aspirin',
        dose: '81 mg',
        frequency: 'Daily',
        timing: 'Morning with breakfast',
        purpose: 'Antiplatelet therapy to prevent arterial clotting',
        instructions: "It's time for you to eat this tablet with breakfast. Do not take on empty stomach."
      },
      {
        name: 'Clopidogrel (Plavix)',
        dose: '75 mg',
        frequency: 'Daily',
        timing: 'Morning with breakfast',
        purpose: 'Prevent in-stent thrombosis',
        instructions: "Take 1 tablet every morning with breakfast and water. Do not skip."
      },
      {
        name: 'Metoprolol Tartrate',
        dose: '25 mg',
        frequency: 'Twice daily',
        timing: 'Morning 8:00 AM & Evening 6:30 PM',
        purpose: 'Blood pressure and heart rate control',
        instructions: "Take with food at breakfast and dinner. Hold if heart rate < 55 bpm."
      },
      {
        name: 'Atorvastatin',
        dose: '40 mg',
        frequency: 'Daily',
        timing: 'Bedtime 10:00 PM',
        purpose: 'Cholesterol plaque stabilization',
        instructions: "Take at bedtime with water. Absolutely no grapefruit juice."
      },
      {
        name: 'Nitroglycerin',
        dose: '0.4 mg SL',
        frequency: 'As needed',
        timing: 'Under tongue every 5 mins for chest pain',
        purpose: 'Emergency angina relief',
        instructions: "Dissolve 1 tablet under tongue for chest pain. If pain persists after 5 mins, call 911."
      }
    ],
    diet: [
      'Low-sodium DASH diet (restrict sodium to under 2,000 mg daily)',
      'Emphasize fresh leafy greens, fruits, whole grains, and lean poultry/fish',
      'Strictly avoid grapefruit or grapefruit juice due to statin interaction',
      'Limit caffeine intake to 1 cup daily; stay adequately hydrated with water'
    ],
    exercises: [
      'Light walking: 15 minutes of slow, flat-surface walking starting post-discharge Day 2',
      'Do not lift anything heavier than 10 lbs (4.5 kg) for 7 days',
      'Avoid strenuous physical exertion, stair running, or heavy pushing/pulling',
      'Stop walking immediately if you feel dizzy, breathless, or experience chest tightness'
    ],
    appointments: [
      {
        specialty: 'Cardiology Follow-Up',
        doctor: 'Dr. Sarah Jenkins, MD',
        timing: 'Oct 31, 2026 at 10:30 AM',
        location: 'Heart Vascular Pavilion, Suite 400',
        notes: 'Bring home blood pressure and pulse log from the past week.'
      },
      {
        specialty: 'Primary Care Physician',
        doctor: 'Dr. Marcus Vance, MD',
        timing: 'Nov 07, 2026 at 2:00 PM',
        location: 'St. Jude Family Medicine Clinic',
        notes: 'Evaluate metabolic panel and incision site healing.'
      }
    ],
    redFlags: [
      'Recurring pressure, tightness, or squeezing pain in the center of the chest',
      'Pain radiating to the left arm, neck, jaw, or shoulder blades',
      'Sudden shortness of breath resting on flat surface',
      'Active bleeding, swelling, or severe bruising at the femoral puncture site',
      'Fever greater than 101°F (38.3°C) or persistent chills'
    ]
  };

  if (!discharge) {
    const discRes = db.prepare(`
      INSERT INTO discharge_records (
        user_id, original_filename, raw_text, ai_summary, medications, exercises, dietary_guidelines, appointments, red_flags, structured_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')
    `).run(
      robert.id,
      'carebridge_sample_discharge_instructions.pdf',
      'PATIENT DISCHARGE SUMMARY: Robert Davis. St. Jude Memorial Healthcare...',
      'Successful PCI with LAD stent. Comprehensive dual-antiplatelet regimen prescribed.',
      JSON.stringify(structuredData.medications),
      JSON.stringify(structuredData.exercises),
      JSON.stringify(structuredData.diet),
      JSON.stringify(structuredData.appointments),
      JSON.stringify(structuredData.redFlags),
      JSON.stringify(structuredData)
    );
    discharge = { id: discRes.lastInsertRowid };
    console.log(`[CareBridge Seeder] Inserted discharge record for Robert (ID: ${discharge.id})`);
  }

  // Seed reminders
  const existingReminders = db.prepare('SELECT count(*) as count FROM reminders WHERE user_id = ?').get(robert.id);
  if (existingReminders.count === 0) {
    const insertRem = db.prepare(`
      INSERT INTO reminders (user_id, title, description, category, frequency, time_of_day, meal_timing, is_active, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    insertRem.run(robert.id, 'Aspirin 81mg (Antiplatelet)', "It's time for you to eat this tablet with breakfast to protect your stent.", 'medication', 'daily', 'Morning', 'Take 30 mins after breakfast with water', 1);
    insertRem.run(robert.id, 'Clopidogrel (Plavix) 75mg', "It's time for you to eat this tablet with breakfast. Prevents in-stent thrombosis.", 'medication', 'daily', 'Morning', 'Take after breakfast with water', 1);
    insertRem.run(robert.id, 'Metoprolol Tartrate 25mg (Morning)', "It's time for you to eat this tablet with breakfast for heart rate control.", 'medication', 'twice daily', 'Morning', 'Take with breakfast', 0);
    insertRem.run(robert.id, '15-Minute Flat Walking Routine', "It's time for you to do your light walking exercise. Keep comfortable pace.", 'exercise', 'daily', 'Midday', 'Perform 15 mins after lunch', 0);
    insertRem.run(robert.id, 'Metoprolol Tartrate 25mg (Evening)', "It's time for you to eat this tablet with dinner. Hold if BP < 100.", 'medication', 'twice daily', 'Evening', 'Take with dinner', 0);
    insertRem.run(robert.id, 'Atorvastatin 40mg', "It's time for you to eat this tablet at bedtime. Avoid all grapefruit.", 'medication', 'daily', 'Bedtime', 'Take at bedtime with water', 0);
    console.log('[CareBridge Seeder] Seeded 6 timed care reminders with explicit meal/exercise timings.');
  }

  // Seed appointments
  const existingAppts = db.prepare('SELECT count(*) as count FROM patient_appointments WHERE user_id = ?').get(robert.id);
  if (existingAppts.count === 0) {
    const insertAppt = db.prepare(`
      INSERT INTO patient_appointments (user_id, discharge_id, doctor_name, specialty, clinic_hospital, appointment_date, appointment_type, purpose, doctor_feedback, vitals_recorded, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAppt.run(
      robert.id,
      discharge.id,
      'Dr. Sarah Jenkins, MD, FACC',
      'Cardiology Follow-Up',
      'Heart Vascular Pavilion, Suite 400',
      '2026-10-31',
      'upcoming',
      'Post-PCI 1-week clinical re-evaluation and stent hemostasis check',
      'Patient stent recovery is proceeding as expected. Maintain dual-antiplatelet therapy and low-sodium diet without interruption.',
      JSON.stringify({ blood_pressure: '118/76', heart_rate: '66', weight: '172 lbs' }),
      'scheduled'
    );

    insertAppt.run(
      robert.id,
      discharge.id,
      'Dr. Marcus Vance, MD',
      'Primary Care Follow-Up',
      'St. Jude Family Medicine Clinic',
      '2026-11-07',
      'upcoming',
      '2-week comprehensive metabolic panel and lipid panel review',
      'Incision site healing well. Blood glucose and electrolytes stable.',
      JSON.stringify({ blood_pressure: '120/78', heart_rate: '70', weight: '171 lbs' }),
      'scheduled'
    );
    console.log('[CareBridge Seeder] Seeded 2 doctor appointments with physician feedback and vitals.');
  }

  // 4. Seed Patient Health Logs (Blood Reports, Sugar Reports, Routine Streak, Healthy Eating)
  const existingLogs = db.prepare('SELECT count(*) as count FROM patient_health_logs WHERE patient_id = ?').get(robert.id);
  if (existingLogs.count === 0) {
    const insertLog = db.prepare(`
      INSERT INTO patient_health_logs (
        patient_id, logged_by, log_date, blood_pressure, systolic, diastolic, blood_sugar, sugar_timing,
        blood_report_name, blood_report_summary, followed_routine, ate_healthy, hydration_glasses,
        improvement_score, emergency_flag, emergency_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertLog.run(
      robert.id, robert.id, '2026-10-25', '124/82', 124, 82, 102, 'Fasting',
      'Post-Discharge CBC (Complete Blood Count)', 'WBC: 6.8 K/uL (Normal), Platelets: 245 K/uL, Hemoglobin: 14.1 g/dL',
      1, 1, 8, 7, 0, null
    );

    insertLog.run(
      robert.id, robert.id, '2026-10-26', '120/78', 120, 78, 128, 'Post-Meal',
      'Metabolic & Electrolyte Panel', 'Sodium: 139 mEq/L, Potassium: 4.2 mEq/L, Creatinine: 0.9 mg/dL (All Stable)',
      1, 1, 9, 8, 0, null
    );

    insertLog.run(
      robert.id, robert.id, '2026-10-27', '118/76', 118, 76, 96, 'Fasting',
      'Fasting Blood Sugar & Stent Healing Evaluation', 'Fasting Blood Glucose: 96 mg/dL. Normal range maintained.',
      1, 1, 8, 8, 0, null
    );

    insertLog.run(
      robert.id, robert.id, '2026-10-28', '116/74', 116, 74, 114, 'Post-Meal',
      'Lipid Profile & Platelet Reactivity Check', 'Total Cholesterol: 158 mg/dL, LDL: 68 mg/dL (Target < 70 achieved with Atorvastatin)',
      1, 1, 10, 9, 0, null
    );

    insertLog.run(
      robert.id, robert.id, '2026-10-29', '118/76', 118, 76, 94, 'Fasting',
      'Daily Vital & Recovery Routine Log', 'Blood pressure optimal. No angina or palpitations. Walking completed.',
      1, 1, 8, 9, 0, null
    );

    console.log('[CareBridge Seeder] Seeded 5 days of patient health logs (Blood reports, Sugar reports, Routine streak).');
  }

  // 5. Seed Medication Stock & Pill Monitoring (For Caretaker)
  const existingStock = db.prepare('SELECT count(*) as count FROM medication_stock WHERE patient_id = ?').get(robert.id);
  if (existingStock.count === 0) {
    const insertStock = db.prepare(`
      INSERT INTO medication_stock (
        patient_id, medication_name, dosage, current_stock, daily_intake, low_stock_threshold, last_taken_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStock.run(robert.id, 'Aspirin (Cardio-protective)', '81 mg', 28, 1, 5, 'Today, 8:15 AM', 'On Time');
    insertStock.run(robert.id, 'Clopidogrel (Plavix Antiplatelet)', '75 mg', 28, 1, 5, 'Today, 8:15 AM', 'On Time');
    insertStock.run(robert.id, 'Metoprolol Tartrate (Beta Blocker)', '25 mg', 4, 2, 6, 'Today, 8:20 AM', 'Low Stock');
    insertStock.run(robert.id, 'Atorvastatin (Lipid Control)', '40 mg', 29, 1, 5, 'Yesterday, 9:55 PM', 'On Time');
    insertStock.run(robert.id, 'Nitroglycerin Sublingual', '0.4 mg SL', 20, 0, 5, 'Emergency Reserve', 'In Stock');

    console.log('[CareBridge Seeder] Seeded medication stock and pill adherence monitoring.');
  }

  // 6. Seed Caretaker Appointment Request to Doctor with Doctor Response
  const reqCheck = db.prepare("SELECT count(*) as count FROM patient_appointments WHERE requested_by_role = 'caretaker'").get();
  if (reqCheck.count === 0) {
    db.prepare(`
      INSERT INTO patient_appointments (
        user_id, doctor_name, doctor_id, specialty, clinic_hospital, hospital_details,
        appointment_date, appointment_time, appointment_type, purpose,
        requested_by_role, requested_by_name, requested_by_email,
        doctor_feedback, doctor_response_notes, doctor_available_slot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      robert.id,
      'Dr. Sarah Jenkins, MD, FACC',
      doctor.id,
      'Cardiology Follow-Up',
      'St. Jude Memorial Hospital',
      'Cardiology Outpatient Clinic, Pavilion 3rd Floor, Reception Desk #4',
      '2026-11-04',
      '10:30 AM',
      'upcoming',
      'Post-PCI 2-week stent re-check & blood pressure adjustment requested by caretaker',
      'caretaker',
      'Sarah Davis',
      'sarah.davis@example.com',
      'Patient stent recovery is proceeding as expected.',
      'Confirmed with Reception Desk #4. Dr. Jenkins is available on Wednesday Nov 4 at 10:30 AM. Please bring home blood pressure and blood sugar logs.',
      'Wed Nov 4, 10:30 AM - Suite 400',
      'confirmed_by_doctor'
    );
    console.log('[CareBridge Seeder] Seeded Caretaker-to-Doctor appointment request with 3-way response.');
  }

  // 7. Seed Comparative Clinical Lab Reports (Discharge Baseline vs Post-Op Day 4 vs Current)
  const labCheck = db.prepare("SELECT count(*) as count FROM patient_lab_reports WHERE patient_id = ?").get(robert.id);
  if (labCheck.count === 0) {
    const insertLab = db.prepare(`
      INSERT INTO patient_lab_reports (patient_id, report_date, stage_name, facility, lab_values, clinical_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Baseline (Discharge Day 0 - Oct 24, 2026)
    insertLab.run(
      robert.id,
      '2026-10-24',
      'Discharge Baseline (Day 0)',
      'St. Jude Memorial Hospital - Acute Inpatient Lab',
      JSON.stringify({
        troponin_i: { value: 42.5, unit: 'ng/L', normalRange: '< 14 ng/L', status: 'critical_high', label: 'hs-Troponin I' },
        bnp: { value: 780, unit: 'pg/mL', normalRange: '< 300 pg/mL', status: 'high', label: 'NT-proBNP' },
        crp: { value: 8.4, unit: 'mg/L', normalRange: '< 2.0 mg/L', status: 'high', label: 'hs-CRP' },
        total_cholesterol: { value: 245, unit: 'mg/dL', normalRange: '< 200 mg/dL', status: 'high', label: 'Total Cholesterol' },
        ldl_c: { value: 158, unit: 'mg/dL', normalRange: '< 70 mg/dL', status: 'critical_high', label: 'LDL Cholesterol' },
        hdl_c: { value: 36, unit: 'mg/dL', normalRange: '> 40 mg/dL', status: 'low', label: 'HDL Cholesterol' },
        triglycerides: { value: 255, unit: 'mg/dL', normalRange: '< 150 mg/dL', status: 'high', label: 'Triglycerides' },
        creatinine: { value: 1.15, unit: 'mg/dL', normalRange: '0.7 - 1.2 mg/dL', status: 'normal', label: 'Serum Creatinine' },
        egfr: { value: 72, unit: 'mL/min/1.73m²', normalRange: '> 60', status: 'normal', label: 'eGFR' },
        fasting_glucose: { value: 135, unit: 'mg/dL', normalRange: '70 - 100 mg/dL', status: 'high', label: 'Fasting Blood Sugar' },
        hba1c: { value: 6.8, unit: '%', normalRange: '< 5.7%', status: 'high', label: 'HbA1c' },
        platelets: { value: 230, unit: '10³/µL', normalRange: '150 - 450', status: 'normal', label: 'Platelet Count' },
        inr: { value: 1.05, unit: 'ratio', normalRange: '0.9 - 1.1', status: 'normal', label: 'INR (Coagulation)' }
      }),
      'Post-PCI peak elevation of myocardial necrosis markers. Hyperlipidemia marked with LDL 158. Statin 80mg and dual antiplatelet therapy initiated.'
    );

    // Stage 2: Post-Op Day 4 (Oct 28, 2026)
    insertLab.run(
      robert.id,
      '2026-10-28',
      'Post-Op Day 4 (Early Recovery)',
      'Cardiology Pavilion Outpatient Lab',
      JSON.stringify({
        troponin_i: { value: 18.2, unit: 'ng/L', normalRange: '< 14 ng/L', status: 'elevated', label: 'hs-Troponin I' },
        bnp: { value: 450, unit: 'pg/mL', normalRange: '< 300 pg/mL', status: 'elevated', label: 'NT-proBNP' },
        crp: { value: 4.2, unit: 'mg/L', normalRange: '< 2.0 mg/L', status: 'elevated', label: 'hs-CRP' },
        total_cholesterol: { value: 205, unit: 'mg/dL', normalRange: '< 200 mg/dL', status: 'borderline', label: 'Total Cholesterol' },
        ldl_c: { value: 112, unit: 'mg/dL', normalRange: '< 70 mg/dL', status: 'high', label: 'LDL Cholesterol' },
        hdl_c: { value: 39, unit: 'mg/dL', normalRange: '> 40 mg/dL', status: 'borderline', label: 'HDL Cholesterol' },
        triglycerides: { value: 210, unit: 'mg/dL', normalRange: '< 150 mg/dL', status: 'borderline', label: 'Triglycerides' },
        creatinine: { value: 1.02, unit: 'mg/dL', normalRange: '0.7 - 1.2 mg/dL', status: 'normal', label: 'Serum Creatinine' },
        egfr: { value: 78, unit: 'mL/min/1.73m²', normalRange: '> 60', status: 'normal', label: 'eGFR' },
        fasting_glucose: { value: 112, unit: 'mg/dL', normalRange: '70 - 100 mg/dL', status: 'borderline', label: 'Fasting Blood Sugar' },
        hba1c: { value: 6.6, unit: '%', normalRange: '< 5.7%', status: 'elevated', label: 'HbA1c' },
        platelets: { value: 222, unit: '10³/µL', normalRange: '150 - 450', status: 'normal', label: 'Platelet Count' },
        inr: { value: 1.04, unit: 'ratio', normalRange: '0.9 - 1.1', status: 'normal', label: 'INR (Coagulation)' }
      }),
      'Encouraging reduction in cardiac troponin (57% reduction). Myocardial healing evident. Inflammatory CRP descending.'
    );

    // Stage 3: Current Week 1 Follow-Up (Nov 03, 2026)
    insertLab.run(
      robert.id,
      '2026-11-03',
      'Current Recovery (Week 1 Follow-Up)',
      'St. Jude Medical Clinical Laboratories',
      JSON.stringify({
        troponin_i: { value: 8.2, unit: 'ng/L', normalRange: '< 14 ng/L', status: 'normal', label: 'hs-Troponin I' },
        bnp: { value: 240, unit: 'pg/mL', normalRange: '< 300 pg/mL', status: 'normal', label: 'NT-proBNP' },
        crp: { value: 1.8, unit: 'mg/L', normalRange: '< 2.0 mg/L', status: 'normal', label: 'hs-CRP' },
        total_cholesterol: { value: 168, unit: 'mg/dL', normalRange: '< 200 mg/dL', status: 'normal', label: 'Total Cholesterol' },
        ldl_c: { value: 68, unit: 'mg/dL', normalRange: '< 70 mg/dL', status: 'normal', label: 'LDL Cholesterol' },
        hdl_c: { value: 44, unit: 'mg/dL', normalRange: '> 40 mg/dL', status: 'normal', label: 'HDL Cholesterol' },
        triglycerides: { value: 162, unit: 'mg/dL', normalRange: '< 150 mg/dL', status: 'borderline', label: 'Triglycerides' },
        creatinine: { value: 0.95, unit: 'mg/dL', normalRange: '0.7 - 1.2 mg/dL', status: 'normal', label: 'Serum Creatinine' },
        egfr: { value: 84, unit: 'mL/min/1.73m²', normalRange: '> 60', status: 'normal', label: 'eGFR' },
        fasting_glucose: { value: 98, unit: 'mg/dL', normalRange: '70 - 100 mg/dL', status: 'normal', label: 'Fasting Blood Sugar' },
        hba1c: { value: 6.2, unit: '%', normalRange: '< 5.7%', status: 'borderline', label: 'HbA1c' },
        platelets: { value: 215, unit: '10³/µL', normalRange: '150 - 450', status: 'normal', label: 'Platelet Count' },
        inr: { value: 1.02, unit: 'ratio', normalRange: '0.9 - 1.1', status: 'normal', label: 'INR (Coagulation)' }
      }),
      'Optimal clinical response. Troponin I normalized to 8.2 ng/L. LDL-C achieved guideline target < 70 mg/dL (now 68 mg/dL). Renal contrast load fully cleared.'
    );

    console.log('[CareBridge Seeder] Seeded comparative clinical lab panels across 3 post-discharge stages.');
  }

  console.log('[CareBridge Seeder] Seeding finished successfully!');
}

seed().catch(console.error);
