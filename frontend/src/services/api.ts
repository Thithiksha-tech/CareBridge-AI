import axios from 'axios';
import type {
  User,
  DischargeRecord,
  InstructionReview,
  InstructionItem,
  Reminder,
  Appointment,
  ChatMessage,
  EmailLog,
  EmailSettings,
  HealthLog,
  HealthMetrics,
  MedicationStock
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Intercept requests to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carebridge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('carebridge_token');
      localStorage.removeItem('carebridge_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(name: string, email: string, password: string, role = 'patient', assignedPatientId?: number, hospitalName?: string): Promise<{ user: User; token: string; otpPreview?: string }> {
    const res = await api.post('/auth/register', { name, email, password, role, assigned_patient_id: assignedPatientId, hospital_name: hospitalName });
    return res.data;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async me(): Promise<{ user: User }> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async sendOtp(email?: string, name?: string): Promise<{ success: boolean; message: string; otpPreview?: string }> {
    const res = await api.post('/auth/send-otp', { email, name });
    return res.data;
  },

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/auth/verify-otp', { email, otp });
    return res.data;
  },

  async getOtpStatus(): Promise<{ success: boolean; hasPendingOtp: boolean; otpPreview?: string; expiresAt?: string }> {
    const res = await api.get('/auth/otp-status');
    return res.data;
  },

  async getNetwork(): Promise<{ success: boolean; patients: User[]; doctors: User[]; caretakers: User[] }> {
    const res = await api.get('/auth/network');
    return res.data;
  },
};

export const dischargeService = {
  async uploadFile(file: File): Promise<{ record: DischargeRecord; review: InstructionReview }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/discharge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadText(rawText: string, fileName?: string): Promise<{ record: DischargeRecord; review: InstructionReview }> {
    const res = await api.post('/discharge/text', { rawText, fileName });
    return res.data;
  },

  async getLatest(): Promise<{ record: DischargeRecord | null; review: InstructionReview | null }> {
    const res = await api.get('/discharge/latest');
    return res.data;
  },

  async getHistory(): Promise<{ history: DischargeRecord[] }> {
    const res = await api.get('/discharge/history');
    return res.data;
  },

  async getReview(dischargeId: number): Promise<{ review: InstructionReview }> {
    const res = await api.get(`/discharge/review/${dischargeId}`);
    return res.data;
  },

  async updateInstructions(dischargeId: number, instructions: InstructionItem[], status?: 'draft' | 'completed'): Promise<{ review: InstructionReview }> {
    const res = await api.put(`/discharge/review/${dischargeId}`, { instructions, status });
    return res.data;
  },
};

export const reminderService = {
  async getGrouped(): Promise<{
    grouped: {
      Morning: Reminder[];
      Midday: Reminder[];
      Evening: Reminder[];
      Bedtime: Reminder[];
    };
    stats: { total: number; completed: number; pending: number };
  }> {
    const res = await api.get('/reminders/grouped');
    return res.data;
  },

  async updateStatus(id: number, status: 'pending' | 'completed' | 'skipped'): Promise<{ reminder: Reminder }> {
    const res = await api.patch(`/reminders/${id}/status`, { status });
    return res.data;
  },

  async sendEmailAlert(reminderId?: number, recipientEmail?: string): Promise<{ success: boolean; message: string; messageId?: string }> {
    const res = await api.post('/reminders/send-email', { reminderId, recipientEmail });
    return res.data;
  },

  async testEmail(email: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/reminders/test-email', { email });
    return res.data;
  },
};

export const appointmentService = {
  async getAll(): Promise<{ appointments: Appointment[] }> {
    const res = await api.get('/appointments');
    return res.data;
  },

  async create(data: Partial<Appointment>): Promise<{ appointment: Appointment }> {
    const res = await api.post('/appointments', data);
    return res.data;
  },

  async request(data: {
    patient_id?: number;
    doctor_id?: number;
    doctor_name?: string;
    specialty?: string;
    clinic_hospital?: string;
    hospital_details?: string;
    appointment_date: string;
    appointment_time: string;
    purpose: string;
  }): Promise<{ success: boolean; message: string; appointment: Appointment }> {
    const res = await api.post('/appointments/request', data);
    return res.data;
  },

  async getDoctorRequests(): Promise<{ success: boolean; requests: Appointment[] }> {
    const res = await api.get('/appointments/doctor-requests');
    return res.data;
  },

  async doctorRespond(id: number, data: {
    available_slot?: string;
    response_notes?: string;
    confirmed_date?: string;
    confirmed_time?: string;
  }): Promise<{ success: boolean; message: string; appointment: Appointment }> {
    const res = await api.post(`/appointments/${id}/doctor-respond`, data);
    return res.data;
  },

  async update(id: number, data: Partial<Appointment>): Promise<{ appointment: Appointment }> {
    const res = await api.put(`/appointments/${id}`, data);
    return res.data;
  },

  async sendNotification(id: number, email?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/appointments/${id}/email`, { email });
    return res.data;
  },
};

export const healthService = {
  async getLogs(patientId?: number): Promise<{
    success: boolean;
    patient: User;
    logs: HealthLog[];
    metrics: HealthMetrics;
  }> {
    const res = await api.get('/health-logs/logs', { params: { patient_id: patientId } });
    return res.data;
  },

  async createLog(data: Partial<HealthLog>): Promise<{ success: boolean; message: string; logId: number }> {
    const res = await api.post('/health-logs/logs', data);
    return res.data;
  },

  async triggerEmergency(symptoms?: string): Promise<{ success: boolean; message: string; notifiedEmails: string[] }> {
    const res = await api.post('/health-logs/emergency', { symptoms });
    return res.data;
  },

  async getMedicationStock(patientId?: number): Promise<{
    success: boolean;
    stock: MedicationStock[];
    summary: { totalMedications: number; lowStockCount: number; outOfStockCount: number; needsReorder: boolean };
  }> {
    const res = await api.get('/health-logs/medication-stock', { params: { patient_id: patientId } });
    return res.data;
  },

  async updateMedicationStock(id: number, action: 'take_dose' | 'refill', amount = 1): Promise<{
    success: boolean;
    message: string;
    medication: MedicationStock;
  }> {
    const res = await api.post(`/health-logs/medication-stock/${id}`, { action, amount });
    return res.data;
  },

  async analyzeVitals(vitals: any): Promise<any> {
    const res = await api.post('/health-logs/analyze-vitals', vitals);
    return res.data;
  },
};

export const chatService = {
  async sendMessage(message: string, context?: any): Promise<{ reply: string; rag_grounded?: boolean; citations?: any[] }> {
    const res = await api.post('/chat/message', { message, context });
    return res.data;
  },

  async queryRag(query: string): Promise<{
    success: boolean;
    query: string;
    reply: string;
    rag_grounded: boolean;
    citations: Array<{ source_id: number; section: string; section_title: string; excerpt: string }>;
    chunks: Array<{ section: string; score: number; content: string }>;
  }> {
    const res = await api.post('/chat/rag-query', { query });
    return res.data;
  },

  async getHistory(): Promise<{ history: ChatMessage[] }> {
    const res = await api.get('/chat/history');
    return res.data;
  },

  async clearHistory(): Promise<{ success: boolean }> {
    const res = await api.post('/chat/clear');
    return res.data;
  },
};

export const settingsService = {
  async getEmailSettings(): Promise<EmailSettings> {
    const res = await api.get('/settings/email');
    return res.data;
  },

  async saveEmailSettings(settings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/settings/email', settings);
    return res.data;
  },

  async testSmtp(testEmail: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/settings/email/test', { testEmail });
    return res.data;
  },

  async getEmailLogs(): Promise<{ logs: EmailLog[] }> {
    const res = await api.get('/settings/email-logs');
    return res.data;
  },

  async getAiStatus(): Promise<{ model: string; configured: boolean }> {
    const res = await api.get('/settings/ai');
    return res.data;
  },

  async saveGeminiKey(apiKey: string, model?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/settings/ai', { apiKey, model });
    return res.data;
  },
};

export default api;
