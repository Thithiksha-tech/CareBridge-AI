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
  X
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { appointmentService, healthService } from '../services/api';
import type { Appointment, HealthLog, HealthMetrics, User } from '../types';

export const DoctorPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Appointment[]>([]);
  const [patientLogs, setPatientLogs] = useState<HealthLog[]>([]);
  const [patientMetrics, setPatientMetrics] = useState<HealthMetrics | null>(null);
  const [patientInfo, setPatientInfo] = useState<User | null>(null);

  // Response Modal state
  const [selectedRequest, setSelectedRequest] = useState<Appointment | null>(null);
  const [availableSlot, setAvailableSlot] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    loadDoctorWorkspace();
  }, []);

  const loadDoctorWorkspace = async () => {
    setLoading(true);
    try {
      const [reqRes, healthRes] = await Promise.all([
        appointmentService.getDoctorRequests().catch(() => ({ success: false, requests: [] })),
        healthService.getLogs().catch(() => ({ success: false, logs: [], metrics: null, patient: null })),
      ]);

      if (reqRes && reqRes.requests) {
        setRequests(reqRes.requests);
      }
      if (healthRes) {
        setPatientLogs(healthRes.logs || []);
        setPatientMetrics(healthRes.metrics);
        setPatientInfo(healthRes.patient);
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

  const openResponseModal = (req: Appointment) => {
    setSelectedRequest(req);
    const defaultDate = req.appointment_date || 'Nov 04, 2026';
    const defaultTime = req.appointment_time || '10:30 AM';
    setAvailableSlot(`${defaultDate} at ${defaultTime} - Cardiology Pavilion Suite 400`);
    setResponseNotes(
      `Confirmed. Dr. Sarah Jenkins is available on ${defaultDate} at ${defaultTime}. You can come and visit me at this time. Please bring home blood pressure and blood sugar logs.`
    );
  };

  const handleSendDoctorResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setResponding(true);
    try {
      const res = await appointmentService.doctorRespond(selectedRequest.id, {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Doctor Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#373B8F] via-[#484DAF] to-[#24264A] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Attending Physician Clinical Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Doctor & Clinician Consultation Portal
          </h2>
          <p className="text-xs sm:text-sm text-white/85 max-w-xl">
            Receive appointment requests from caretakers, confirm your available visit times, and synchronize clinical feedback across the 3-way CareBridge care network.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs shrink-0 space-y-1">
          <span className="font-bold block text-white/90">Hospital Facility:</span>
          <span className="font-extrabold text-sm text-white block">St. Jude Memorial Hospital</span>
          <span className="text-[11px] text-white/80">Cardiology Pavilion • Attending Physician Desk</span>
        </div>
      </div>

      {/* Grid: Incoming Caretaker Requests (Top Priority) */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#665BE8]" />
              Incoming Caretaker Appointment Requests
            </h3>
            <p className="text-xs text-[#73758E]">
              Consultations submitted by family caretakers awaiting your scheduling confirmation
            </p>
          </div>
          <span className="text-xs font-bold text-[#373B8F] bg-[#F0EEFF] px-3 py-1 rounded-full self-start sm:self-auto">
            {requests.length} Requests in Queue
          </span>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-[#73758E] text-xs">
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
                      isConfirmed ? 'border-l-[#278567]' : 'border-l-[#665BE8]'
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
                          isConfirmed ? 'bg-[#278567]/15 text-[#278567]' : 'bg-[#665BE8]/15 text-[#665BE8]'
                        }`}
                      >
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F8FF] space-y-1.5 text-xs">
                      <p className="text-[#373B8F] font-semibold">
                        🏥 <strong>Hospital / Desk:</strong> {req.clinic_hospital} ({req.hospital_details || 'Cardiology Pavilion'})
                      </p>
                      <p className="text-[#24264A] font-semibold">
                        📅 <strong>Requested Time:</strong> {req.appointment_date} at {req.appointment_time || '10:30 AM'}
                      </p>
                      <p className="text-[#73758E]">
                        📝 <strong>Reason / Symptoms:</strong> {req.purpose}
                      </p>
                    </div>

                    {isConfirmed ? (
                      <div className="p-3 rounded-xl bg-[#278567]/10 border border-[#278567]/20 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#278567] block">
                          ✓ Your Confirmed Response to Caretaker:
                        </span>
                        <p className="text-[#24264A] italic font-medium">"{req.doctor_response_notes}"</p>
                        <p className="text-[11px] font-bold text-[#278567] pt-0.5">
                          ⏰ Confirmed Slot: {req.doctor_available_slot}
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openResponseModal(req)}
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        className="w-full"
                      >
                        Respond & Confirm Available Slot
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Patient Clinical Records & Vitals Review */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#278567]" />
              Patient Clinical Vitals & Lab Reports Review
            </h3>
            <p className="text-xs text-[#73758E]">
              Live post-discharge vitals, blood tests, and daily routine compliance for {patientInfo?.full_name || 'Robert Davis'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#278567] bg-[#278567]/10 px-3 py-1 rounded-full">
              Avg BP: {patientMetrics?.avgBp || '118/76'}
            </span>
            <span className="text-xs font-bold text-[#665BE8] bg-[#665BE8]/10 px-3 py-1 rounded-full">
              Avg Sugar: {patientMetrics?.avgSugar || '98 mg/dL'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patientLogs.slice(0, 3).map((log) => (
            <Card key={log.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#373B8F] bg-[#F0EEFF] px-2 py-0.5 rounded-full">
                  📅 {log.log_date}
                </span>
                <span className="text-[11px] text-[#278567] font-bold">
                  Streak Adherent
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#F7F8FF] text-xs">
                <div>
                  <span className="text-[10px] text-[#73758E] block">Blood Pressure</span>
                  <span className="text-sm font-black text-[#24264A]">{log.blood_pressure}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#73758E] block">Blood Sugar</span>
                  <span className="text-sm font-black text-[#278567]">{log.blood_sugar} mg/dL</span>
                </div>
              </div>

              {log.blood_report_name && (
                <div className="border-t border-[#ECEAFC] pt-2 space-y-0.5 text-xs">
                  <p className="font-bold text-[#24264A] flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#665BE8]" />
                    {log.blood_report_name}
                  </p>
                  <p className="text-[11px] text-[#73758E] leading-relaxed">
                    {log.blood_report_summary}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>

      {/* Doctor Response Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Confirm Available Slot & Reply</h3>
                <p className="text-xs text-[#73758E]">
                  Dispatches 3-way notification email to Caretaker ({selectedRequest.requested_by_name}) and Patient
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-[#73758E] hover:text-[#24264A]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendDoctorResponse} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F8FF] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#73758E] block">Request Summary</span>
                <p className="text-[#24264A]">
                  <strong>Patient:</strong> {selectedRequest.patient_name || 'Robert Davis'} • <strong>Reason:</strong> {selectedRequest.purpose}
                </p>
                <p className="text-[#73758E]">
                  Requested for: {selectedRequest.appointment_date} at {selectedRequest.appointment_time || '10:30 AM'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">
                  Your Available Date & Time Slot
                </label>
                <input
                  type="text"
                  required
                  value={availableSlot}
                  onChange={(e) => setAvailableSlot(e.target.value)}
                  placeholder="e.g. Wednesday Nov 4 at 10:30 AM - Suite 400"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">
                  Doctor Message / Instructions to Caretaker & Patient
                </label>
                <textarea
                  rows={4}
                  required
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="e.g. Confirmed. I am available at this time, you can come and visit me in Pavilion Suite 400. Bring home blood pressure log."
                  className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={responding}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Send 3-Way Confirmation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
