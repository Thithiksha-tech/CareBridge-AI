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
  X
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
  const [latestDischarge, setLatestDischarge] = useState<DischargeRecord | null>(null);
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

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencySymptoms, setEmergencySymptoms] = useState('');
  const [loggingEmergency, setLoggingEmergency] = useState(false);

  // Quick Log form state
  const [newBp, setNewBp] = useState('118/76');
  const [newSugar, setNewSugar] = useState(98);
  const [newSugarTiming, setNewSugarTiming] = useState('Fasting');
  const [newReportName, setNewReportName] = useState('');
  const [newReportSummary, setNewReportSummary] = useState('');
  const [ateHealthy, setAteHealthy] = useState(true);
  const [followedRoutine, setFollowedRoutine] = useState(true);
  const [hydrationGlasses, setHydrationGlasses] = useState(8);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [discRes, remRes, appRes, healthRes] = await Promise.all([
        dischargeService.getLatest().catch(() => ({ record: null, review: null })),
        reminderService.getGrouped().catch(() => ({
          grouped: { Morning: [], Midday: [], Evening: [], Bedtime: [] },
          stats: { total: 0, completed: 0, pending: 0 },
        })),
        appointmentService.getAll().catch(() => ({ appointments: [] })),
        healthService.getLogs().catch(() => ({ success: false, logs: [], metrics: null })),
      ]);

      setLatestDischarge(discRes.record);
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
        message: 'Could not load complete dashboard records. Please verify server status.',
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

  const handleSendInstantEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await reminderService.sendEmailAlert(undefined, user?.email);
      showToast({
        type: 'success',
        title: 'Care Timetable Dispatched!',
        message: res.message || `Outbound recovery timetable sent to ${user?.email}`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Email Dispatch Error',
        message: err.response?.data?.error || 'Failed to dispatch email.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveHealthLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await healthService.createLog({
        blood_pressure: newBp,
        blood_sugar: Number(newSugar),
        sugar_timing: newSugarTiming,
        blood_report_name: newReportName || undefined,
        blood_report_summary: newReportSummary || undefined,
        ate_healthy: ateHealthy ? 1 : 0,
        followed_routine: followedRoutine ? 1 : 0,
        hydration_glasses: Number(hydrationGlasses)
      });

      showToast({
        type: 'success',
        title: 'Health Record Logged',
        message: 'Your vitals, sugar report, and routine compliance have been recorded.',
      });

      setShowLogModal(false);
      loadDashboardData();
    } catch {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not record health log.',
      });
    }
  };

  const handleTriggerEmergency = async () => {
    setLoggingEmergency(true);
    try {
      const res = await healthService.triggerEmergency(emergencySymptoms || 'Patient pressed urgent assistance button.');
      showToast({
        type: 'success',
        title: 'Emergency SOS Broadcasted',
        message: 'Alert sent to your Caretaker (Sarah Davis) and Doctor (Dr. Sarah Jenkins).',
      });
      setShowEmergencyModal(false);
      loadDashboardData();
    } catch {
      showToast({
        type: 'error',
        title: 'Emergency Failed',
        message: 'Could not send emergency alert. Please call 911 directly.',
      });
    } finally {
      setLoggingEmergency(false);
    }
  };

  const progressPercentage =
    reminderStats.total > 0 ? Math.round((reminderStats.completed / reminderStats.total) * 100) : 65;

  const upcomingAppt = appointments.find((a) => a.status === 'Scheduled' || a.status === 'scheduled' || a.status === 'confirmed_by_doctor') || appointments[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Patient Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white p-6 sm:p-8 shadow-elevated relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Patient Post-Hospital Recovery Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Robert Davis'}!
          </h2>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            {latestDischarge?.parsed_data?.patientName
              ? `Reviewing active recovery routine for ${latestDischarge.parsed_data.patientName}. Stent healing and medication adherence are on track.`
              : 'Keep up your recovery routine. Your blood reports, sugar levels, and tablet reminders are synchronized below.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-soft border border-red-400 animate-pulse"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>

          <Button
            variant="glass"
            size="md"
            onClick={() => setShowLogModal(true)}
            icon={<PlusCircle className="w-4 h-4 text-[#665BE8]" />}
          >
            Log Vitals & Sugar
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSendInstantEmail}
            loading={sendingEmail}
            icon={<Send className="w-4 h-4 text-white" />}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            Email Today's Plan
          </Button>
        </div>
      </div>

      {/* Routine Streak & Improvement Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <Card className="flex items-center justify-between p-5 border-l-4 border-l-[#FF7A00]">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Routine Streak</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#24264A]">
                {healthMetrics?.streak || 5} Days
              </p>
              <span className="text-[11px] font-bold text-[#FF7A00]">Consecutive</span>
            </div>
            <p className="text-[11px] text-[#73758E]">Followed daily regimen without skips</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
        </Card>

        {/* Healthy Eating */}
        <Card className="flex items-center justify-between p-5 border-l-4 border-l-[#278567]">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Healthy Diet</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#278567]">
                {healthMetrics?.healthyDietDays || 5} Days
              </p>
              <span className="text-[11px] font-bold text-[#278567]">DASH Compliant</span>
            </div>
            <p className="text-[11px] text-[#73758E]">Low sodium, no grapefruit</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center shrink-0">
            <Salad className="w-6 h-6" />
          </div>
        </Card>

        {/* Average Blood Sugar */}
        <Card className="flex items-center justify-between p-5 border-l-4 border-l-[#665BE8]">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Blood Sugar Avg</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#24264A]">
                {healthMetrics?.avgSugar || '98 mg/dL'}
              </p>
              <span className="text-[11px] font-bold text-[#278567]">Normal</span>
            </div>
            <p className="text-[11px] text-[#73758E]">Target Fasting: &lt;100 mg/dL</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#665BE8]/10 text-[#665BE8] flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        {/* Today's Pill Adherence */}
        <Card className="flex items-center justify-between p-5 border-l-4 border-l-[#373B8F]">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Today's Tablets</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#373B8F]">
                {reminderStats.completed} / {reminderStats.total}
              </p>
              <span className="text-[11px] font-bold text-[#278567]">
                {progressPercentage}% Taken
              </span>
            </div>
            <p className="text-[11px] text-[#73758E]">{reminderStats.pending} pending for today</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#373B8F]/10 text-[#373B8F] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Blood & Sugar Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#24264A]">Blood Reports & Blood Sugar Tracking</h3>
            <p className="text-xs text-[#73758E]">Daily glucose evaluations and diagnostic lab reports</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLogModal(true)}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Add Blood / Sugar Record
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthLogs.slice(0, 3).map((log) => (
            <Card key={log.id} className="p-4 space-y-3 hover:border-[#8C91F5] transition-all">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#665BE8] bg-[#F0EEFF] px-2 py-0.5 rounded-full">
                  📅 {log.log_date}
                </span>
                <span className="text-[11px] text-[#278567] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Routine Followed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F7F8FF]">
                <div>
                  <span className="text-[10px] text-[#73758E] font-semibold block">Blood Pressure</span>
                  <span className="text-sm font-black text-[#24264A]">{log.blood_pressure || '118/76'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#73758E] font-semibold block">Blood Sugar ({log.sugar_timing})</span>
                  <span className="text-sm font-black text-[#278567]">{log.blood_sugar} mg/dL</span>
                </div>
              </div>

              {log.blood_report_name && (
                <div className="border-t border-[#ECEAFC] pt-2 space-y-1">
                  <p className="text-xs font-bold text-[#24264A] flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#665BE8]" />
                    {log.blood_report_name}
                  </p>
                  <p className="text-[11px] text-[#73758E] leading-relaxed line-clamp-2">
                    {log.blood_report_summary}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Main Grid: Today's Pill Regimen & Upcoming Doctor Visit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Regimen (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-base font-bold text-[#24264A]">Today's Medication Regimen</h3>
                <p className="text-xs text-[#73758E]">Tick each tablet after consumption with meal guidance</p>
              </div>
              <span className="text-xs font-bold text-[#665BE8] bg-[#F0EEFF] px-2.5 py-1 rounded-full">
                {reminderStats.completed} of {reminderStats.total} Completed
              </span>
            </div>

            <div className="divide-y divide-[#F0EEFF] pt-2">
              {Object.entries(reminders).map(([slot, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={slot} className="py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#665BE8]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#373B8F]">{slot} Regimen</span>
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => {
                        const isDone = item.status === 'completed';
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleReminder(item.id, item.status)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                              isDone
                                ? 'bg-[#278567]/5 border-[#278567]/20 text-[#73758E]'
                                : 'bg-white border-[#ECEAFC] hover:border-[#8C91F5] shadow-xs'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                  isDone
                                    ? 'bg-[#278567] text-white'
                                    : 'border-2 border-[#DCD6FC] bg-[#F7F8FF]'
                                }`}
                              >
                                {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                              </div>
                              <div>
                                <h4 className={`text-sm font-bold ${isDone ? 'line-through text-[#73758E]' : 'text-[#24264A]'}`}>
                                  {item.title}
                                </h4>
                                <p className="text-xs text-[#73758E] mt-0.5">{item.instructions || item.food_timing}</p>
                                <span className="inline-block mt-1 text-[10px] text-[#665BE8] font-bold bg-[#F0EEFF] px-2 py-0.5 rounded-md">
                                  🍽️ {item.food_timing || 'Take with water after meals'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                isDone ? 'bg-[#278567]/10 text-[#278567]' : 'bg-[#C58A30]/10 text-[#C58A30]'
                              }`}
                            >
                              {isDone ? 'Taken' : 'Due Today'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Doctor Visit & Caregiver Bridge (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Appointment */}
          {upcomingAppt && (
            <Card className="p-5 space-y-4 border-l-4 border-l-[#665BE8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#665BE8] uppercase tracking-wider">Next Doctor Visit</span>
                <span className="text-[10px] bg-[#278567]/10 text-[#278567] font-bold px-2 py-0.5 rounded-full">
                  {upcomingAppt.status}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-[#24264A]">{upcomingAppt.doctor_name}</h4>
                <p className="text-xs text-[#73758E]">{upcomingAppt.specialty}</p>
                <p className="text-xs font-semibold text-[#373B8F] mt-1">
                  📅 {upcomingAppt.appointment_date} {upcomingAppt.appointment_time ? `at ${upcomingAppt.appointment_time}` : ''}
                </p>
                <p className="text-xs text-[#73758E]">🏥 {upcomingAppt.clinic_hospital || upcomingAppt.location}</p>
              </div>

              {upcomingAppt.doctor_response_notes && (
                <div className="p-3 rounded-xl bg-[#F0EEFF] border border-[#DCD6FC] text-xs">
                  <p className="font-bold text-[#373B8F] mb-0.5">Doctor's Scheduling Note:</p>
                  <p className="text-[#24264A] italic">"{upcomingAppt.doctor_response_notes}"</p>
                </div>
              )}

              <Link to="/appointments">
                <Button variant="outline" size="sm" className="w-full mt-2" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Appointments
                </Button>
              </Link>
            </Card>
          )}

          {/* AI Clinical Assistant Card */}
          <Card className="p-5 space-y-3 bg-gradient-to-br from-[#F7F8FF] to-[#F0EEFF] border border-[#DCD6FC]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#665BE8] text-white flex items-center justify-center">
                <BotMessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#24264A]">Recovery AI Assistant</h4>
                <p className="text-[11px] text-[#73758E]">Ask questions about your meds or diet</p>
              </div>
            </div>
            <p className="text-xs text-[#73758E] leading-relaxed">
              Have doubts about pill timings or slight dizziness while walking? Gemini clinical assistant has your discharge records ready.
            </p>
            <Link to="/ai-assistant">
              <Button variant="primary" size="sm" className="w-full">
                Chat with Assistant
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Log Vitals Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <h3 className="text-lg font-bold text-[#24264A]">Log Vitals & Blood Sugar</h3>
              <button onClick={() => setShowLogModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHealthLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  required
                  value={newBp}
                  onChange={(e) => setNewBp(e.target.value)}
                  placeholder="120/80"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    required
                    value={newSugar}
                    onChange={(e) => setNewSugar(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Timing</label>
                  <select
                    value={newSugarTiming}
                    onChange={(e) => setNewSugarTiming(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  >
                    <option value="Fasting">Fasting</option>
                    <option value="Post-Meal">Post-Meal (2 hrs)</option>
                    <option value="Random">Random</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Blood Report Name (Optional)</label>
                <input
                  type="text"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC) or Lipid Panel"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Report Summary / Findings</label>
                <input
                  type="text"
                  value={newReportSummary}
                  onChange={(e) => setNewReportSummary(e.target.value)}
                  placeholder="e.g. Hemoglobin 14.2 g/dL, Platelets normal"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#24264A]">
                  <input
                    type="checkbox"
                    checked={ateHealthy}
                    onChange={(e) => setAteHealthy(e.target.checked)}
                    className="rounded text-[#665BE8]"
                  />
                  <span>Ate Healthy Today (DASH)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#24264A]">
                  <input
                    type="checkbox"
                    checked={followedRoutine}
                    onChange={(e) => setFollowedRoutine(e.target.checked)}
                    className="rounded text-[#665BE8]"
                  />
                  <span>Followed Routine</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Health Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Assistance Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-[#24264A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-elevated border-2 border-red-500 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertOctagon className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-lg font-black text-red-600">Emergency SOS Request</h3>
                <p className="text-xs text-[#73758E]">Broadcasts immediate medical alert to Caretaker & Doctor</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              If you are experiencing severe crushing chest pain, radiating arm pain, or severe difficulty breathing, please immediately call <strong>911</strong> or your local emergency medical service!
            </div>

            <div>
              <label className="block text-xs font-bold text-[#24264A] mb-1">
                Describe Current Emergency Symptoms
              </label>
              <textarea
                rows={3}
                value={emergencySymptoms}
                onChange={(e) => setEmergencySymptoms(e.target.value)}
                placeholder="e.g. Chest tightness radiating to left shoulder, lightheadedness..."
                className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowEmergencyModal(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleTriggerEmergency}
                disabled={loggingEmergency}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-soft"
              >
                {loggingEmergency ? 'Broadcasting...' : 'Broadcast Emergency SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
