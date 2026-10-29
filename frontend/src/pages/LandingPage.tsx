import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Clock,
  CalendarCheck,
  ShieldCheck,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  BotMessageSquare,
  Activity,
  Users,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FF] text-[#24264A] flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-[#ECEAFC] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] flex items-center justify-center text-white shadow-soft">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-[#24264A] tracking-tight">CareBridge</span>
              <span className="ml-1 text-[10px] font-bold uppercase bg-[#F0EEFF] text-[#665BE8] px-2 py-0.5 rounded-full">
                AI Health
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-6">
        {/* Ambient Gradient Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-gradient-to-b from-[#F0EEFF] via-[#EAF0FF]/50 to-transparent rounded-b-[4rem] -z-10 blur-xl opacity-70" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F0EEFF] border border-[#DCD6FC] text-[#665BE8] text-xs font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-[#8C91F5]" />
            <span>Powered by Gemini 3.8 Flash Clinical AI</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#24264A] tracking-tight leading-[1.15]">
            Transform Complex Discharge Instructions Into <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] bg-clip-text text-transparent">
              Simple, Safe Recovery Care
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#73758E] leading-relaxed">
            CareBridge AI bridges the gap between hospital discharge paperwork and daily home recovery.
            Automatically translate dense clinician notes into structured timetables, timed pill reminders,
            and plain-language guidance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto text-base px-8 py-4 shadow-elevated">
                Start Patient Recovery Free
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 py-4">
                Explore Demo Portal
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#73758E] font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#278567]" />
              <span>Patient-Verified Care Plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#278567]" />
              <span>Real Outbound Email Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#278567]" />
              <span>Caregiver Access Sync</span>
            </div>
          </div>
        </div>

        {/* Floating App Preview Card */}
        <div className="max-w-5xl mx-auto mt-14 bg-white rounded-4xl shadow-floating border border-[#ECEAFC] p-6 sm:p-8 overflow-hidden relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#F0EEFF]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center font-bold text-lg shadow-soft">
                RD
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Robert Davis — Post-PCI Recovery Plan</h3>
                <p className="text-xs text-[#73758E]">Discharged Oct 24, 2026 • St. Jude Memorial Hospital</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#278567]/10 text-[#278567] text-xs font-bold border border-[#278567]/20">
                Recovery on Track (68%)
              </span>
            </div>
          </div>

          {/* Sample Grid in Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#373B8F]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#665BE8]" />
                  Morning Regimen
                </span>
                <span className="text-[10px] bg-[#278567]/15 text-[#278567] px-2 py-0.5 rounded-full font-bold">
                  Taken
                </span>
              </div>
              <p className="text-sm font-bold text-[#24264A]">Aspirin 81mg & Clopidogrel 75mg</p>
              <p className="text-xs text-[#73758E]">Take after breakfast with water. Prevent arterial clotting.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#373B8F]">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#665BE8]" />
                  Daily Exercise
                </span>
                <span className="text-[10px] bg-[#C58A30]/15 text-[#C58A30] px-2 py-0.5 rounded-full font-bold">
                  Due 3:00 PM
                </span>
              </div>
              <p className="text-sm font-bold text-[#24264A]">15-Min Light Flat Walking</p>
              <p className="text-xs text-[#73758E]">Maintain comfortable pace. Stop immediately if chest tightness occurs.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#373B8F]">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#665BE8]" />
                  Cardiology Follow-up
                </span>
                <span className="text-[10px] bg-[#665BE8]/15 text-[#665BE8] px-2 py-0.5 rounded-full font-bold">
                  In 5 Days
                </span>
              </div>
              <p className="text-sm font-bold text-[#24264A]">Dr. Sarah Jenkins, MD</p>
              <p className="text-xs text-[#73758E]">Suite 400 • Bring home blood pressure log.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-6 bg-white border-y border-[#ECEAFC]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-[#24264A]">Everything You Need for Safe Home Recovery</h2>
            <p className="text-sm text-[#73758E]">
              Designed alongside clinical safety standards to ensure no instruction is missed or misunderstood.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#F7F8FF] border border-[#ECEAFC] hover:border-[#D4D0FA] transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#24264A]">AI Discharge Analysis</h3>
              <p className="text-sm text-[#73758E] leading-relaxed">
                Upload your discharge summary PDF. Gemini AI organizes medications, dietary restrictions,
                wound care, and activity precautions into verifiable checklist tasks.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F7F8FF] border border-[#ECEAFC] hover:border-[#D4D0FA] transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#24264A]">Timed Schedule & Email Alerts</h3>
              <p className="text-sm text-[#73758E] leading-relaxed">
                Receive scheduled email notifications tailored to your routine (morning, midday, evening, bedtime)
                specifying exact tablet names and food timing requirements.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#F7F8FF] border border-[#ECEAFC] hover:border-[#D4D0FA] transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center">
                <BotMessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#24264A]">Conversational AI Assistant</h3>
              <p className="text-sm text-[#73758E] leading-relaxed">
                Ask questions at any hour. The Gemini 3.8 Flash clinical assistant has instant access to your
                specific discharge records to answer recovery doubts safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reassurance & Safety Banner */}
      <section className="py-14 px-6 bg-[#F0EEFF]">
        <div className="max-w-4xl mx-auto rounded-3xl bg-white border border-[#DCD6FC] p-8 flex flex-col md:flex-row items-center gap-6 shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-base font-bold text-[#24264A]">Clinical Accuracy & Verification Mandate</h4>
            <p className="text-xs text-[#73758E] leading-relaxed">
              CareBridge AI assists patients by simplifying language, but every instruction must be reviewed and confirmed.
              Never replace emergency medical consultations. Always verify critical medication changes with your prescribing physician.
            </p>
          </div>
          <Link to="/signup" className="shrink-0">
            <Button variant="primary" size="md">
              Create Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 bg-white border-t border-[#ECEAFC] text-xs text-[#73758E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#665BE8]" />
            <span className="font-semibold text-[#24264A]">CareBridge AI</span>
            <span>— Smart Post-Hospital Recovery Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-[#665BE8]">Login</Link>
            <Link to="/signup" className="hover:text-[#665BE8]">Patient Signup</Link>
            <Link to="/settings" className="hover:text-[#665BE8]">System Status</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
