import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { FloatingAIChat } from '../common/FloatingAIChat';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Patient Recovery Overview',
    subtitle: 'Daily Clinical Progress & Status Dashboard',
  },
  '/upload': {
    title: 'Discharge Instructions Intake',
    subtitle: 'Upload Hospital Summaries for AI Extraction',
  },
  '/care-plan': {
    title: 'Clinical Care Plan Verification',
    subtitle: 'Review & Confirm Plain-Language Instructions',
  },
  '/appointments': {
    title: 'Doctor Appointments & Feedback',
    subtitle: 'Track Clinical Follow-ups & Post-Visit Vitals',
  },
  '/reminders': {
    title: 'Timed Care Schedule & Email Alerts',
    subtitle: 'Morning, Midday, Evening & Bedtime Medication Timings',
  },
  '/ai-assistant': {
    title: 'CareBridge Clinical AI Assistant',
    subtitle: 'Real-time Recovery Q&A powered by Gemini 3.8 Flash',
  },
  '/caregiver': {
    title: 'Caregiver Health & Appointment Bridge',
    subtitle: 'Vitals Aggregate, Medication Stock & Doctor Appointment Booking',
  },
  '/doctor': {
    title: 'Doctor & Clinician Consultation Portal',
    subtitle: 'Review Caretaker Requests, Confirm Available Slots & Clinical Records',
  },
  '/settings': {
    title: 'System Settings & Outbound Email Relay',
    subtitle: 'Live SMTP Configuration, AI Engine & Dispatch Audit Logs',
  },
};

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentMeta = PAGE_TITLES[location.pathname] || {
    title: 'CareBridge Recovery Portal',
    subtitle: 'AI-Powered After-Hospital Care',
  };

  return (
    <div className="min-h-screen bg-[#F7F8FF] flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen min-w-0">
        <TopNavigation
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        <footer className="px-4 lg:px-8 py-6 border-t border-[#ECEAFC] text-center text-xs text-[#73758E] bg-white/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 CareBridge AI Healthcare Systems. All clinical rights reserved.</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-[#278567] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#278567]"></span>
                Gemini 3.8 Flash Engine
              </span>
              <span>•</span>
              <span>HIPAA / Data Privacy Protocol Compliant</span>
            </div>
          </div>
        </footer>

        {/* Global Floating AI Chat Widget */}
        <FloatingAIChat />
      </div>
    </div>
  );
};
