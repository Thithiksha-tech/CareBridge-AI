export interface User {
  id: number;
  email: string;
  name: string;
  fullName?: string;
  full_name?: string;
  phone?: string;
  role: 'patient' | 'caretaker' | 'doctor' | 'clinician' | 'caregiver';
  isEmailVerified?: boolean;
  assignedPatientId?: number;
  hospitalName?: string;
  hospitalDepartment?: string;
  created_at?: string;
}

export interface DischargeRecord {
  id: number;
  user_id: number;
  file_name: string;
  extracted_text: string;
  parsed_data: {
    patientName?: string;
    admissionReason?: string;
    dischargeDate?: string;
    medications?: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      timing?: string;
      purpose?: string;
      instructions?: string;
    }>;
    appointments?: Array<{
      specialty: string;
      doctor?: string;
      timing: string;
      location?: string;
      notes?: string;
    }>;
    diet?: Array<string>;
    exercises?: Array<string>;
    redFlags?: Array<string>;
    dailyTasks?: Array<{
      category: string;
      task: string;
      timing?: string;
      priority?: 'high' | 'medium' | 'low';
    }>;
    recoveryMilestones?: Array<string>;
  };
  created_at: string;
}

export interface InstructionItem {
  id: string | number;
  category: 'medication' | 'appointment' | 'diet' | 'exercise' | 'warning' | 'general';
  original_text: string;
  simplified_text: string;
  status: 'pending' | 'confirmed' | 'flagged';
  timing?: string;
  notes?: string;
}

export interface InstructionReview {
  id: number;
  discharge_id: number;
  instructions: InstructionItem[];
  status: 'draft' | 'completed';
  created_at: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  discharge_id?: number;
  title: string;
  reminder_type: 'medication' | 'exercise' | 'diet' | 'appointment' | 'general';
  time_slot: 'Morning' | 'Midday' | 'Evening' | 'Bedtime';
  frequency: string;
  status: 'pending' | 'completed' | 'skipped';
  food_timing?: string;
  instructions?: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  user_id: number;
  doctor_name: string;
  doctor_id?: number;
  specialty: string;
  clinic_hospital?: string;
  hospital_details?: string;
  appointment_date: string;
  appointment_time?: string;
  location?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'scheduled' | 'completed' | 'cancelled' | 'requested' | 'confirmed_by_doctor';
  purpose?: string;
  doctor_feedback?: string;
  doctor_response_notes?: string;
  doctor_available_slot?: string;
  requested_by_role?: string;
  requested_by_name?: string;
  requested_by_email?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  vitals?: {
    blood_pressure?: string;
    heart_rate?: string;
    weight?: string;
  };
  created_at: string;
}

export interface HealthLog {
  id: number;
  patient_id: number;
  logged_by: number;
  log_date: string;
  blood_pressure: string;
  systolic: number;
  diastolic: number;
  blood_sugar: number;
  sugar_timing: string;
  blood_report_name?: string;
  blood_report_summary?: string;
  followed_routine: number | boolean;
  ate_healthy: number | boolean;
  hydration_glasses: number;
  improvement_score: number;
  emergency_flag: number | boolean;
  emergency_notes?: string;
  created_at?: string;
}

export interface HealthMetrics {
  streak: number;
  healthyDietDays: number;
  adherenceRate: number;
  totalLogs: number;
  avgBp: string;
  avgSugar: string;
  riskStatus: string;
  riskSeverity: 'low' | 'warning' | 'critical';
  riskMessage: string;
}

export interface MedicationStock {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  current_stock: number;
  daily_intake: number;
  low_stock_threshold: number;
  last_taken_time: string;
  status: 'On Time' | 'Delayed' | 'Low Stock' | 'Out of Stock';
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'assistant' | 'system';
  message: string;
  created_at: string;
}

export interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromEmail: string;
  isConfigured: boolean;
}
