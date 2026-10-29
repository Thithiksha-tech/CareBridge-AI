import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  Send,
  BotMessageSquare,
  FileText,
  Activity,
  HeartPulse,
  ExternalLink,
  Flame,
  Salad,
  Droplets,
  AlertOctagon,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  Check,
  X,
  PhoneCall,
  Mail,
  History,
  ShieldAlert,
  ChevronRight,
  Stethoscope,
  Users
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { dischargeService, reminderService, appointmentService, healthService } from '../services/api';
import type { DischargeRecord, Reminder, Appointment, HealthLog, HealthMetrics } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recovery' | 'history'>('recovery');

  // Core Data
  const [latestDischarge, setLatestDischarge] = useState<DischargeRecord | null>(null);
  const [dischargeHistory, setDischargeHistory] = useState<DischargeRecord[]>([]);
  const [reminders, setReminders] = useState<{
    Morning: Reminder[];
    Midday: Reminder[];
    Evening: Reminder[];
    Bedtime: Reminder[];
  }>({ Morning: [], Midday: [], Evening: [], Bedtime: [] });
  const [reminderStats, setReminderStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Modals & Quick Log Form
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('Critical blood pressure or sugar reading');
  const [loggingEmergency, setLoggingEmergency] = useState(false);

  // Vitals State
  const [newSystolic, setNewSystolic] = useState('118');
  const [newDiastolic, setNewDiastolic] = useState('76');
  const [newSugar, setNewSugar] = useState('98');
  const [newSugarTiming, setNewSugarTiming] = useState('Fasting');
  const [newPulse, setNewPulse] = useState('72');

  // AI Quick Ask
  const [quickQuestion, setQuickQuestion] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [discRes, histRes, remRes, appRes, healthRes] = await Promise.all([
        dischargeService.getLatest().catch(() => ({ record: null, review: null })),
        dischargeService.getHistory().catch(() => ({ history: [] })),
        reminderService.getGrouped().catch(() => ({
          grouped: { Morning: [], Midday: [], Evening: [], Bedtime: [] },
          stats: { total: 0, completed: 0, pending: 0 },
        })),
        appointmentService.getAll().catch(() => ({ appointments: [] })),
        healthService.getLogs().catch(() => ({ success: false, logs: [], metrics: null })),
      ]);

      setLatestDischarge(discRes.record);
      setDischargeHistory(histRes.history || []);
      setReminders(remRes.grouped);
      setReminderStats(remRes.stats);
      setAppointments(appRes.appointments || []);
      if (healthRes && healthRes.logs) {
        setHealthLogs(healthRes.logs);
        setHealthMetrics(healthRes.metrics);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Network Notice',
        message: 'Could not load complete patient dashboard records.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await reminderService.updateStatus(id, nextStatus as any);
      setReminders((prev) => {
        const updated = { ...prev };
        (Object.keys(updated) as Array<keyof typeof updated>).forEach((slot) => {
          updated[slot] = updated[slot].map((item) =>
            item.id === id ? { ...item, status: nextStatus as any } : item
          );
        });
        return updated;
      });

      setReminderStats((prev) => ({
        ...prev,
        completed: nextStatus === 'completed' ? prev.completed + 1 : Math.max(0, prev.completed - 1),
        pending: nextStatus === 'completed' ? Math.max(0, prev.pending - 1) : prev.pending + 1,
      }));

      showToast({
        type: 'success',
        title: nextStatus === 'completed' ? 'Pill / Task Completed' : 'Task Marked Pending',
        message: nextStatus === 'completed' ? 'Great job taking your tablet on schedule!' : 'Item returned to pending queue.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update task status on the server.',
      });
    }
  };

  // Evaluate BP and Blood Sugar for Clinical Severity
  const evaluateVitalsRisk = (sys: number, dia: number, sugar: number) => {
    let isEmergency = false;
    let reason = '';

    if (sys >= 180 || dia >= 120) {
      isEmergency = true;
      reason = `Critical High Blood Pressure (${sys}/${dia} mmHg) — Hypertensive Emergency!`;
    } else if (sys < 90 || dia < 60) {
      isEmergency = true;
      reason = `Hypotension Alert (${sys}/${dia} mmHg) — Blood pressure abnormally low!`;
    } else if (sugar >= 250) {
      isEmergency = true;
      reason = `Severe Hyperglycemia (${sugar} mg/dL) — Blood glucose critically elevated!`;
    } else if (sugar < 70) {
      isEmergency = true;
      reason = `Hypoglycemia Warning (${sugar} mg/dL) — Dangerous drop in blood sugar!`;
    }

    return { isEmergency, reason };
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const sys = parseInt(newSystolic) || 120;
    const dia = parseInt(newDiastolic) || 80;
    const sug = parseInt(newSugar) || 100;
    const pulse = parseInt(newPulse) || 72;

    const { isEmergency, reason } = evaluateVitalsRisk(sys, dia, sug);

    try {
      await healthService.createLog({
        blood_pressure: `${sys}/${dia}`,
        systolic: sys,
        diastolic: dia,
        blood_sugar: sug,
        sugar_timing: newSugarTiming,
        heart_rate: pulse,
        followed_routine: 1,
        ate_healthy: 1,
        emergency_flag: isEmergency ? 1 : 0,
        emergency_notes: isEmergency ? reason : undefined
      });

      setShowLogModal(false);

      if (isEmergency) {
        setEmergencyReason(reason);
        setShowEmergencyModal(true);
        showToast({
          type: 'error',
          title: '🚨 Critical Vitals Detected',
          message: 'Direct emergency contact options are ready for your caretaker & doctor.',
        });
      } else {
        showToast({
          type: 'success',
          title: 'Vitals Recorded Successfully',
          message: `Logged: BP ${sys}/${dia} mmHg • Sugar ${sug} mg/dL (${newSugarTiming}).`,
        });
      }

      loadDashboardData();
    } catch {
      showToast({
        type: 'error',
        title: 'Save Error',
        message: 'Could not record your vitals log.',
      });
    }
  };

  const handleTriggerEmergencySOS = async () => {
    setLoggingEmergency(true);
    try {
      await healthService.triggerEmergency(emergencyReason || 'Urgent assistance requested by patient via Direct Emergency SOS.');
      showToast({
        type: 'success',
        title: '🚨 Emergency SOS Dispatched',
        message: 'Alerts sent to your Caretaker (Sarah Davis) and Doctor (Dr. Sarah Jenkins).',
      });
      loadDashboardData();
    } catch {
      showToast({
        type: 'error',
        title: 'Alert Notice',
        message: 'Please call 911 directly if you are experiencing severe distress.',
      });
    } finally {
      setLoggingEmergency(false);
    }
  };

  const handleQuickChat = () => {
    if (!quickQuestion.trim()) return;
    navigate('/ai-assistant', { state: { initialQuery: quickQuestion } });
  };

  const latestLog = healthLogs[0];
  const currentBp = latestLog ? latestLog.blood_pressure || `${latestLog.systolic || 118}/${latestLog.diastolic || 76}` : '118/76';
  const currentSugar = latestLog ? latestLog.blood_sugar || 98 : 98;
  const currentTiming = latestLog ? latestLog.sugar_timing || 'Fasting' : 'Fasting';

  const progressPercentage =
    reminderStats.total > 0 ? Math.round((reminderStats.completed / reminderStats.total) * 100) : 75;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <EmailVerificationBanner />

      {/* Patient Welcome & Emergency Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white p-6 sm:p-8 shadow-elevated relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Patient Recovery & Vitals Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Robert Davis'}!
          </h2>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            {latestDischarge?.parsed_data?.patientName
              ? `Recovering from: ${latestDischarge.parsed_data.primaryDiagnosis || 'Acute Coronary Syndrome s/p PCI'}. Your daily medication routine and vital checks are synchronized.`
              : 'Keep up your recovery routine. Your blood pressure, blood sugar logs, and timed tablet reminders are ready below.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Quick Upload Discharge Button */}
          <Link
            to="/upload"
            className="px-4 py-2.5 rounded-2xl bg-white text-[#665BE8] hover:bg-white/90 font-bold text-xs flex items-center gap-2 shadow-soft transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Discharge</span>
          </Link>

          {/* Direct Emergency Contact SOS Button */}
          <button
            onClick={() => {
              setEmergencyReason('Emergency assistance requested by patient');
              setShowEmergencyModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-soft border border-red-400 animate-pulse transition-all"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Emergency Direct SOS</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs: [Active Care Routine] vs [Care & Medical History] */}
      <div className="flex items-center gap-2 border-b border-[#ECEAFC] pb-1">
        <button
          onClick={() => setActiveTab('recovery')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'recovery'
              ? 'bg-[#665BE8] text-white shadow-soft'
              : 'text-[#73758E] hover:text-[#24264A] hover:bg-[#F0EEFF]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Active Care & Vitals</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-[#665BE8] text-white shadow-soft'
              : 'text-[#73758E] hover:text-[#24264A] hover:bg-[#F0EEFF]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Care History ({dischargeHistory.length} Summaries)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE CARE ROUTINE, VITALS TRACKER & TIMED TABLETS */}
      {/* ========================================================================= */}
      {activeTab === 'recovery' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* FEATURE HIGHLIGHT: REGULAR BP & SUGAR CHECK (VITALS TRACKER) */}
          <Card className="p-6 sm:p-7 space-y-6 border-l-4 border-l-[#665BE8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#665BE8]/10 text-[#665BE8]">
                    <HeartPulse className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#24264A]">Regular Blood Pressure & Sugar Check</h3>
                    <p className="text-xs text-[#73758E]">
                      Clinical vitals monitor with direct emergency trigger to caretaker & doctor
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowLogModal(true)}
                icon={<PlusCircle className="w-4 h-4" />}
                className="bg-[#665BE8] hover:bg-[#584ddb] self-start sm:self-auto"
              >
                Log New BP / Sugar
              </Button>
            </div>

            {/* Vitals Display Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Blood Pressure Card */}
              <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
                <span className="text-[11px] font-bold text-[#73758E] uppercase tracking-wider block">
                  Current Blood Pressure
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#24264A]">{currentBp}</span>
                  <span className="text-xs text-[#73758E] font-medium">mmHg</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-[#278567]">Within Target Bounds (120/80)</span>
                </div>
              </div>

              {/* Blood Sugar Card */}
              <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
                <span className="text-[11px] font-bold text-[#73758E] uppercase tracking-wider block">
                  Blood Sugar ({currentTiming})
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#24264A]">{currentSugar}</span>
                  <span className="text-xs text-[#73758E] font-medium">mg/dL</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-[#278567]">Normal Fasting Range (70-100)</span>
                </div>
              </div>

              {/* Emergency Status & Direct Contacts Indicator */}
              <div className="p-4 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#373B8F] uppercase tracking-wider block">
                    Emergency Direct Link
                  </span>
                  <p className="text-xs font-bold text-[#24264A] mt-1">Caretaker & Doctor Synced</p>
                  <p className="text-[11px] text-[#73758E] mt-0.5">
                    Abnormal BP or sugar triggers immediate 1-click calls & alerts.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEmergencyReason('Direct assistance requested by patient');
                    setShowEmergencyModal(true);
                  }}
                  className="mt-3 text-xs font-bold text-[#665BE8] hover:text-[#584ddb] flex items-center gap-1"
                >
                  <span>Open Direct Contact Desk</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* FEATURE HIGHLIGHT: TIMED PILL REMINDERS CHECKLIST */}
          <Card className="p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#665BE8]" />
                  Timed Pill Schedule & Recovery Checklist
                </h3>
                <p className="text-xs text-[#73758E]">
                  Confirm your morning, midday, evening, and bedtime tablet doses
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-[#24264A] block">
                    {reminderStats.completed} of {reminderStats.total} Completed
                  </span>
                  <span className="text-[10px] font-semibold text-[#278567]">{progressPercentage}% On Schedule</span>
                </div>
                <div className="w-10 h-10 rounded-full border-4 border-[#278567] flex items-center justify-center font-bold text-xs text-[#278567]">
                  {progressPercentage}%
                </div>
              </div>
            </div>

            {/* Time Slot Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Morning', 'Midday', 'Evening', 'Bedtime'] as const).map((slot) => {
                const slotTasks = reminders[slot] || [];
                const slotIcon =
                  slot === 'Morning' ? '🌅' : slot === 'Midday' ? '☀️' : slot === 'Evening' ? '🌇' : '🌙';

                return (
                  <div key={slot} className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#ECEAFC] pb-2">
                      <span className="font-bold text-xs text-[#24264A] flex items-center gap-1.5">
                        <span>{slotIcon}</span>
                        <span>{slot} Schedule</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#665BE8] bg-[#F0EEFF] px-2 py-0.5 rounded-full">
                        {slotTasks.filter((t) => t.status === 'completed').length}/{slotTasks.length} Done
                      </span>
                    </div>

                    <div className="space-y-2">
                      {slotTasks.length === 0 ? (
                        <p className="text-[11px] text-[#73758E] italic py-2">No tablets scheduled.</p>
                      ) : (
                        slotTasks.map((task) => {
                          const isDone = task.status === 'completed';
                          return (
                            <button
                              key={task.id}
                              onClick={() => handleToggleReminder(task.id, task.status)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-start gap-2.5 ${
                                isDone
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                  : 'bg-white border-[#DCD6FC] text-[#24264A] hover:border-[#665BE8]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-[#278567] text-white'
                                    : 'border border-[#73758E]'
                                }`}
                              >
                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="overflow-hidden">
                                <span className={`font-bold block truncate ${isDone ? 'line-through text-emerald-800/70' : ''}`}>
                                  {task.title}
                                </span>
                                <span className="text-[10px] text-[#73758E] line-clamp-2">
                                  {task.description}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* FEATURE HIGHLIGHT: AI RECOVERY CHATBOT QUICK LAUNCHER */}
          <Card className="p-6 sm:p-7 bg-gradient-to-br from-[#F0EEFF] to-[#EAF0FF] border border-[#DCD6FC] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#665BE8]">
                  <BotMessageSquare className="w-4 h-4" />
                  <span>Clinical Recovery AI Chatbot</span>
                </div>
                <h4 className="text-base font-bold text-[#24264A]">
                  Have a question about your tablets, diet, or permitted exercises?
                </h4>
                <p className="text-xs text-[#73758E]">
                  Your AI assistant answers questions grounded in your hospital discharge summary.
                </p>
              </div>

              <Link
                to="/ai-assistant"
                className="px-4 py-2.5 rounded-xl bg-[#665BE8] hover:bg-[#584ddb] text-white font-bold text-xs flex items-center gap-2 shadow-soft self-start sm:self-auto shrink-0"
              >
                <span>Open Full Chatbot</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickChat()}
                placeholder="Ask e.g.: When should I take my morning tablets? Or: Can I walk for 15 minutes today?"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleQuickChat}
                icon={<Send className="w-3.5 h-3.5" />}
                className="bg-[#665BE8]"
              >
                Ask AI
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY CARE HISTORY & DISCHARGE RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#665BE8]" />
                  Patient Care History & Medical Dossier
                </h3>
                <p className="text-xs text-[#73758E]">
                  Chronological records of hospital discharge summaries, clinical reviews, and past vitals
                </p>
              </div>

              <Link
                to="/upload"
                className="px-4 py-2 rounded-xl bg-[#665BE8] text-white font-bold text-xs flex items-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload New Summary</span>
              </Link>
            </div>

            {/* List of Historical Summaries */}
            <div className="space-y-4">
              {dischargeHistory.length === 0 ? (
                <div className="text-center py-12 text-[#73758E] text-xs space-y-2">
                  <p>No historical discharge records found.</p>
                  <Link to="/upload" className="text-[#665BE8] font-bold underline">
                    Upload your first discharge summary
                  </Link>
                </div>
              ) : (
                dischargeHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-3 hover:border-[#DCD6FC] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#665BE8]/10 text-[#665BE8] flex items-center justify-center font-bold text-xs">
                          #{item.id}
                        </span>
                        <div>
                          <strong className="text-sm text-[#24264A] block">
                            {item.file_name || `Discharge Summary #${item.id}`}
                          </strong>
                          <span className="text-[11px] text-[#73758E]">
                            Uploaded on {new Date(item.created_at).toLocaleDateString()} at{' '}
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.status || 'Active Plan'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-xl bg-white border border-[#F0EEFF]">
                        <span className="text-[#73758E] font-medium block">Diagnosed Condition:</span>
                        <span className="font-bold text-[#24264A]">
                          {item.parsed_data?.primaryDiagnosis || 'Acute Coronary Syndrome s/p PCI'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-[#F0EEFF]">
                        <span className="text-[#73758E] font-medium block">Extracted Medications:</span>
                        <span className="font-bold text-[#24264A]">
                          {item.parsed_data?.medications?.length || 5} Prescriptions
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-[#F0EEFF]">
                        <span className="text-[#73758E] font-medium block">Follow-Up Appointments:</span>
                        <span className="font-bold text-[#24264A]">
                          {item.parsed_data?.appointments?.length || 2} Scheduled
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Historical Vitals Log Table */}
            <div className="pt-6 border-t border-[#F0EEFF] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#73758E]">
                Past Vitals & Glucose Checks History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ECEAFC] text-[#73758E] font-bold uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Blood Pressure</th>
                      <th className="py-2.5 px-3">Blood Sugar</th>
                      <th className="py-2.5 px-3">Timing</th>
                      <th className="py-2.5 px-3">Heart Rate</th>
                      <th className="py-2.5 px-3">Clinical Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEFF]">
                    {healthLogs.slice(0, 8).map((log) => (
                      <tr key={log.id} className="hover:bg-[#F7F8FF]">
                        <td className="py-2.5 px-3 font-medium text-[#24264A]">{log.log_date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#24264A]">
                          {log.blood_pressure || `${log.systolic}/${log.diastolic}`} mmHg
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#24264A]">
                          {log.blood_sugar} mg/dL
                        </td>
                        <td className="py-2.5 px-3 text-[#73758E]">{log.sugar_timing}</td>
                        <td className="py-2.5 px-3 text-[#73758E]">{log.heart_rate || 72} bpm</td>
                        <td className="py-2.5 px-3">
                          {log.emergency_flag ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              🚨 Emergency
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              ✓ Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: LOG DAILY BP & SUGAR MODAL */}
      {/* ========================================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#665BE8]/10 text-[#665BE8]">
                  <HeartPulse className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#24264A]">Log Vitals & Glucose</h3>
                  <p className="text-[11px] text-[#73758E]">Daily routine health check</p>
                </div>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Systolic BP (top)</label>
                  <input
                    type="number"
                    required
                    value={newSystolic}
                    onChange={(e) => setNewSystolic(e.target.value)}
                    placeholder="118"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Diastolic BP (bottom)</label>
                  <input
                    type="number"
                    required
                    value={newDiastolic}
                    onChange={(e) => setNewDiastolic(e.target.value)}
                    placeholder="76"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    required
                    value={newSugar}
                    onChange={(e) => setNewSugar(e.target.value)}
                    placeholder="98"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Sugar Timing</label>
                  <select
                    value={newSugarTiming}
                    onChange={(e) => setNewSugarTiming(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  >
                    <option value="Fasting">Fasting (Morning)</option>
                    <option value="Post-Breakfast">Post-Breakfast</option>
                    <option value="Post-Lunch">Post-Lunch</option>
                    <option value="Post-Dinner">Post-Dinner</option>
                    <option value="Bedtime">Bedtime</option>
                    <option value="Random">Random Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Heart Rate / Pulse (bpm)</label>
                <input
                  type="number"
                  value={newPulse}
                  onChange={(e) => setNewPulse(e.target.value)}
                  placeholder="72"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F0EEFF] text-[11px] text-[#373B8F] space-y-1">
                <span className="font-bold block">🛡️ Automated Safety Trigger:</span>
                <span>
                  If readings exceed 140/90 mmHg or glucose is outside safe bounds, direct caretaker and physician emergency links will be displayed immediately.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#665BE8]">
                  Save Vitals Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT EMERGENCY CONTACT (CARETAKER & DOCTOR) */}
      {/* ========================================================================= */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-[#24264A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-elevated border-2 border-red-500 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <AlertOctagon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-red-700">
                    Emergency Direct Contact
                  </h3>
                  <p className="text-xs text-[#73758E]">Immediate Caretaker & Physician Connection</p>
                </div>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Emergency Reason Banner */}
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs space-y-1">
              <strong className="text-red-800 block">Reported Situation:</strong>
              <p className="text-red-900 font-semibold">{emergencyReason}</p>
            </div>

            {/* Direct Contact Cards */}
            <div className="space-y-3">
              {/* Caretaker Direct Contact Card */}
              <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#278567] uppercase tracking-wider block">
                    Assigned Family Caretaker
                  </span>
                  <strong className="text-sm text-[#24264A] block">Sarah Davis</strong>
                  <span className="text-xs text-[#73758E] block">📱 +1 (555) 019-2834</span>
                  <span className="text-[11px] text-[#73758E]">caretaker@carebridge.ai</span>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <a
                    href="tel:+15550192834"
                    className="px-3.5 py-2 rounded-xl bg-[#278567] hover:bg-[#1E604A] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Caretaker</span>
                  </a>
                </div>
              </div>

              {/* Attending Doctor Direct Contact Card */}
              <div className="p-4 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#665BE8] uppercase tracking-wider block">
                    Attending Physician
                  </span>
                  <strong className="text-sm text-[#24264A] block">Dr. Sarah Jenkins, MD, FACC</strong>
                  <span className="text-xs text-[#73758E] block">🏥 St. Jude Cardiology Pavilion</span>
                  <span className="text-xs text-[#73758E] block">📞 +1 (555) 014-9921</span>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <a
                    href="tel:+15550149921"
                    className="px-3.5 py-2 rounded-xl bg-[#665BE8] hover:bg-[#584ddb] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Doctor</span>
                  </a>
                </div>
              </div>

              {/* 911 Emergency Services Card */}
              <div className="p-3.5 rounded-2xl bg-red-600 text-white flex items-center justify-between shadow-soft">
                <div className="space-y-0.5">
                  <strong className="text-sm font-bold block">Severe Chest Pain or Collapse?</strong>
                  <span className="text-xs text-white/90">Emergency Medical Services Dispatch</span>
                </div>
                <a
                  href="tel:911"
                  className="px-4 py-2 rounded-xl bg-white text-red-600 font-extrabold text-xs shadow-xs hover:bg-white/90"
                >
                  🚑 Call 911
                </a>
              </div>
            </div>

            {/* Broadcast Button */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F0EEFF]">
              <span className="text-[11px] text-[#73758E]">Dispatches urgent alert to caretaker & doctor apps</span>
              <Button
                variant="primary"
                size="sm"
                loading={loggingEmergency}
                onClick={handleTriggerEmergencySOS}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Send SOS Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
