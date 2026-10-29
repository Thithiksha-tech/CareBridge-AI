import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User as UserIcon,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'caretaker' | 'doctor'>('patient');
  const [hospitalName, setHospitalName] = useState('St. Jude Memorial Hospital');
  const [department, setDepartment] = useState('Cardiology Pavilion');
  const [patientNote, setPatientNote] = useState('Robert Davis (Primary Patient)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await register(
        name,
        email,
        password,
        role,
        role === 'caretaker' ? 1 : undefined,
        role === 'doctor' ? hospitalName : undefined
      );

      showToast({
        type: 'success',
        title: 'Account Created Successfully!',
        message: res.otpPreview
          ? `Welcome to CareBridge! Verification OTP: ${res.otpPreview}`
          : 'Welcome to CareBridge. Please verify your email with OTP.',
      });

      if (role === 'doctor') {
        navigate('/doctor');
      } else if (role === 'caretaker') {
        navigate('/caregiver');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try a different email.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Registration Error',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FF] py-12 px-4 sm:px-6 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#8C91F5]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand logo */}
      <Link to="/" className="inline-flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] flex items-center justify-center text-white shadow-soft">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <span className="font-extrabold text-2xl text-[#24264A] tracking-tight">CareBridge</span>
          <span className="ml-1 text-[11px] font-bold uppercase bg-[#F0EEFF] text-[#665BE8] px-2 py-0.5 rounded-full">
            AI Health
          </span>
        </div>
      </Link>

      <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-4xl shadow-floating border border-[#ECEAFC] relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#24264A] tracking-tight">
            Create Patient Account
          </h2>
          <p className="text-xs sm:text-sm text-[#73758E] mt-1.5">
            Join CareBridge to turn complex discharge summaries into safe recovery routines.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#C94C62]/10 border border-[#C94C62]/20 text-[#C94C62] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#24264A] uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-[#8C91F5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Robert Davis"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#24264A] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-[#8C91F5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="robert.davis@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#24264A] uppercase tracking-wider mb-2">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#8C91F5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#24264A] uppercase tracking-wider mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'patient', label: '🧑‍🦽 Patient', desc: 'Discharge recovery' },
                { id: 'caretaker', label: '🤝 Caretaker', desc: 'Family & vitals' },
                { id: 'doctor', label: '🩺 Doctor', desc: 'Clinical care' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as any)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    role === r.id
                      ? 'bg-[#665BE8] text-white border-[#665BE8] shadow-soft'
                      : 'bg-[#F7F8FF] text-[#73758E] border-[#DCD6FC] hover:bg-[#F0EEFF]'
                  }`}
                >
                  <span className="font-bold">{r.label}</span>
                  <span className={`text-[10px] ${role === r.id ? 'text-white/80' : 'text-[#73758E]'}`}>
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Role specific inputs */}
          {role === 'caretaker' && (
            <div className="p-3.5 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-[#24264A]">Assigned Patient for Monitoring</label>
              <input
                type="text"
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                placeholder="Robert Davis (Patient Name or Email)"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
              />
              <p className="text-[10px] text-[#73758E]">Links you directly to the patient's daily BP, blood sugar logs, and pill stock.</p>
            </div>
          )}

          {role === 'doctor' && (
            <div className="p-3.5 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] space-y-2 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-[#24264A] mb-1">Hospital / Clinic Facility</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. St. Jude Memorial Hospital"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#24264A] mb-1">Medical Department / Specialty</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Cardiology Pavilion, Suite 400"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] flex items-start gap-2.5 text-[11px] text-[#373B8F] leading-tight mt-2">
            <ShieldCheck className="w-4 h-4 text-[#665BE8] shrink-0 mt-0.5" />
            <span>
              By signing up, you agree that CareBridge provides assistance tools and all clinical instructions must be verified before acting.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-4"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Create My Recovery Account
          </Button>
        </form>

        <div className="text-center pt-6 mt-6 border-t border-[#F0EEFF]">
          <p className="text-xs text-[#73758E]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#665BE8] hover:underline">
              Log In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
