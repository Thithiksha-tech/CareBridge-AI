import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CalendarCheck,
  CheckCircle2,
  Clock,
  HeartPulse,
  Send,
  UserCheck,
  Building2,
  Activity,
  FileSpreadsheet,
  AlertCircle,
  MessageSquare,
  Check,
  X,
  AlertOctagon,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  PhoneCall,
  FileText,
  ShieldAlert,
  Bell
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { appointmentService, healthService, dischargeService } from '../services/api';
import type { Appointment, HealthLog, HealthMetrics, User as UserType, DischargeRecord } from '../types';

export const DoctorPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patientLogs, setPatientLogs] = useState<HealthLog[]>([]);
  const [patientMetrics, setPatientMetrics] = useState<HealthMetrics | null>(null);
  const [patientInfo, setPatientInfo] = useState<UserType | null>(null);
  const [latestDischarge, setLatestDischarge] = useState<DischargeRecord | null>(null);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-05');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:30 AM');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictAppointment, setConflictAppointment] = useState<Appointment | null>(null);

  // Response Modal state
  const [selectedRequest, setSelectedRequest] = useState<Appointment | null>(null);
  const [availableSlot, setAvailableSlot] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);

  // View Patient Record Modal
  const [viewingPatientRecord, setViewingPatientRecord] = useState<boolean>(false);
  const [selectedPatientForDossier, setSelectedPatientForDossier] = useState<{
    name: string;
    email?: string;
    phone?: string;
    purpose?: string;
  } | null>(null);

  useEffect(() => {
    loadDoctorWorkspace();
  }, []);

  const loadDoctorWorkspace = async () => {
    setLoading(true);
    try {
      const [reqRes, allApptRes, healthRes, discRes] = await Promise.all([
        appointmentService.getDoctorRequests().catch(() => ({ success: false, requests: [] })),
        appointmentService.getAll().catch(() => ({ appointments: [] })),
        healthService.getLogs().catch(() => ({ success: false, logs: [], metrics: null, patient: null })),
        dischargeService.getLatest().catch(() => ({ record: null, review: null }))
      ]);

      if (reqRes && reqRes.requests) {
        setRequests(reqRes.requests);
      }
      if (allApptRes && allApptRes.appointments) {
        setAllAppointments(allApptRes.appointments);
      }
      if (healthRes) {
        setPatientLogs(healthRes.logs || []);
        setPatientMetrics(healthRes.metrics);
        setPatientInfo(healthRes.patient);
      }
      if (discRes && discRes.record) {
        setLatestDischarge(discRes.record);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Network Notice',
        message: 'Could not load clinical workspace records.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calendar Conflict Checker: When doctor selects a date/time
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    checkForScheduleConflict(dateStr);
  };

  const checkForScheduleConflict = (dateStr: string) => {
    // Check against existing scheduled appointments
    const existing = allAppointments.find((a) => {
      if (!a.appointment_date) return false;
      return (
        a.appointment_date.includes(dateStr) ||
        (dateStr === '2026-11-05' && a.appointment_date.includes('Nov 05')) ||
        (dateStr === '2026-11-12' && a.appointment_date.includes('Nov 12')) ||
        (dateStr === '2026-11-04' && a.appointment_date.includes('Nov 04'))
      );
    });

    if (existing) {
      setConflictAppointment(existing);
      setConflictWarning(
        `You have an appointment on this day already (Booked with ${existing.doctor_name || 'Cardiology follow-up'} - ${existing.purpose || 'Post-PCI Review'}). You can choose another day or another time.`
      );
    } else {
      setConflictAppointment(null);
      setConflictWarning(null);
    }
  };

  const openScheduleModal = (dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    setSelectedDate(targetDate);
    checkForScheduleConflict(targetDate);
    setShowScheduleModal(true);
  };

  const openResponseModal = (req: Appointment) => {
    setSelectedRequest(req);
    const defaultDate = req.appointment_date || '2026-11-05';
    const defaultTime = req.appointment_time || '10:30 AM';
    setAvailableSlot(`${defaultDate} at ${defaultTime} - Cardiology Pavilion Suite 400`);
    setResponseNotes(
      `Confirmed. Dr. Sarah Jenkins is available on ${defaultDate} at ${defaultTime}. You can come and visit me at this time. Please bring home blood pressure and blood sugar logs.`
    );
    // Check if that slot has a conflict
    checkForScheduleConflict(defaultDate);
  };

  const handleSendDoctorResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setResponding(true);
    try {
      await appointmentService.doctorRespond(selectedRequest.id, {
        available_slot: availableSlot,
        response_notes: responseNotes,
      });

      showToast({
        type: 'success',
        title: '3-Way Response Dispatched!',
        message: 'Confirmed slot and visit instructions emailed to Caretaker & Patient.',
      });

      setSelectedRequest(null);
      loadDoctorWorkspace();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Response Failed',
        message: err.response?.data?.message || 'Could not send doctor appointment confirmation.',
      });
    } finally {
      setResponding(false);
    }
  };

  // Open Patient Record Dossier
  const handleViewPatientRecord = (patientName: string, email?: string, phone?: string, purpose?: string) => {
    setSelectedPatientForDossier({ name: patientName, email, phone, purpose });
    setViewingPatientRecord(true);
  };

  // Emergency logs from health_logs (BP/Sugar emergencies or SOS alerts)
  const emergencyLogs = patientLogs.filter((l) => l.emergency_flag === 1);

  // Calendar dates for November 2026 demo view
  const calendarDays = [
    { day: 1, dateStr: '2026-11-01', hasAppt: false },
    { day: 2, dateStr: '2026-11-02', hasAppt: false },
    { day: 3, dateStr: '2026-11-03', hasAppt: false },
    { day: 4, dateStr: '2026-11-04', hasAppt: true, title: 'PCI Follow-Up (Robert Davis)' },
    { day: 5, dateStr: '2026-11-05', hasAppt: true, title: 'Cardiology Check (Robert Davis)' },
    { day: 6, dateStr: '2026-11-06', hasAppt: false },
    { day: 7, dateStr: '2026-11-07', hasAppt: false },
    { day: 8, dateStr: '2026-11-08', hasAppt: false },
    { day: 9, dateStr: '2026-11-09', hasAppt: false },
    { day: 10, dateStr: '2026-11-10', hasAppt: false },
    { day: 11, dateStr: '2026-11-11', hasAppt: false },
    { day: 12, dateStr: '2026-11-12', hasAppt: true, title: 'Primary Care (Dr. Vance)' },
    { day: 13, dateStr: '2026-11-13', hasAppt: false },
    { day: 14, dateStr: '2026-11-14', hasAppt: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <EmailVerificationBanner />

      {/* Doctor Workspace Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#373B8F] via-[#484DAF] to-[#24264A] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Attending Physician Clinical Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dr. Sarah Jenkins, MD, FACC
          </h2>
          <p className="text-xs sm:text-sm text-white/85 max-w-xl">
            St. Jude Memorial Hospital • Cardiology Pavilion. Manage consultation requests, monitor patient emergency alerts, check schedule conflicts, and review patient clinical records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs shrink-0 space-y-1">
            <span className="font-bold block text-white/90">Hospital Facility:</span>
            <span className="font-extrabold text-sm text-white block">St. Jude Memorial Hospital</span>
            <span className="text-[11px] text-white/80">Cardiology Pavilion Suite 400</span>
          </div>
        </div>
      </div>

      {/* 4 Clinical Workspace Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-[#373B8F] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Caretaker Requests</p>
            <p className="text-2xl font-black text-[#24264A]">{requests.length} In Queue</p>
            <span className="text-[11px] text-[#665BE8] font-bold">Awaiting confirmation</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#373B8F]/10 text-[#373B8F] flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-red-500 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Emergency Alerts</p>
            <p className="text-2xl font-black text-red-600">{emergencyLogs.length} Flagged</p>
            <span className="text-[11px] text-red-700 font-bold">BP / Sugar Critical</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center animate-pulse">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#278567] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Confirmed Visits</p>
            <p className="text-2xl font-black text-[#24264A]">2 Scheduled</p>
            <span className="text-[11px] text-[#278567] font-semibold">Calendar synced</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#665BE8] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Patient Avg BP</p>
            <p className="text-2xl font-black text-[#24264A]">{patientMetrics?.avgBp || '118/76'}</p>
            <span className="text-[11px] text-[#278567] font-semibold">Optimal recovery</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#665BE8]/10 text-[#665BE8] flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: NOTIFICATIONS (APPOINTMENTS REQUESTED & PATIENT EMERGENCIES) */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#373B8F]" />
              Doctor Notifications & Urgent Triage Center
            </h3>
            <p className="text-xs text-[#73758E]">
              Requested appointments from caretakers & direct emergency alerts from patients
            </p>
          </div>
          <span className="text-xs font-bold text-[#373B8F] bg-[#F0EEFF] px-3 py-1 rounded-full self-start sm:self-auto">
            {requests.length + emergencyLogs.length} Active Notifications
          </span>
        </div>

        {/* Section A: Critical Patient Emergency Alerts (High Priority) */}
        {emergencyLogs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
              <span>Direct Emergency Patient Alerts ({emergencyLogs.length})</span>
            </h4>

            <div className="space-y-3">
              {emergencyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white">
                        CRITICAL VITALS SOS
                      </span>
                      <span className="text-xs font-bold text-[#24264A]">
                        Patient: {patientInfo?.full_name || 'Robert Davis'}
                      </span>
                      <span className="text-[11px] text-[#73758E]">Date: {log.log_date}</span>
                    </div>
                    <p className="text-xs font-bold text-red-800">
                      🚨 {log.emergency_notes || 'Critical blood pressure or glucose spike reported.'}
                    </p>
                    <p className="text-[11px] text-[#73758E]">
                      Logged Vitals: BP {log.blood_pressure || `${log.systolic}/${log.diastolic}`} mmHg • Glucose {log.blood_sugar} mg/dL ({log.sugar_timing})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewPatientRecord('Robert Davis', 'robert@testbridge.com', '+1 (555) 019-2834', log.emergency_notes || 'Critical Vitals')}
                      className="text-xs font-bold text-[#373B8F] border-[#DCD6FC] bg-white"
                    >
                      View Patient Record
                    </Button>
                    <a
                      href="tel:+15550192834"
                      className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Patient</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section B: Caretaker Appointment Requests */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#73758E] flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#373B8F]" />
            <span>Consultation Requests from Caretakers ({requests.length})</span>
          </h4>

          {requests.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#73758E] bg-[#F7F8FF] rounded-2xl">
              No pending appointment requests in your clinical queue.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => {
                const isConfirmed = req.status === 'confirmed_by_doctor';
                return (
                  <Card
                    key={req.id}
                    className={`p-5 space-y-4 border-l-4 transition-all ${
                      isConfirmed ? 'border-l-[#278567]' : 'border-l-[#373B8F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#24264A] block">
                          Patient: {req.patient_name || 'Robert Davis'}
                        </span>
                        <span className="text-[11px] text-[#73758E]">
                          Requested by Caretaker: <strong>{req.requested_by_name || 'Sarah Davis'}</strong>
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                          isConfirmed ? 'bg-[#278567]/15 text-[#278567]' : 'bg-[#373B8F]/15 text-[#373B8F]'
                        }`}
                      >
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F7F8FF] space-y-1 text-xs">
                      <p className="text-[#373B8F] font-semibold">
                        🏥 <strong>Clinic / Desk:</strong> {req.clinic_hospital} ({req.hospital_details || 'Cardiology Pavilion'})
                      </p>
                      <p className="text-[#24264A] font-semibold">
                        📅 <strong>Requested Date & Time:</strong> {req.appointment_date} at {req.appointment_time || '10:30 AM'}
                      </p>
                      <p className="text-[#73758E]">
                        📝 <strong>Reason / Symptoms:</strong> {req.purpose}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {/* View Patient Record Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleViewPatientRecord(
                            req.patient_name || 'Robert Davis',
                            req.patient_email || 'patient@testbridge.com',
                            req.patient_phone || '+1 (555) 019-2834',
                            req.purpose
                          )
                        }
                        icon={<FileText className="w-3.5 h-3.5" />}
                        className="text-xs font-bold text-[#373B8F] border-[#DCD6FC] flex-1"
                      >
                        View Patient Record
                      </Button>

                      {isConfirmed ? (
                        <span className="text-xs font-bold text-[#278567] bg-[#278567]/10 px-3 py-1.5 rounded-xl">
                          ✓ Slot Confirmed
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openResponseModal(req)}
                          icon={<MessageSquare className="w-3.5 h-3.5" />}
                          className="bg-[#373B8F] flex-1"
                        >
                          Respond & Confirm
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE 2: CALENDAR WITH SCHEDULE CONFLICT / DOUBLE-BOOKING WARNING */}
      {/* ========================================================================= */}
      <Card className="p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#373B8F]" />
              Doctor Schedule & Interactive Calendar
            </h3>
            <p className="text-xs text-[#73758E]">
              Schedule consultation slots with real-time double-booking conflict warning
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openScheduleModal()}
            icon={<Clock className="w-4 h-4" />}
            className="bg-[#373B8F] hover:bg-[#2b2e70] self-start sm:self-auto"
          >
            + Schedule New Appointment
          </Button>
        </div>

        {/* Schedule Conflict Warning Banner (if current selected date has conflict) */}
        {conflictWarning && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-sm font-bold text-amber-900 block">
                ⚠️ Schedule Conflict Warning
              </strong>
              <p className="text-amber-800 leading-relaxed font-medium">
                {conflictWarning}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleSelectDate('2026-11-06')}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Choose Next Open Day (Nov 06)
                </button>
                <button
                  onClick={() => setConflictWarning(null)}
                  className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-xs"
                >
                  Dismiss Warning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Calendar Grid (Month View Demo for Doctor) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#24264A] pb-1">
            <span>November 2026 — Clinical Consultations</span>
            <span className="text-[#73758E]">Selected: {selectedDate}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {calendarDays.map((cal) => {
              const isSelected = selectedDate === cal.dateStr;
              return (
                <button
                  key={cal.day}
                  type="button"
                  onClick={() => handleSelectDate(cal.dateStr)}
                  className={`p-3 rounded-2xl text-left border transition-all relative flex flex-col justify-between min-h-[90px] ${
                    isSelected
                      ? 'border-[#373B8F] ring-2 ring-[#373B8F]/30 bg-[#F0EEFF]'
                      : cal.hasAppt
                      ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400'
                      : 'border-[#ECEAFC] bg-white hover:border-[#DCD6FC]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#24264A]">{cal.day}</span>
                    {cal.hasAppt && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" title="Appointment Scheduled" />
                    )}
                  </div>

                  <div className="space-y-0.5 mt-2">
                    {cal.hasAppt ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md block truncate">
                        {cal.title || 'Booked Slot'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md block">
                        Open Slot
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE 3: VIEW PATIENT RECORD DOSSIER MODAL */}
      {/* ========================================================================= */}
      {viewingPatientRecord && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#373B8F]/10 text-[#373B8F] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#24264A]">
                    Patient Clinical Record Dossier
                  </h3>
                  <p className="text-xs text-[#73758E]">
                    Medical history, active medications, and post-discharge vitals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPatientRecord(false)}
                className="text-[#73758E] hover:text-[#24264A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Header Box */}
            <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[#73758E] block">Patient Name:</span>
                <strong className="text-sm text-[#24264A] block">
                  {selectedPatientForDossier?.name || 'Robert Davis'}
                </strong>
              </div>
              <div>
                <span className="text-[#73758E] block">Age / Sex:</span>
                <strong className="text-sm text-[#24264A] block">58 Yrs • Male</strong>
              </div>
              <div>
                <span className="text-[#73758E] block">MRN Identifier:</span>
                <strong className="text-sm text-[#24264A] block">CB-982410</strong>
              </div>
              <div>
                <span className="text-[#73758E] block">Phone Contact:</span>
                <strong className="text-sm text-[#24264A] block">
                  {selectedPatientForDossier?.phone || '+1 (555) 019-2834'}
                </strong>
              </div>
            </div>

            {/* Primary Diagnosis & Clinical Context */}
            <div className="p-4 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] space-y-1 text-xs">
              <span className="font-bold text-[#373B8F] uppercase tracking-wider block">
                Primary Hospital Discharge Diagnosis:
              </span>
              <p className="font-bold text-[#24264A] text-sm">
                {latestDischarge?.parsed_data?.primaryDiagnosis ||
                  'Acute Coronary Syndrome s/p Percutaneous Coronary Intervention (DES to LAD)'}
              </p>
              <p className="text-[#73758E] pt-1">
                Requested Consultation Reason:{' '}
                <strong>{selectedPatientForDossier?.purpose || 'Post-PCI follow-up & blood pressure evaluation'}</strong>
              </p>
            </div>

            {/* Active Medications List */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[#73758E]">
                Active Discharged Medications Regimen
              </h4>
              <div className="p-3 rounded-2xl bg-white border border-[#ECEAFC] divide-y divide-[#F0EEFF]">
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <strong className="text-[#24264A] block">Aspirin 81 mg oral tablet</strong>
                    <span className="text-[11px] text-[#73758E]">Take once daily in the morning with food indefinitely</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#278567] bg-emerald-50 px-2 py-0.5 rounded-full">
                    Confirmed
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <strong className="text-[#24264A] block">Brilinta (Ticagrelor) 90 mg oral tablet</strong>
                    <span className="text-[11px] text-[#73758E]">Take twice daily (morning and evening). Dual antiplatelet</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#278567] bg-emerald-50 px-2 py-0.5 rounded-full">
                    Confirmed
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <strong className="text-[#24264A] block">Atorvastatin 80 mg tablet</strong>
                    <span className="text-[11px] text-[#73758E]">Take once daily at bedtime for plaque stabilization</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#278567] bg-emerald-50 px-2 py-0.5 rounded-full">
                    Confirmed
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <strong className="text-[#24264A] block">Metoprolol Succinate ER 25 mg tablet</strong>
                    <span className="text-[11px] text-[#73758E]">Take once daily in morning with breakfast</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#278567] bg-emerald-50 px-2 py-0.5 rounded-full">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            {/* Vitals Summary */}
            <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <span className="text-[#73758E] block">Average BP</span>
                <strong className="text-base text-[#24264A] font-black">{patientMetrics?.avgBp || '118/76'}</strong>
              </div>
              <div>
                <span className="text-[#73758E] block">Fasting Blood Sugar</span>
                <strong className="text-base text-[#24264A] font-black">{patientMetrics?.avgSugar || '98 mg/dL'}</strong>
              </div>
              <div>
                <span className="text-[#73758E] block">Care Routine Adherence</span>
                <strong className="text-base text-[#278567] font-black">94% Compliant</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEFF]">
              <Button size="sm" variant="ghost" onClick={() => setViewingPatientRecord(false)}>
                Close Dossier
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setViewingPatientRecord(false);
                  const matchingReq = requests.find((r) => r.patient_name === selectedPatientForDossier?.name) || requests[0];
                  if (matchingReq) openResponseModal(matchingReq);
                }}
                className="bg-[#373B8F]"
              >
                Respond to Consultation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DOCTOR RESPOND / OFFER AVAILABLE SLOT MODAL */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Confirm Consultation Slot</h3>
                <p className="text-xs text-[#73758E]">
                  Dispatches available time & clinic room to caretaker & patient
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warning inside modal if doctor schedules on an occupied day */}
            {conflictWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
                <strong>⚠️ Note on Double-Booking:</strong>
                <p>{conflictWarning}</p>
              </div>
            )}

            <form onSubmit={handleSendDoctorResponse} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">
                  Confirmed Time Slot & Facility Location
                </label>
                <input
                  type="text"
                  required
                  value={availableSlot}
                  onChange={(e) => setAvailableSlot(e.target.value)}
                  placeholder="e.g. Nov 05, 2026 at 10:30 AM - Cardiology Pavilion Suite 400"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#373B8F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">
                  Doctor's Instructions & Visit Preparation
                </label>
                <textarea
                  rows={4}
                  required
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Enter notes for caretaker and patient..."
                  className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#373B8F]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={responding}
                  className="bg-[#373B8F] text-white"
                >
                  Send Confirmation Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SCHEDULE NEW APPOINTMENT WITH CONFLICT CHECKING */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-base font-bold text-[#24264A]">Schedule Consultation Slot</h3>
                <p className="text-xs text-[#73758E]">With automated calendar conflict check</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictWarning && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1.5">
                <strong className="block text-amber-800">⚠️ Conflict Detected on {selectedDate}:</strong>
                <p>{conflictWarning}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('2026-11-06');
                    setConflictWarning(null);
                  }}
                  className="text-xs font-bold text-[#665BE8] underline"
                >
                  Switch date to Friday, Nov 06, 2026
                </button>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">Appointment Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Preferred Time Slot</label>
                <input
                  type="text"
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  placeholder="10:30 AM"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Patient Name</label>
                <input
                  type="text"
                  defaultValue="Robert Davis"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    showToast({
                      type: conflictWarning ? 'warning' : 'success',
                      title: conflictWarning ? 'Slot Scheduled with Conflict' : 'Consultation Scheduled',
                      message: `Consultation recorded for ${selectedDate} at ${selectedTimeSlot}.`,
                    });
                    setShowScheduleModal(false);
                  }}
                  className="bg-[#373B8F]"
                >
                  {conflictWarning ? 'Double-Book Anyway' : 'Confirm Slot'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPage;
