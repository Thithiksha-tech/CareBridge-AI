-- ============================================================================
-- CareBridge AI — Database Schema
-- Multi-user clinical care assistant schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK(role IN ('patient', 'caretaker', 'doctor')) DEFAULT 'patient',
  is_email_verified INTEGER DEFAULT 0,
  assigned_patient_id INTEGER,
  hospital_name TEXT,
  hospital_department TEXT,
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
