const path = require('path');
const fs = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  try {
    Database = require(require.resolve('better-sqlite3', { paths: [path.join(__dirname, '../backend')] }));
  } catch {
    Database = require(path.join(__dirname, '../backend/node_modules/better-sqlite3'));
  }
}

// Database path in database/ folder or configurable via env
const dbDir = path.resolve(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'carebridge.sqlite');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      phone TEXT,
      email_reminders_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discharge_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_filename TEXT,
      file_path TEXT,
      raw_text TEXT,
      ai_summary TEXT,
      medications TEXT,
      exercises TEXT,
      dietary_guidelines TEXT,
      appointments TEXT,
      care_roadmap TEXT,
      red_flags TEXT,
      structured_data TEXT,
      status TEXT DEFAULT 'processed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instruction_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discharge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      instruction_id TEXT NOT NULL,
      category TEXT NOT NULL,
      original_text TEXT,
      simplified_text TEXT,
      status TEXT CHECK(status IN ('pending_review', 'confirmed', 'edited', 'rejected')) DEFAULT 'pending_review',
      edited_text TEXT,
      user_notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(discharge_id, instruction_id),
      FOREIGN KEY (discharge_id) REFERENCES discharge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('medication', 'water', 'exercise', 'diet', 'appointment', 'custom')) NOT NULL,
      frequency TEXT DEFAULT 'daily',
      time_of_day TEXT,
      scheduled_time TEXT,
      meal_timing TEXT,
      scheduled_at DATETIME,
      is_active INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      last_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patient_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      discharge_id INTEGER,
      doctor_name TEXT NOT NULL,
      specialty TEXT,
      clinic_hospital TEXT,
      appointment_date TEXT NOT NULL,
      appointment_type TEXT CHECK(appointment_type IN ('past', 'upcoming')) DEFAULT 'upcoming',
      purpose TEXT,
      doctor_feedback TEXT,
      patient_improvements TEXT,
      vitals_recorded TEXT,
      prescriptions_adjusted TEXT,
      status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled', 'requested', 'confirmed_by_doctor', 'declined')) DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      discharge_id INTEGER,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      message TEXT NOT NULL,
      task_context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminder_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id INTEGER,
      user_id INTEGER NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      user_id INTEGER,
      expires_at DATETIME NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      logged_by INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      blood_pressure TEXT,
      systolic INTEGER,
      diastolic INTEGER,
      blood_sugar REAL,
      sugar_timing TEXT,
      blood_report_name TEXT,
      blood_report_summary TEXT,
      followed_routine INTEGER DEFAULT 1,
      ate_healthy INTEGER DEFAULT 1,
      hydration_glasses INTEGER DEFAULT 8,
      improvement_score INTEGER DEFAULT 8,
      emergency_flag INTEGER DEFAULT 0,
      emergency_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medication_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      medication_name TEXT NOT NULL,
      dosage TEXT,
      current_stock INTEGER DEFAULT 30,
      daily_intake INTEGER DEFAULT 1,
      low_stock_threshold INTEGER DEFAULT 5,
      last_taken_time TEXT,
      status TEXT DEFAULT 'On Time',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discharge_rag_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discharge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discharge_id) REFERENCES discharge_records(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patient_lab_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      report_date TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      facility TEXT,
      lab_values TEXT NOT NULL,
      clinical_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Safe table column migrations
  const userColumnsToAdd = [
    { name: 'role', sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'patient'" },
    { name: 'is_email_verified', sql: "ALTER TABLE users ADD COLUMN is_email_verified INTEGER DEFAULT 0" },
    { name: 'assigned_patient_id', sql: "ALTER TABLE users ADD COLUMN assigned_patient_id INTEGER" },
    { name: 'hospital_name', sql: "ALTER TABLE users ADD COLUMN hospital_name TEXT" },
    { name: 'hospital_department', sql: "ALTER TABLE users ADD COLUMN hospital_department TEXT" }
  ];

  for (const col of userColumnsToAdd) {
    try {
      db.exec(col.sql);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  const apptColumnsToAdd = [
    { name: 'doctor_id', sql: "ALTER TABLE patient_appointments ADD COLUMN doctor_id INTEGER" },
    { name: 'appointment_time', sql: "ALTER TABLE patient_appointments ADD COLUMN appointment_time TEXT" },
    { name: 'hospital_details', sql: "ALTER TABLE patient_appointments ADD COLUMN hospital_details TEXT" },
    { name: 'requested_by_role', sql: "ALTER TABLE patient_appointments ADD COLUMN requested_by_role TEXT DEFAULT 'caretaker'" },
    { name: 'requested_by_name', sql: "ALTER TABLE patient_appointments ADD COLUMN requested_by_name TEXT" },
    { name: 'requested_by_email', sql: "ALTER TABLE patient_appointments ADD COLUMN requested_by_email TEXT" },
    { name: 'doctor_response_notes', sql: "ALTER TABLE patient_appointments ADD COLUMN doctor_response_notes TEXT" },
    { name: 'doctor_available_slot', sql: "ALTER TABLE patient_appointments ADD COLUMN doctor_available_slot TEXT" }
  ];

  for (const col of apptColumnsToAdd) {
    try {
      db.exec(col.sql);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  const healthLogColumnsToAdd = [
    { name: 'heart_rate', sql: "ALTER TABLE patient_health_logs ADD COLUMN heart_rate INTEGER" },
    { name: 'oxygen_level', sql: "ALTER TABLE patient_health_logs ADD COLUMN oxygen_level REAL" },
    { name: 'temperature', sql: "ALTER TABLE patient_health_logs ADD COLUMN temperature REAL" },
    { name: 'weight', sql: "ALTER TABLE patient_health_logs ADD COLUMN weight REAL" },
    { name: 'anomaly_score', sql: "ALTER TABLE patient_health_logs ADD COLUMN anomaly_score REAL DEFAULT 0" },
    { name: 'anomaly_status', sql: "ALTER TABLE patient_health_logs ADD COLUMN anomaly_status TEXT DEFAULT 'normal'" },
    { name: 'anomaly_details', sql: "ALTER TABLE patient_health_logs ADD COLUMN anomaly_details TEXT" }
  ];

  for (const col of healthLogColumnsToAdd) {
    try {
      db.exec(col.sql);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  console.log(`[CareBridge Database Engine] Segregated database initialized at: ${dbPath}`);
}

initDatabase();

module.exports = db;
