const db = require('./index.js');

try {
  db.exec('PRAGMA foreign_keys=OFF;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS patient_appointments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      discharge_id INTEGER,
      doctor_name TEXT NOT NULL,
      doctor_id INTEGER,
      specialty TEXT,
      clinic_hospital TEXT,
      hospital_details TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT,
      appointment_type TEXT CHECK(appointment_type IN ('past', 'upcoming')) DEFAULT 'upcoming',
      purpose TEXT,
      doctor_feedback TEXT,
      patient_improvements TEXT,
      vitals_recorded TEXT,
      prescriptions_adjusted TEXT,
      requested_by_role TEXT,
      requested_by_name TEXT,
      requested_by_email TEXT,
      doctor_available_slot TEXT,
      doctor_response_notes TEXT,
      status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled', 'requested', 'confirmed_by_doctor', 'declined', 'reschedule_proposed')) DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    INSERT INTO patient_appointments_new (
      id, user_id, discharge_id, doctor_name, doctor_id, specialty, clinic_hospital,
      hospital_details, appointment_date, appointment_time, appointment_type, purpose,
      doctor_feedback, patient_improvements, vitals_recorded, prescriptions_adjusted,
      requested_by_role, requested_by_name, requested_by_email, doctor_available_slot,
      doctor_response_notes, status, created_at
    )
    SELECT 
      id, user_id, discharge_id, doctor_name, doctor_id, specialty, clinic_hospital,
      hospital_details, appointment_date, appointment_time, appointment_type, purpose,
      doctor_feedback, patient_improvements, vitals_recorded, prescriptions_adjusted,
      requested_by_role, requested_by_name, requested_by_email, doctor_available_slot,
      doctor_response_notes, status, created_at
    FROM patient_appointments;
  `);

  db.exec('DROP TABLE patient_appointments;');
  db.exec('ALTER TABLE patient_appointments_new RENAME TO patient_appointments;');
  db.exec('PRAGMA foreign_keys=ON;');
  console.log('Migration succeeded: patient_appointments updated with expanded status values.');
} catch (err) {
  console.error('Migration error:', err);
}
