import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileCheck2,
  CalendarDays,
  BellRing,
  BotMessageSquare,
  Users,
  Settings,
  LogOut,
  Sparkles,
  ShieldAlert,
  Stethoscope,
  Activity,
  HeartPulse,
  History,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isDoctor = user?.role === 'doctor' || user?.role === 'clinician';
  const isCaretaker = user?.role === 'caretaker' || user?.role === 'caregiver';

  // Strict role-segregated navigation items as requested
  let navItems = [
    { label: 'Patient Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: 'Vitals & SOS' },
    { label: 'Upload Discharge', path: '/upload', icon: UploadCloud },
    { label: 'Timed Pill Reminders', path: '/reminders', icon: BellRing },
    { label: 'AI Recovery Chatbot', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
    { label: 'Settings & Email', path: '/settings', icon: Settings },
  ];

  if (isDoctor) {
    navItems = [
      { label: 'Doctor Workspace', path: '/doctor', icon: Stethoscope, badge: 'Alerts & Records' },
      { label: 'Schedule & Calendar', path: '/appointments', icon: CalendarDays },
      { label: 'AI Clinical Assistant', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
      { label: 'Settings & Email', path: '/settings', icon: Settings },
    ];
  } else if (isCaretaker) {
    navItems = [
      { label: 'Caretaker Dashboard', path: '/caregiver', icon: Users, badge: 'Graph & Refills' },
      { label: 'Book Appointments', path: '/appointments', icon: CalendarDays },
      { label: 'Review Care Plan', path: '/care-plan', icon: FileCheck2 },
      { label: 'Timed Pill Schedule', path: '/reminders', icon: BellRing },
      { label: 'AI Care Assistant', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
      { label: 'Settings & Email', path: '/settings', icon: Settings },
    ];
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isDoctor) {
      return {
        name: 'Attending Physician',
        emoji: '🩺',
        color: 'from-[#373B8F] to-[#665BE8]',
        roleText: 'Doctor Mode'
      };
    }
    if (isCaretaker) {
      return {
        name: 'Family Caretaker',
        emoji: '🤝',
        color: 'from-[#278567] to-[#2E9B79]',
        roleText: 'Caretaker Mode'
      };
    }
    return {
      name: 'Recovering Patient',
      emoji: '🧑‍🦽',
      color: 'from-[#665BE8] to-[#8C91F5]',
      roleText: 'Patient Mode'
    };
  };

  const roleInfo = getRoleBadge();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#24264A]/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white border-r border-[#ECEAFC] z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#F0EEFF] flex items-center justify-between">
          <NavLink to={isDoctor ? '/doctor' : isCaretaker ? '/caregiver' : '/dashboard'} className="flex items-center gap-3 group">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${roleInfo.color} flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-[#24264A] tracking-tight">CareBridge</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F0EEFF] text-[#665BE8] px-1.5 py-0.5 rounded-md">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-[#73758E] font-medium">{roleInfo.name}</p>
            </div>
          </NavLink>
        </div>

        {/* Role Highlight Pill */}
        <div className="px-5 pt-4">
          <div className="px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#ECEAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{roleInfo.emoji}</span>
              <span className="text-xs font-bold text-[#24264A]">{roleInfo.roleText}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#665BE8] border border-[#DCD6FC]">
              Active
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#73758E]">
            {isDoctor ? 'Clinical Operations' : isCaretaker ? 'Caretaker Operations' : 'Patient Recovery'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${roleInfo.color} text-white shadow-soft`
                      : 'text-[#73758E] hover:text-[#24264A] hover:bg-[#F0EEFF]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#8C91F5]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className="text-[10px] bg-[#F0EEFF] text-[#665BE8] font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#665BE8] animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Clinical Disclaimer Banner */}
        <div className="p-3.5 mx-4 mb-3 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#665BE8] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#373B8F] leading-tight font-medium">
            {isDoctor
              ? 'Conflict detection active: Double-booked dates will trigger scheduling warnings.'
              : isCaretaker
              ? 'Medication stock & patient recovery graph synced for your doctor visits.'
              : 'Emergency SOS and vital checks have direct contact to caretaker & doctor.'}
          </p>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#F0EEFF] bg-gradient-to-b from-white to-[#F7F8FF]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs`}>
                {roleInfo.emoji}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-[#24264A] truncate">{user?.name || (isDoctor ? 'Dr. Sarah Jenkins' : isCaretaker ? 'Sarah Davis' : 'Robert Davis')}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#665BE8] uppercase tracking-wider">
                    {user?.role || 'patient'}
                  </span>
                  {user?.isEmailVerified && (
                    <span className="text-[9px] bg-[#278567]/15 text-[#278567] font-bold px-1.5 py-0.2 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 rounded-xl text-[#73758E] hover:text-[#C94C62] hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
