import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmailVerificationBanner } from '../components/common/EmailVerificationBanner';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { healthService, appointmentService, authService } from '../services/api';
import type { HealthLog, HealthMetrics, MedicationStock, Appointment, User } from '../types';

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

  // Appointment booking form state
  const [showBookModal, setShowBookModal] = useState(false);
  const [hospitalName, setHospitalName] = useState('St. Jude Memorial Hospital');
  const [hospitalDetails, setHospitalDetails] = useState('Cardiology Pavilion 3rd Floor, Reception Desk #4');
  const [selectedDoctorName, setSelectedDoctorName] = useState('Dr. Sarah Jenkins, MD, FACC');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(7);
  const [apptSpecialty, setApptSpecialty] = useState('Cardiology Follow-Up');
  const [apptDate, setApptDate] = useState('2026-11-04');
  const [apptTime, setApptTime] = useState('10:30 AM');
  const [apptPurpose, setApptPurpose] = useState('Post-PCI 2-week stent re-check & blood pressure adjustment requested by caretaker');
  const [submittingAppt, setSubmittingAppt] = useState(false);

  useEffect(() => {
    loadCaretakerData();
  }, []);

  const loadCaretakerData = async () => {
    setLoading(true);
    try {
      const [healthRes, stockRes, apptRes, networkRes] = await Promise.all([
        healthService.getLogs(),
        healthService.getMedicationStock(),
        appointmentService.getAll(),
        authService.getNetwork().catch(() => ({ success: false, doctors: [], patients: [], caretakers: [] }))
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
        setAppointments(apptRes.appointments || []);
      }

      if (networkRes && networkRes.doctors) {
        setDoctorsList(networkRes.doctors);
        if (networkRes.doctors.length > 0) {
          const doc = networkRes.doctors[0];
          setSelectedDoctorName(doc.fullName || doc.name);
          setSelectedDoctorId(doc.id);
          if (doc.hospitalName) setHospitalName(doc.hospitalName);
          if (doc.hospitalDepartment) setHospitalDetails(doc.hospitalDepartment);
        }
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
      const res = await appointmentService.request({
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#278567] via-[#2E9B79] to-[#1E604A] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Users className="w-3.5 h-3.5" />
            <span>Family Caretaker & Clinical Coordination Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Caretaker Health & Appointment Bridge
          </h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl">
            Monitor aggregate blood pressure, blood sugar trends, tablet stock levels, and book appointments directly with hospital receptionists and doctors.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs shrink-0 space-y-1">
          <span className="font-bold block text-white/90">Monitored Patient:</span>
          <span className="font-extrabold text-sm text-white block">{patient?.full_name || 'Robert Davis'}</span>
          <span className="text-[11px] text-white/80">MRN: CB-982410 • Post-PCI Recovery</span>
        </div>
      </div>

      {/* 4 Health Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aggregate Blood Pressure */}
        <Card className="p-5 border-l-4 border-l-[#278567] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Aggregate BP</p>
            <p className="text-2xl font-black text-[#24264A]">{metrics?.avgBp || '118/76'}</p>
            <span className="text-[11px] font-bold text-[#278567]">Within Target Bounds</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </Card>

        {/* Aggregate Blood Sugar */}
        <Card className="p-5 border-l-4 border-l-[#665BE8] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Aggregate Sugar</p>
            <p className="text-2xl font-black text-[#24264A]">{metrics?.avgSugar || '98 mg/dL'}</p>
            <span className="text-[11px] font-bold text-[#278567]">Fasting Normal</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#665BE8]/10 text-[#665BE8] flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        {/* Serious Situation Status */}
        <Card className="p-5 border-l-4 border-l-[#373B8F] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Clinical Situation</p>
            <p className="text-base font-bold text-[#24264A] truncate max-w-[150px]">
              {metrics?.riskStatus || 'Normal Recovery'}
            </p>
            <span className="text-[11px] text-[#278567] font-semibold">No critical flags</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#373B8F]/10 text-[#373B8F] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>

        {/* Tablet Stock Health */}
        <Card className="p-5 border-l-4 border-l-[#FF7A00] flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Pill Inventory</p>
            <p className="text-2xl font-black text-[#24264A]">
              {medStock.filter(s => s.status === 'Low Stock').length} Low Stock
            </p>
            <span className="text-[11px] text-[#FF7A00] font-semibold">Metoprolol refill due</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Section 1: Tablet Stock & On-Time Monitor */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A]">Patient Medication Stock & Adherence Monitor</h3>
            <p className="text-xs text-[#73758E]">
              Track remaining pills, consumption schedules, and trigger pharmacy refills
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
                <th className="py-3 px-3">Pills Remaining</th>
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

      {/* Section 2: Book Appointment with Doctor / Hospital Reception */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
          <div>
            <h3 className="text-lg font-bold text-[#24264A]">Hospital & Doctor Appointment Booking</h3>
            <p className="text-xs text-[#73758E]">
              Book an appointment with the patient's attending physician or hospital reception desk
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowBookModal(true)}
            icon={<CalendarCheck className="w-4 h-4" />}
            className="bg-[#278567] hover:bg-[#1E604A] text-white self-start sm:self-auto"
          >
            Book New Doctor Appointment
          </Button>
        </div>

        {/* 3-Way Communication Timeline / Appointments List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#73758E]">
            Active Consultation Requests & Confirmed Doctor Slots
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((appt) => {
              const isConfirmed = appt.status === 'confirmed_by_doctor' || appt.status === 'Scheduled' || appt.status === 'scheduled';
              return (
                <Card
                  key={appt.id}
                  className={`p-5 space-y-3 border-l-4 ${
                    isConfirmed ? 'border-l-[#278567]' : 'border-l-[#FF7A00]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#24264A] flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-[#665BE8]" />
                      {appt.doctor_name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        isConfirmed
                          ? 'bg-[#278567]/15 text-[#278567]'
                          : 'bg-[#FF7A00]/15 text-[#FF7A00]'
                      }`}
                    >
                      {appt.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F7F8FF] space-y-1 text-xs">
                    <p className="text-[#373B8F] font-bold">🏥 {appt.clinic_hospital || 'St. Jude Memorial Hospital'}</p>
                    <p className="text-[#73758E]">{appt.hospital_details || 'Cardiology Pavilion'}</p>
                    <p className="text-[#24264A] font-semibold mt-1">
                      📅 Date: {appt.appointment_date} {appt.appointment_time ? `at ${appt.appointment_time}` : ''}
                    </p>
                    <p className="text-[#73758E]">Reason: {appt.purpose}</p>
                  </div>

                  {/* 3-Way Doctor Feedback / Available Slot response */}
                  {appt.doctor_response_notes ? (
                    <div className="p-3 rounded-xl bg-[#278567]/10 border border-[#278567]/20 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#278567] block">
                        💬 Doctor's Confirmed Availability:
                      </span>
                      <p className="text-[#24264A] font-medium italic">
                        "{appt.doctor_response_notes}"
                      </p>
                      {appt.doctor_available_slot && (
                        <p className="text-[11px] font-bold text-[#278567] pt-1">
                          ⏰ Confirmed Slot: {appt.doctor_available_slot}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      ⏳ Awaiting response from doctor. Email notification will arrive once confirmed.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Book Doctor Appointment</h3>
                <p className="text-xs text-[#73758E]">Sends consultation request to physician & hospital reception</p>
              </div>
              <button onClick={() => setShowBookModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                ✕
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
                      const found = doctorsList.find(d => (d.fullName || d.name) === e.target.value);
                      if (found) setSelectedDoctorId(found.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#278567]"
                  >
                    <option value="Dr. Sarah Jenkins, MD, FACC">Dr. Sarah Jenkins, MD, FACC</option>
                    <option value="Dr. Marcus Vance, MD">Dr. Marcus Vance, MD</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.fullName || d.name}>{d.fullName || d.name}</option>
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
    </div>
  );
};
