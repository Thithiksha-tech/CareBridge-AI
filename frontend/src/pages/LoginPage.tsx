import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loggedUser = await login(email, password);
      showToast({
        type: 'success',
        title: 'Welcome back!',
        message: `Logged in as ${loggedUser.name} (${loggedUser.role.toUpperCase()}).`,
      });
      if (loggedUser.role === 'doctor' || loggedUser.role === 'clinician') {
        navigate('/doctor');
      } else if (loggedUser.role === 'caretaker' || loggedUser.role === 'caregiver') {
        navigate('/caregiver');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please verify your email and password.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FF] flex flex-col justify-center lg:py-0">
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand Gradient Panel (Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#665BE8] via-[#373B8F] to-[#24264A] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle lighting rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#8C91F5]/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#373B8F]/40 blur-3xl pointer-events-none" />

          {/* Top Brand */}
          <Link to="/" className="inline-flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">CareBridge</span>
              <span className="ml-1 text-[10px] font-bold uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                AI
              </span>
            </div>
          </Link>

          {/* Center Message */}
          <div className="py-12 relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-semibold border border-white/15">
              <ShieldCheck className="w-4 h-4 text-[#8C91F5]" />
              <span>Certified Safe Healthcare Bridge</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Calm, Intelligent, <br />
              Patient-Centered Recovery.
            </h2>

            <p className="text-white/80 text-sm leading-relaxed max-w-md">
              Access your personalized medication schedule, physician feedback, and interactive Gemini clinical assistant anytime.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-[#8C91F5]" />
                <span>Automated timed pill reminders with meal timings</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-[#8C91F5]" />
                <span>Doctor appointment logs and vital tracking</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-[#8C91F5]" />
                <span>Live outbound email alerts sent to your inbox</span>
              </div>
            </div>
          </div>

          {/* Bottom quote */}
          <div className="text-xs text-white/60 relative z-10 border-t border-white/10 pt-4">
            Protected by modern encryption standards. Your medical privacy is our top priority.
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-4xl shadow-floating border border-[#ECEAFC]">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#24264A] tracking-tight">
                Log In to CareBridge
              </h2>
              <p className="text-xs sm:text-sm text-[#73758E] mt-1.5">
                Enter your patient or caregiver credentials to continue.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-[#C94C62]/10 border border-[#C94C62]/20 text-[#C94C62] text-xs font-medium animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="patient@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#24264A] uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-[#8C91F5] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#73758E] hover:text-[#24264A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Log In to Recovery Portal
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-2 border-t border-[#F0EEFF]">
              <p className="text-[11px] font-bold text-[#73758E] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Your Role to Test Portal:</span>
                <span className="text-[10px] text-[#665BE8] font-bold">3 Segregated Logins</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('robert.davis@example.com', 'password123')}
                  className="p-2.5 rounded-xl bg-[#F0EEFF] hover:bg-[#8C91F5]/20 text-[#373B8F] text-xs font-semibold border border-[#DCD6FC] text-left transition-colors flex flex-col justify-between"
                >
                  <span className="inline-block text-[10px] uppercase font-bold text-[#665BE8]">🧑‍🦽 Patient</span>
                  <span className="block font-bold text-xs text-[#24264A] mt-0.5">Robert Davis</span>
                  <span className="text-[9px] text-[#73758E] truncate">Blood & Sugar Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('sarah.davis@example.com', 'password123')}
                  className="p-2.5 rounded-xl bg-[#F0EEFF] hover:bg-[#8C91F5]/20 text-[#373B8F] text-xs font-semibold border border-[#DCD6FC] text-left transition-colors flex flex-col justify-between"
                >
                  <span className="inline-block text-[10px] uppercase font-bold text-[#278567]">🤝 Caretaker</span>
                  <span className="block font-bold text-xs text-[#24264A] mt-0.5">Sarah Davis</span>
                  <span className="text-[9px] text-[#73758E] truncate">BP & Pill Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('doctor.jenkins@example.com', 'password123')}
                  className="p-2.5 rounded-xl bg-[#F0EEFF] hover:bg-[#8C91F5]/20 text-[#373B8F] text-xs font-semibold border border-[#DCD6FC] text-left transition-colors flex flex-col justify-between"
                >
                  <span className="inline-block text-[10px] uppercase font-bold text-[#373B8F]">🩺 Doctor</span>
                  <span className="block font-bold text-xs text-[#24264A] mt-0.5">Dr. Jenkins</span>
                  <span className="text-[9px] text-[#73758E] truncate">Appt & 3-Way Comms</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-[#73758E]">
                Don't have an account yet?{' '}
                <Link to="/signup" className="font-bold text-[#665BE8] hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
