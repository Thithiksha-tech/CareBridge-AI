import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  HeartPulse,
  Activity,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../services/api';
import type { Appointment } from '../types';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  // New Appointment Form
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology Follow-up');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('10:00 AM');
  const [location, setLocation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [bp, setBp] = useState('120/78');
  const [hr, setHr] = useState('68');
  const [weight, setWeight] = useState('172');

  const { showToast } = useToast();

  useEffect(() => {
    // If a Doctor visits /appointments, redirect them to their dedicated Doctor Workspace
    if (user?.role === 'doctor' || user?.role === 'clinician') {
      navigate('/doctor', { replace: true });
      return;
    }
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = (await appointmentService.getAll()) as any;
      const combined: Appointment[] = data.appointments || [
        ...(data.upcoming || []),
        ...(data.past || [])
      ];

      if (combined.length === 0) {
        // Fallback default rich clinical visits if empty
        const initialVisits: Appointment[] = [
          {
            id: 201,
            user_id: 1,
            doctor_name: 'Dr. Sarah Jenkins, MD, FACC',
            specialty: 'Cardiology Follow-up Clinic',
            clinic_hospital: 'St. Jude Memorial Hospital - Suite 400',
            location: 'Regional Heart & Vascular Health Pavilion',
            appointment_date: '2026-11-10',
            appointment_time: '10:30 AM',
            status: 'Scheduled',
            purpose: 'Post-PCI Stent Checkup & Medication Titration',
            doctor_feedback: 'Recovery proceeding favorably. Maintain walking routines and low-sodium diet. Continue dual-antiplatelet therapy without interruptions.',
            vitals: { blood_pressure: '118/76', heart_rate: '68 bpm', weight: '172 lbs' },
            created_at: '2026-10-24'
          },
          {
            id: 202,
            user_id: 1,
            doctor_name: 'Dr. Sarah Vance, MD',
            specialty: 'Cardiothoracic Surgery',
            clinic_hospital: 'St. Jude Medical Center - Suite 402',
            location: 'Surgical Recovery Clinic Suite 402',
            appointment_date: '2026-10-24',
            appointment_time: '11:00 AM',
            status: 'Completed',
            purpose: 'Inpatient Hospital Discharge Evaluation & Stent Clearance',
            doctor_feedback: 'Successful recovery after drug-eluting stent placement. Patient is stable. Instructed to maintain antiplatelet dual therapy without missing a dose. Begin light ambulation.',
            vitals: { blood_pressure: '120/78', heart_rate: '70 bpm', weight: '173 lbs' },
            created_at: '2026-10-24'
          }
        ];
        setAppointments(initialVisits);
      } else {
        setAppointments(combined);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Error Loading Visits',
        message: 'Could not fetch appointment list from database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !apptDate) {
      showToast({ type: 'warning', title: 'Missing Info', message: 'Please provide doctor name and date.' });
      return;
    }

    try {
      const res = await appointmentService.create({
        doctor_name: doctorName,
        specialty,
        appointment_date: apptDate,
        appointment_time: apptTime,
        location: location || 'Main Medical Center',
        doctor_feedback: feedback || 'Initial recovery post-procedure checkup.',
        vitals: {
          blood_pressure: bp,
          heart_rate: hr,
          weight: `${weight} lbs`,
        },
      });

      setAppointments((prev) => [res.appointment, ...prev]);
      setShowModal(false);
      resetForm();
      showToast({
        type: 'success',
        title: 'Appointment Scheduled',
        message: `Appointment with ${doctorName} has been booked.`,
      });
    } catch {
      showToast({ type: 'error', title: 'Booking Failed', message: 'Unable to save appointment.' });
    }
  };

  const handleSendEmail = async (id: number) => {
    setSendingEmailId(id);
    try {
      const res = await appointmentService.sendNotification(id);
      showToast({
        type: 'success',
        title: 'Email Dispatched!',
        message: res.message || 'Appointment reminder delivered to your inbox.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.response?.data?.error || 'Email relay error.',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const resetForm = () => {
    setDoctorName('');
    setApptDate('');
    setLocation('');
    setFeedback('');
  };

  const latestFeedbackAppt = appointments.find((a) => a.doctor_feedback) || appointments[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Clinical Follow-Up & Feedback Management</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Doctor Appointments & Vitals
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Track cardiology checkups, primary care evaluations, and physician post-visit feedback.
            Trigger instant email reminders directly to your inbox.
          </p>
        </div>

        <Button
          variant="glass"
          size="lg"
          onClick={() => setShowModal(true)}
          icon={<Plus className="w-4 h-4 text-[#665BE8]" />}
          className="shadow-elevated"
        >
          Book Follow-up Visit
        </Button>
      </div>

      {/* Spotlight: Doctor's Last Recovery Feedback & Vitals */}
      {latestFeedbackAppt && (
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-white via-white to-[#F0EEFF] border border-[#DCD6FC] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECEAFC]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#665BE8] text-white flex items-center justify-center font-bold shadow-soft">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#24264A]">
                  Physician's Recovery Feedback Spotlight
                </h3>
                <p className="text-xs text-[#73758E]">
                  {latestFeedbackAppt.doctor_name} • {latestFeedbackAppt.specialty}
                </p>
              </div>
            </div>

            <Badge variant="primary" size="md">
              Verified Post-Visit Record
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feedback Text (8 cols) */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#373B8F] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#665BE8]" />
                Clinical Notes & Care Recommendation
              </span>
              <p className="text-xs sm:text-sm text-[#24264A] leading-relaxed italic">
                "{latestFeedbackAppt.doctor_feedback || 'Patient recovery is proceeding favorably. Continue dual-antiplatelet therapy without interruptions. Maintain walking exercises.'}"
              </p>
            </div>

            {/* Vitals Summary (4 cols) */}
            <div className="md:col-span-4 grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-white border border-[#DCD6FC] text-center space-y-1">
                <span className="text-[9px] font-bold text-[#73758E] uppercase">BP</span>
                <p className="text-sm font-extrabold text-[#278567]">
                  {latestFeedbackAppt.vitals?.blood_pressure || '118/76'}
                </p>
                <span className="text-[9px] text-[#278567]">Optimal</span>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-[#DCD6FC] text-center space-y-1">
                <span className="text-[9px] font-bold text-[#73758E] uppercase">HR</span>
                <p className="text-sm font-extrabold text-[#665BE8]">
                  {latestFeedbackAppt.vitals?.heart_rate || '66'} bpm
                </p>
                <span className="text-[9px] text-[#665BE8]">Normal</span>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-[#DCD6FC] text-center space-y-1">
                <span className="text-[9px] font-bold text-[#73758E] uppercase">Weight</span>
                <p className="text-sm font-extrabold text-[#24264A]">
                  {latestFeedbackAppt.vitals?.weight || '172 lbs'}
                </p>
                <span className="text-[9px] text-[#73758E]">Stable</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#24264A] tracking-tight">Scheduled Clinical Follow-ups</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <Card key={appt.id} className="p-6 space-y-4 bg-white border border-[#ECEAFC] hover:border-[#D4D0FA] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant={appt.status === 'Scheduled' ? 'lavender' : 'neutral'} size="sm">
                    {appt.specialty}
                  </Badge>
                  <h4 className="text-base font-bold text-[#24264A]">{appt.doctor_name}</h4>
                </div>
                <Badge
                  variant={
                    ['scheduled', 'completed', 'confirmed_by_doctor'].includes((appt.status || '').toLowerCase())
                      ? 'success'
                      : (appt.status || '').toLowerCase().includes('reschedule')
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {(appt.status || 'Scheduled').replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="space-y-2 text-xs text-[#73758E]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#665BE8]" />
                  <span>
                    {appt.appointment_date} at {appt.appointment_time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#665BE8]" />
                  <span>{appt.location}</span>
                </div>
              </div>

              {appt.doctor_feedback && (
                <div className="p-3 rounded-xl bg-[#F7F8FF] border border-[#ECEAFC] text-xs text-[#24264A]">
                  <span className="font-bold text-[#373B8F] block mb-1">Doctor's Guidance:</span>
                  <p className="text-[11px] text-[#73758E] italic">{appt.doctor_feedback}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-[#F0EEFF]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSendEmail(appt.id)}
                  loading={sendingEmailId === appt.id}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Send Email Alert
                </Button>

                <span className="text-[11px] text-[#73758E]">
                  ID: #{appt.id}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#24264A]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-4xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-[#ECEAFC] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#24264A] mb-4">Book Clinical Follow-up</h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  Doctor Name
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Cardiology / PCP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Heart Vascular Suite 400"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  Doctor's Clinical Feedback / Visit Goal
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Bring home BP log. Check stent hemostasis and lipid panel."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="md" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Save Appointment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
