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

  let navItems = [
    { label: 'Patient Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Upload Discharge', path: '/upload', icon: UploadCloud, badge: 'New' },
    { label: 'Review Care Plan', path: '/care-plan', icon: FileCheck2 },
    { label: 'Doctor Appointments', path: '/appointments', icon: CalendarDays },
    { label: 'Timed Reminders', path: '/reminders', icon: BellRing },
    { label: 'AI Clinical Assistant', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
    { label: 'Caregiver Portal', path: '/caregiver', icon: Users },
    { label: 'Settings & Email', path: '/settings', icon: Settings },
  ];

  if (isDoctor) {
    navItems = [
      { label: 'Doctor Workspace', path: '/doctor', icon: Stethoscope, badge: 'Clinical' },
      { label: 'Patient Vitals Review', path: '/dashboard', icon: Activity },
      { label: 'Clinical Appointments', path: '/appointments', icon: CalendarDays },
      { label: 'Review Care Plans', path: '/care-plan', icon: FileCheck2 },
      { label: 'AI Clinical Assistant', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
      { label: 'Caretaker Bridge', path: '/caregiver', icon: Users },
      { label: 'Settings & Email', path: '/settings', icon: Settings },
    ];
  } else if (isCaretaker) {
    navItems = [
      { label: 'Caretaker Dashboard', path: '/caregiver', icon: Users, badge: 'Vitals & BP' },
      { label: 'Patient Recovery', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Book Appointments', path: '/appointments', icon: CalendarDays },
      { label: 'Timed Pill Schedule', path: '/reminders', icon: BellRing },
      { label: 'Review Care Plan', path: '/care-plan', icon: FileCheck2 },
      { label: 'AI Clinical Assistant', path: '/ai-assistant', icon: BotMessageSquare, highlight: true },
      { label: 'Settings & Email', path: '/settings', icon: Settings },
    ];
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-[#24264A] tracking-tight">CareBridge</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F0EEFF] text-[#665BE8] px-1.5 py-0.5 rounded-md">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-[#73758E] font-medium">Recovery Care Platform</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#73758E]">
            Clinical Navigation
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
                      ? 'bg-gradient-to-r from-[#665BE8] to-[#8C91F5] text-white shadow-soft'
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
        <div className="p-4 mx-4 mb-3 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#665BE8] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#373B8F] leading-tight font-medium">
            Review all AI care recommendations before confirming your daily regimen.
          </p>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#F0EEFF] bg-gradient-to-b from-white to-[#F7F8FF]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8C91F5] to-[#373B8F] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                {user?.role === 'doctor' ? '🩺' : user?.role === 'caretaker' ? '🤝' : '🧑‍🦽'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-[#24264A] truncate">{user?.name || 'Patient User'}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#665BE8] uppercase tracking-wider">
                    {user?.role || 'Patient'}
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
