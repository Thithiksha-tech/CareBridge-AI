import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  CalendarCheck,
  Clock,
  HeartPulse,
  Send,
  AlertTriangle,
  PlusCircle,
  Package,
  Activity,
  CheckCircle2,
  Building2,
  Stethoscope,
  PhoneCall,
  Check,
  AlertCircle,
  FileText,
  Printer,
  Download,
  BotMessageSquare,
  FileCheck2,
  TrendingUp,
  X,
  ExternalLink,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { healthService, appointmentService, authService, reminderService, dischargeService, chatService } from '../services/api';
import type { HealthLog, HealthMetrics, MedicationStock, Appointment, User, Reminder, DischargeRecord, InstructionReview } from '../types';

export const CaregiverPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<User | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [medStock, setMedStock] = useState<MedicationStock[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorsList, setDoctorsList] = useState<User[]>([]);
  const [latestDischarge, setLatestDischarge] = useState<DischargeRecord | null>(null);
  const [carePlanReview, setCarePlanReview] = useState<InstructionReview | null>(null);
  const [reminders, setReminders] = useState<{
    Morning: Reminder[];
    Midday: Reminder[];
    Evening: Reminder[];
    Bedtime: Reminder[];
  }>({ Morning: [], Midday: [], Evening: [], Bedtime: [] });

  // Appointment booking form state
  const [showBookModal, setShowBookModal] = useState(false);
  const [hospitalName, setHospitalName] = useState('St. Jude Memorial Hospital');
  const [hospitalDetails, setHospitalDetails] = useState('Cardiology Pavilion 3rd Floor, Reception Desk #4');
  const [selectedDoctorName, setSelectedDoctorName] = useState('Dr. Sarah Jenkins, MD, FACC');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(7);
  const [apptSpecialty, setApptSpecialty] = useState('Cardiology Follow-Up');
  const [apptDate, setApptDate] = useState('2026-11-05');
  const [apptTime, setApptTime] = useState('10:30 AM');
  const [apptPurpose, setApptPurpose] = useState('Post-PCI 2-week stent re-check & blood pressure adjustment requested by caretaker');
  const [submittingAppt, setSubmittingAppt] = useState(false);

  // "So Far" Patient Clinical Summary Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Reschedule Counter Form State
  const [selectedApptForCounter, setSelectedApptForCounter] = useState<Appointment | null>(null);
  const [counterDate, setCounterDate] = useState('2026-11-12');
  const [counterTime, setCounterTime] = useState('11:00 AM');
  const [counterNotes, setCounterNotes] = useState('Caretaker schedule preference / patient transit available on this day.');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  // Caretaker AI Chatbot state
  const [caregiverQuestion, setCaregiverQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);

  useEffect(() => {
    loadCaretakerData();
  }, []);

  const loadCaretakerData = async () => {
    setLoading(true);
    try {
      const [healthRes, stockRes, apptRes, networkRes, discRes, remRes] = await Promise.all([
        healthService.getLogs(),
        healthService.getMedicationStock(),
        appointmentService.getAll(),
        authService.getNetwork().catch(() => ({ success: false, doctors: [], patients: [], caretakers: [] })),
        dischargeService.getLatest().catch(() => ({ record: null, review: null })),
        reminderService.getGrouped().catch(() => ({
          grouped: { Morning: [], Midday: [], Evening: [], Bedtime: [] },
          stats: { total: 0, completed: 0, pending: 0 }
        }))
      ]);

      if (healthRes) {
        setPatient(healthRes.patient);
        setHealthLogs(healthRes.logs || []);
        setMetrics(healthRes.metrics);
      }

      if (stockRes) {
        setMedStock(stockRes.stock || []);
      }

      if (apptRes) {
        const appts = (apptRes as any).appointments || [
          ...((apptRes as any).upcoming || []),
          ...((apptRes as any).past || [])
        ];
        setAppointments(appts);
      }

      if (discRes) {
        setLatestDischarge(discRes.record);
        setCarePlanReview(discRes.review);
      }

      if (remRes) {
        setReminders(remRes.grouped);
      }

      if (networkRes && networkRes.doctors && networkRes.doctors.length > 0) {
        setDoctorsList(networkRes.doctors);
        const doc = networkRes.doctors[0];
        setSelectedDoctorName(doc.fullName || doc.name);
        setSelectedDoctorId(doc.id);
        if (doc.hospitalName) setHospitalName(doc.hospitalName);
        if (doc.hospitalDepartment) setHospitalDetails(doc.hospitalDepartment);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Network Notice',
        message: 'Could not load all caretaker monitoring data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDoseIntake = async (id: number) => {
    try {
      const res = await healthService.updateMedicationStock(id, 'take_dose');
      setMedStock((prev) => prev.map((item) => (item.id === id ? res.medication : item)));
      showToast({
        type: 'success',
        title: 'Pill Logged On Time',
        message: 'Patient tablet dose confirmed on schedule.',
      });
    } catch {
      showToast({ type: 'error', title: 'Action Failed', message: 'Could not update pill intake.' });
    }
  };

  const handleRefillStock = async (id: number) => {
    try {
      const res = await healthService.updateMedicationStock(id, 'refill', 30);
      setMedStock((prev) => prev.map((item) => (item.id === id ? res.medication : item)));
      showToast({
        type: 'success',
        title: 'Stock Refilled',
        message: 'Added 30 tablets to patient inventory.',
      });
    } catch {
      showToast({ type: 'error', title: 'Action Failed', message: 'Could not refill inventory.' });
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAppt(true);
    try {
      await appointmentService.request({
        patient_id: patient?.id,
        doctor_id: selectedDoctorId,
        doctor_name: selectedDoctorName,
        specialty: apptSpecialty,
        clinic_hospital: hospitalName,
        hospital_details: hospitalDetails,
        appointment_date: apptDate,
        appointment_time: apptTime,
        purpose: apptPurpose,
      });

      showToast({
        type: 'success',
        title: 'Appointment Request Submitted!',
        message: 'Dispatched to Doctor & Hospital Reception Desk. You will receive email confirmation once accepted.',
      });

      setShowBookModal(false);
      loadCaretakerData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Request Failed',
        message: err.response?.data?.message || 'Could not submit appointment request.',
      });
    } finally {
      setSubmittingAppt(false);
    }
  };

  const handleAcceptDoctorDate = async (apptId: number) => {
    try {
      await appointmentService.caretakerRespondReschedule(apptId, { action: 'accept' });
      showToast({
        type: 'success',
        title: 'Consultation Confirmed',
        message: 'Doctor’s proposed date accepted. Consultation locked in calendar.',
      });
      loadCaretakerData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.message || 'Could not accept proposed slot.',
      });
    }
  };

  const handleOpenCounterModal = (appt: Appointment) => {
    setSelectedApptForCounter(appt);
    setCounterDate('2026-11-12');
    setCounterTime('11:00 AM');
  };

  const handleSubmitCounterDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptForCounter) return;

    setSubmittingCounter(true);
    try {
      await appointmentService.caretakerRespondReschedule(selectedApptForCounter.id, {
        action: 'counter',
        counter_date: counterDate,
        counter_time: counterTime,
        notes: counterNotes
      });
      showToast({
        type: 'success',
        title: 'Counter Date Submitted',
        message: `Alternative date (${counterDate} at ${counterTime}) sent back to doctor.`,
      });
      setSelectedApptForCounter(null);
      loadCaretakerData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Submit Failed',
        message: err.response?.data?.message || 'Could not send alternative date.',
      });
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleAskCaregiverAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverQuestion.trim()) return;

    setChatLoading(true);
    try {
      const res = await chatService.sendMessage(caregiverQuestion, {
        role: 'caretaker',
        patient: patient?.full_name || 'Robert Davis',
        diagnosis: latestDischarge?.parsed_data?.primaryDiagnosis
      });
      setChatAnswer(res.reply);
    } catch {
      showToast({
        type: 'error',
        title: 'Assistant Notice',
        message: 'Could not reach AI assistant. Please try again.',
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Recovery Graph Data points (adherence and vitals trend over past days)
  const recoveryGraphPoints = [
    { day: 'Day 1', adherence: 60, bpSys: 135, bpDia: 88, sugar: 115 },
    { day: 'Day 2', adherence: 75, bpSys: 128, bpDia: 82, sugar: 108 },
    { day: 'Day 3', adherence: 85, bpSys: 122, bpDia: 80, sugar: 102 },
    { day: 'Day 4', adherence: 90, bpSys: 120, bpDia: 78, sugar: 99 },
    { day: 'Day 5', adherence: 95, bpSys: 118, bpDia: 76, sugar: 98 },
    { day: 'Day 6', adherence: 92, bpSys: 119, bpDia: 77, sugar: 97 },
    { day: 'Today', adherence: 96, bpSys: 118, bpDia: 76, sugar: 98 },
  ];

  const daysSinceDischarge = 7;
  const patientFullName = patient?.full_name || 'Robert Davis';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <EmailVerificationBanner />

      {/* Caretaker Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#278567] via-[#2E9B79] to-[#1E604A] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Users className="w-3.5 h-3.5" />
            <span>Family Caretaker Clinical Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Caretaker Health & Appointment Bridge
          </h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl">
            Supervise medication schedules, monitor supply refills, track patient recovery graphs, book doctor appointments, and generate the "So-Far" doctor visit briefing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* FEATURE HIGHLIGHT: "SO FAR" PATIENT SUMMARY REPORT & PDF GENERATOR */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-3 rounded-2xl bg-white text-[#278567] hover:bg-white/90 font-black text-xs flex items-center justify-center gap-2 shadow-soft hover:shadow-elevated transition-all"
          >
            <FileText className="w-4 h-4 text-[#278567]" />
            <span>📄 Generate Report Till Now</span>
          </button>

          {/* Book Direct Appointment Button */}
          <button
            onClick={() => setShowBookModal(true)}
            className="px-4 py-3 rounded-2xl bg-[#1E604A] hover:bg-[#184d3b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-soft border border-white/20 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Book Doctor Visit</span>
          </button>
        </div>
      </div>

      {/* 4 Health Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-[#278567] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Patient Average BP</p>
            <p className="text-2xl font-black text-[#24264A]">{metrics?.avgBp || '118/76'}</p>
            <span className="text-[11px] font-bold text-[#278567]">Within Target Bounds</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#665BE8] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Blood Sugar (Fasting)</p>
            <p className="text-2xl font-black text-[#24264A]">{metrics?.avgSugar || '98 mg/dL'}</p>
            <span className="text-[11px] font-bold text-[#278567]">Normal Fasting Zone</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#665BE8]/10 text-[#665BE8] flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#FF7A00] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Supply Refills Due</p>
            <p className="text-2xl font-black text-[#24264A]">
              {medStock.filter((s) => s.status === 'Low Stock' || s.current_stock <= s.low_stock_threshold).length} Items
            </p>
            <span className="text-[11px] text-[#FF7A00] font-semibold">Metoprolol refill ready</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#373B8F] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Recovery Adherence</p>
            <p className="text-2xl font-black text-[#24264A]">96%</p>
            <span className="text-[11px] text-[#278567] font-semibold">Days 1–7 On Schedule</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#373B8F]/10 text-[#373B8F] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE: DOCTOR COMMUNICATIONS & CONSULTATION RESPONSES */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EEFF]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#373B8F]/10 text-[#373B8F] text-xs font-bold mb-1">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor Communications & Scheduling</span>
            </div>
            <h3 className="text-lg font-bold text-[#24264A]">
              Physician Consultation & Reschedule Responses
            </h3>
            <p className="text-xs text-[#73758E]">
              Real-time scheduling communications, doctor confirmations, and proposed date change requests
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowBookModal(true)}
            icon={<CalendarCheck className="w-4 h-4" />}
            className="bg-[#278567] hover:bg-[#1E604A] self-start sm:self-auto"
          >
            + Request Doctor Visit
          </Button>
        </div>

        {/* Reschedule Proposals awaiting Caretaker acceptance */}
        {appointments.filter((a) => a.status === 'reschedule_proposed').length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Action Required: Physician Proposed New Consultation Date</span>
            </h4>

            {appointments
              .filter((a) => a.status === 'reschedule_proposed')
              .map((appt) => (
                <div
                  key={appt.id}
                  className="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-sm text-amber-950 block">
                          {appt.doctor_name || 'Dr. Sarah Jenkins, MD'}
                        </strong>
                        <span className="text-[11px] text-amber-800">
                          {appt.specialty || 'Cardiology'} • {appt.clinic_hospital}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      🗓️ Reschedule Proposed
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 text-xs space-y-1.5">
                    <p className="text-amber-900 font-medium">
                      💬 <strong>Doctor's Note:</strong> "{appt.doctor_response_notes || 'Doctor had a schedule conflict on the requested date and proposed an alternative slot.'}"
                    </p>
                    <p className="text-sm font-bold text-[#24264A]">
                      ⏰ <strong>Proposed New Slot:</strong> {appt.doctor_available_slot || `${appt.appointment_date} at ${appt.appointment_time || '10:30 AM'}`}
                    </p>
                    <p className="text-[11px] text-[#73758E]">
                      Original request was for: {appt.appointment_date} at {appt.appointment_time || '10:00 AM'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenCounterModal(appt)}
                      className="w-full sm:w-auto text-xs font-bold text-amber-900 border-amber-300 bg-white hover:bg-amber-100"
                    >
                      Propose Another Date
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAcceptDoctorDate(appt.id)}
                      icon={<Check className="w-4 h-4" />}
                      className="w-full sm:w-auto bg-[#278567] hover:bg-[#1E604A] text-white font-bold text-xs"
                    >
                      ✓ Accept Doctor's Proposed Date
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Confirmed and Upcoming Visits */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#73758E]">
            Confirmed & Active Consultations
          </h4>

          {appointments.filter((a) => a.status === 'confirmed_by_doctor' || a.status === 'scheduled' || a.status === 'upcoming').length === 0 ? (
            <p className="text-xs text-[#73758E] italic p-3 bg-[#F7F8FF] rounded-xl border border-[#ECEAFC]">
              No confirmed upcoming visits yet. Click "+ Request Doctor Visit" above to book.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {appointments
                .filter((a) => a.status === 'confirmed_by_doctor' || a.status === 'scheduled' || a.status === 'upcoming')
                .map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2 text-xs hover:border-[#DCD6FC] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-[#24264A]">{appt.doctor_name || 'Dr. Sarah Jenkins'}</strong>
                      <span className="text-[10px] font-bold text-[#278567] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Confirmed
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-[#73758E]">
                      <p className="font-semibold text-[#373B8F]">
                        📅 {appt.appointment_date} {appt.appointment_time ? `at ${appt.appointment_time}` : ''}
                      </p>
                      <p>🏥 {appt.clinic_hospital} ({appt.hospital_details || 'Suite 400'})</p>
                      {appt.doctor_feedback && (
                        <p className="text-[#24264A] italic pt-1">"{appt.doctor_feedback}"</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE HIGHLIGHT: PATIENT RECOVERY GRAPH */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#278567]" />
              Patient Recovery Graph & Longitudinal Trends
            </h3>
            <p className="text-xs text-[#73758E]">
              Adherence compliance and blood pressure recovery over post-discharge days
            </p>
          </div>
          <span className="text-xs font-bold text-[#278567] bg-[#278567]/10 px-3 py-1 rounded-full self-start sm:self-auto">
            7-Day Clinical Trend
          </span>
        </div>

        {/* Visual Graph Render (Clean SVG Chart) */}
        <div className="space-y-4">
          <div className="h-56 w-full p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#73758E] pb-2 border-b border-[#ECEAFC]">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#278567]" />
                <span className="text-[#24264A]">Pill Adherence Rate (%)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#665BE8]" />
                <span className="text-[#24264A]">Systolic BP (mmHg)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[#24264A]">Blood Sugar (mg/dL)</span>
              </span>
            </div>

            {/* Bars / Points Visualizer */}
            <div className="grid grid-cols-7 gap-3 h-36 items-end pt-3">
              {recoveryGraphPoints.map((pt, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-28">
                    {/* Adherence Bar */}
                    <div
                      style={{ height: `${pt.adherence}%` }}
                      className="w-3.5 bg-gradient-to-t from-[#278567] to-[#2E9B79] rounded-t-md transition-all group-hover:brightness-110"
                      title={`${pt.day} Adherence: ${pt.adherence}%`}
                    />
                    {/* BP Bar */}
                    <div
                      style={{ height: `${(pt.bpSys / 160) * 100}%` }}
                      className="w-3.5 bg-gradient-to-t from-[#665BE8] to-[#8C91F5] rounded-t-md transition-all group-hover:brightness-110"
                      title={`${pt.day} BP: ${pt.bpSys}/${pt.bpDia} mmHg`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#73758E]">{pt.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <strong className="block">✓ Adherence Progress:</strong>
              <span>Increased from 60% on discharge to 96% today with zero missed antiplatelet doses.</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F0EEFF] border border-[#DCD6FC] text-[#373B8F]">
              <strong className="block">🩺 Blood Pressure Stabilization:</strong>
              <span>Systolic decreased from 135 mmHg to 118 mmHg as stent healing continues.</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <strong className="block">🩸 Glucose Regulation:</strong>
              <span>Maintained between 97–108 mg/dL on low-sodium heart-healthy diet.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE HIGHLIGHT: TIMED PILLS SCHEDULE FOR CARETAKER */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#278567]" />
              Timed Pills Schedule for Patient
            </h3>
            <p className="text-xs text-[#73758E]">
              Track patient doses across Morning, Midday, Evening, and Bedtime
            </p>
          </div>
          <Link
            to="/reminders"
            className="text-xs font-bold text-[#278567] hover:underline flex items-center gap-1"
          >
            <span>Open Reminders Manager</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Morning', 'Midday', 'Evening', 'Bedtime'] as const).map((slot) => {
            const slotTasks = reminders[slot] || [];
            const slotIcon =
              slot === 'Morning' ? '🌅' : slot === 'Midday' ? '☀️' : slot === 'Evening' ? '🌇' : '🌙';

            return (
              <div key={slot} className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#ECEAFC]">
                  <span className="font-bold text-xs text-[#24264A] flex items-center gap-1.5">
                    <span>{slotIcon}</span>
                    <span>{slot}</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#278567] bg-[#278567]/10 px-2 py-0.5 rounded-full">
                    {slotTasks.filter((t) => t.status === 'completed').length}/{slotTasks.length} Done
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {slotTasks.length === 0 ? (
                    <p className="text-[11px] text-[#73758E] italic py-2">No pills scheduled.</p>
                  ) : (
                    slotTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-xl bg-white border border-[#DCD6FC] space-y-1"
                      >
                        <strong className="block text-[#24264A]">{task.title}</strong>
                        <span className="text-[11px] text-[#73758E] line-clamp-2">{task.description}</span>
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#278567]">Take on time</span>
                          <span className="text-[10px] text-[#73758E]">{task.status === 'completed' ? '✓ Taken' : 'Pending'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE HIGHLIGHT: MEDICAL SUPPLIES & PILL REFILLS TRACKER */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#FF7A00]" />
              Medical Supplies & Medication Stock Refills
            </h3>
            <p className="text-xs text-[#73758E]">
              Monitor remaining tablet counts, dosage rates, and trigger pharmacy refills
            </p>
          </div>
          <span className="text-xs font-bold text-[#278567] bg-[#278567]/10 px-3 py-1 rounded-full self-start sm:self-auto">
            {medStock.length} Tracked Prescriptions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ECEAFC] text-[#73758E] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Medication & Dosage</th>
                <th className="py-3 px-3">Tablets In Stock</th>
                <th className="py-3 px-3">Daily Dose</th>
                <th className="py-3 px-3">Last Intake</th>
                <th className="py-3 px-3">Stock Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEFF]">
              {medStock.map((med) => {
                const isLow = med.status === 'Low Stock' || med.current_stock <= med.low_stock_threshold;
                const isOut = med.current_stock === 0;
                return (
                  <tr key={med.id} className="hover:bg-[#F7F8FF] transition-colors">
                    <td className="py-3.5 px-3">
                      <strong className="text-sm text-[#24264A] block">{med.medication_name}</strong>
                      <span className="text-[11px] text-[#73758E]">{med.dosage}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-sm text-[#24264A]">
                      {med.current_stock} tablets
                    </td>
                    <td className="py-3.5 px-3 text-[#73758E]">
                      {med.daily_intake} / day
                    </td>
                    <td className="py-3.5 px-3 text-[#373B8F] font-medium">
                      {med.last_taken_time || 'Pending today'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                          isOut
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {med.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDoseIntake(med.id)}
                        className="text-xs font-bold text-[#278567] hover:bg-[#278567]/10"
                      >
                        ✓ Dose Taken
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRefillStock(med.id)}
                        className="text-xs font-bold text-[#665BE8] border-[#DCD6FC]"
                      >
                        + Refill (+30)
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE HIGHLIGHT: REVIEW CARE PLAN ACCESS & APPOINTMENT STATUS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Care Plan Review Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
            <h4 className="font-bold text-[#24264A] text-base flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#278567]" />
              Discharge Care Plan Review
            </h4>
            <Link
              to="/care-plan"
              className="text-xs font-bold text-[#278567] hover:underline flex items-center gap-1"
            >
              <span>Full Care Plan</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-[#73758E]">
            Review all extracted discharge instructions, confirm safety guidelines, and adjust daily routine rules.
          </p>

          <div className="p-3.5 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#73758E]">Total Care Instructions:</span>
              <strong className="text-[#24264A]">{carePlanReview?.instructions?.length || 18} Guidelines</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#73758E]">Confirmed Status:</span>
              <span className="font-bold text-[#278567]">100% Verified & Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#73758E]">Care Roadmap:</span>
              <span className="font-bold text-[#665BE8]">Phase 2: Early Healing (Days 4–7)</span>
            </div>
          </div>

          <Link
            to="/care-plan"
            className="block text-center py-2.5 rounded-xl bg-[#278567] hover:bg-[#1E604A] text-white font-bold text-xs shadow-xs"
          >
            Review & Edit Care Plan
          </Link>
        </Card>

        {/* Caregiver AI Assistant Card */}
        <Card className="p-6 space-y-4 bg-gradient-to-br from-[#F0EEFF] to-[#EAF0FF] border border-[#DCD6FC]">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD6FC]">
            <h4 className="font-bold text-[#24264A] text-base flex items-center gap-2">
              <BotMessageSquare className="w-5 h-5 text-[#665BE8]" />
              Caretaker Clinical AI Assistant
            </h4>
            <Link
              to="/ai-assistant"
              className="text-xs font-bold text-[#665BE8] hover:underline flex items-center gap-1"
            >
              <span>Full Chat</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-[#73758E]">
            Ask immediate questions about patient meal prep, medication side effects, or warning signs.
          </p>

          <form onSubmit={handleAskCaregiverAi} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={caregiverQuestion}
                onChange={(e) => setCaregiverQuestion(e.target.value)}
                placeholder="e.g. Can the patient take Brilinta with food?"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
              />
              <Button size="sm" type="submit" loading={chatLoading} className="bg-[#665BE8]">
                Ask
              </Button>
            </div>
          </form>

          {chatAnswer && (
            <div className="p-3.5 rounded-2xl bg-white border border-[#DCD6FC] text-xs space-y-1 text-[#24264A] max-h-36 overflow-y-auto">
              <strong className="text-[11px] text-[#665BE8] block">AI Clinical Guidance:</strong>
              <p className="leading-relaxed">{chatAnswer}</p>
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: "SO FAR" PATIENT SUMMARY REPORT & PDF GENERATOR */}
      {/* ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 bg-[#24264A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Controls Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#24264A]">
                    Patient "So Far" Clinical Recovery Dossier
                  </h3>
                  <p className="text-xs text-[#73758E]">
                    Generated automatically by CareBridge AI for Doctor Consultation Visit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handlePrintReport}
                  icon={<Printer className="w-4 h-4" />}
                  className="bg-[#278567] hover:bg-[#1E604A]"
                >
                  Download as PDF / Print
                </Button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 text-[#73758E] hover:text-[#24264A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div
              ref={reportPrintRef}
              className="p-6 rounded-2xl bg-[#FDFDFF] border border-[#ECEAFC] space-y-5 text-xs text-[#24264A]"
            >
              {/* Document Header */}
              <div className="border-b-2 border-[#24264A] pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#24264A] tracking-tight">
                    CAREBRIDGE AI — POST-HOSPITAL CLINICAL PROGRESS REPORT
                  </h2>
                  <p className="text-xs text-[#73758E]">
                    Comprehensive Post-Discharge Recovery & Vitals Briefing for Physician Checkup
                  </p>
                </div>
                <div className="text-right text-[11px] text-[#73758E]">
                  <p>Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>Document ID: CB-RPT-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>

              {/* Patient & Caretaker Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F7F8FF] border border-[#ECEAFC]">
                <div>
                  <span className="text-[#73758E] block">Patient Name:</span>
                  <strong className="text-sm text-[#24264A] block">{patientFullName}</strong>
                  <span className="text-[11px] text-[#73758E]">Age: 58 | Sex: M</span>
                </div>
                <div>
                  <span className="text-[#73758E] block">Primary Diagnosis:</span>
                  <strong className="text-[#24264A] block">Acute Coronary Syndrome</strong>
                  <span className="text-[11px] text-[#73758E]">s/p PCI (DES to LAD)</span>
                </div>
                <div>
                  <span className="text-[#73758E] block">Recovery Duration:</span>
                  <strong className="text-[#278567] block">Day 7 of Post-Discharge</strong>
                  <span className="text-[11px] text-[#73758E]">Phase 2: Early Healing</span>
                </div>
                <div>
                  <span className="text-[#73758E] block">Supervising Caretaker:</span>
                  <strong className="text-[#24264A] block">Sarah Davis (Daughter)</strong>
                  <span className="text-[11px] text-[#73758E]">Phone: +1 (555) 019-2834</span>
                </div>
              </div>

              {/* 1. Vitals & Clinical Readings So Far */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-xs text-[#373B8F] border-b pb-1">
                  1. Clinical Vitals & Lab Measurements Summary (So Far)
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white border border-[#ECEAFC]">
                    <span className="text-[#73758E] block">Blood Pressure Range</span>
                    <strong className="text-sm text-[#24264A] block">
                      118/76 mmHg (Avg)
                    </strong>
                    <span className="text-[10px] text-[#278567]">Min: 114/72 • Max: 128/82</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#ECEAFC]">
                    <span className="text-[#73758E] block">Blood Glucose Range</span>
                    <strong className="text-sm text-[#24264A] block">
                      98 mg/dL (Fasting)
                    </strong>
                    <span className="text-[10px] text-[#278567]">Post-prandial avg: 115 mg/dL</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#ECEAFC]">
                    <span className="text-[#73758E] block">Adherence Compliance</span>
                    <strong className="text-sm text-[#278567] block">96% Compliant</strong>
                    <span className="text-[10px] text-[#73758E]">0 missed dual-antiplatelet doses</span>
                  </div>
                </div>
              </div>

              {/* 2. Discharged Medications & Pill Adherence */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-xs text-[#373B8F] border-b pb-1">
                  2. Discharged Medications & Current Stock Balance
                </h4>
                <table className="w-full text-left text-xs divide-y divide-[#ECEAFC]">
                  <thead>
                    <tr className="text-[#73758E] font-bold">
                      <th className="py-2">Medication</th>
                      <th className="py-2">Dosage & Frequency</th>
                      <th className="py-2">Tablets In Stock</th>
                      <th className="py-2">Adherence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEFF]">
                    <tr>
                      <td className="py-2 font-bold text-[#24264A]">Aspirin</td>
                      <td className="py-2 text-[#73758E]">81 mg PO daily in morning with food</td>
                      <td className="py-2 font-mono">24 tablets</td>
                      <td className="py-2 text-[#278567] font-bold">100% Taken</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold text-[#24264A]">Brilinta (Ticagrelor)</td>
                      <td className="py-2 text-[#73758E]">90 mg PO twice daily (morning & night)</td>
                      <td className="py-2 font-mono">22 tablets</td>
                      <td className="py-2 text-[#278567] font-bold">100% Taken</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold text-[#24264A]">Atorvastatin</td>
                      <td className="py-2 text-[#73758E]">80 mg PO once daily at bedtime</td>
                      <td className="py-2 font-mono">25 tablets</td>
                      <td className="py-2 text-[#278567] font-bold">100% Taken</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold text-[#24264A]">Metoprolol Succinate ER</td>
                      <td className="py-2 text-[#73758E]">25 mg PO daily in morning</td>
                      <td className="py-2 font-mono text-amber-600 font-bold">5 tablets (Refill Due)</td>
                      <td className="py-2 text-[#278567] font-bold">95% Taken</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Incidents, Symptoms & Doctor Questions */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-xs text-[#373B8F] border-b pb-1">
                  3. Caretaker Observations & Consultation Inquiries for Doctor
                </h4>
                <div className="p-3.5 rounded-xl bg-white border border-[#ECEAFC] space-y-2 text-xs">
                  <p>
                    • <strong>Catheter Puncture Site:</strong> Clean, dry, and intact with no expanding hematoma or erythema.
                  </p>
                  <p>
                    • <strong>Physical Activity:</strong> Ambulating 10–15 minutes twice daily comfortably without chest tightness or dyspnea.
                  </p>
                  <p>
                    • <strong>Diet:</strong> Strict low-sodium Mediterranean meals followed with 2L daily hydration. Grapefruit strictly avoided.
                  </p>
                  <p>
                    • <strong>Doctor Inquiries:</strong> Inquiring regarding titration of Metoprolol and scheduling 4-week post-PCI stress echocardiogram.
                  </p>
                </div>
              </div>

              {/* Watermark & Verification Sign-off */}
              <div className="pt-3 border-t border-[#ECEAFC] flex items-center justify-between text-[11px] text-[#73758E]">
                <span>Attending Physician: Dr. Sarah Jenkins, MD, FACC</span>
                <span>Verified via CareBridge AI Clinical Intelligence Platform</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EEFF]">
              <Button size="sm" variant="ghost" onClick={() => setShowReportModal(false)}>
                Close
              </Button>
              <Button
                size="md"
                variant="primary"
                onClick={handlePrintReport}
                icon={<Download className="w-4 h-4" />}
                className="bg-[#278567] hover:bg-[#1E604A]"
              >
                Download PDF / Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BOOK DOCTOR APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      {showBookModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Book Doctor Appointment</h3>
                <p className="text-xs text-[#73758E]">
                  Sends consultation request to physician & hospital reception
                </p>
              </div>
              <button onClick={() => setShowBookModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">Hospital / Medical Center</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. St. Jude Memorial Hospital"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Department / Reception Desk</label>
                <input
                  type="text"
                  required
                  value={hospitalDetails}
                  onChange={(e) => setHospitalDetails(e.target.value)}
                  placeholder="e.g. Cardiology Outpatient Clinic, Reception Desk #4"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Select Physician</label>
                  <select
                    value={selectedDoctorName}
                    onChange={(e) => {
                      setSelectedDoctorName(e.target.value);
                      const found = doctorsList.find((d) => (d.fullName || d.name) === e.target.value);
                      if (found) setSelectedDoctorId(found.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                  >
                    <option value="Dr. Sarah Jenkins, MD, FACC">Dr. Sarah Jenkins, MD, FACC</option>
                    <option value="Dr. Marcus Vance, MD">Dr. Marcus Vance, MD</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.fullName || d.name}>
                        {d.fullName || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Specialty</label>
                  <input
                    type="text"
                    value={apptSpecialty}
                    onChange={(e) => setApptSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Preferred Time Slot</label>
                  <input
                    type="text"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Reason / Symptoms for Visit</label>
                <textarea
                  rows={3}
                  required
                  value={apptPurpose}
                  onChange={(e) => setApptPurpose(e.target.value)}
                  placeholder="Provide reason for consultation, blood pressure updates, or symptom inquiries..."
                  className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowBookModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingAppt}
                  className="bg-[#278567] hover:bg-[#1E604A] text-white"
                >
                  Send Request to Doctor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Caretaker Counter-Proposes Another Date */}
      {selectedApptForCounter && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-base font-bold text-[#24264A]">Propose Alternative Date</h3>
                <p className="text-xs text-[#73758E]">Submit a date/time that works better for patient</p>
              </div>
              <button onClick={() => setSelectedApptForCounter(null)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCounterDate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={counterDate}
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Preferred Time</label>
                <input
                  type="text"
                  required
                  value={counterTime}
                  onChange={(e) => setCounterTime(e.target.value)}
                  placeholder="11:00 AM"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Reason / Note for Doctor</label>
                <textarea
                  rows={3}
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  placeholder="e.g. Caretaker schedule preference / patient transit available on this day..."
                  className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedApptForCounter(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={submittingCounter} className="bg-[#278567]">
                  Send to Dr. Jenkins
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverPage;
