import React from 'react';
import { Menu, Sparkles, Bell, ShieldCheck, Stethoscope, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface TopNavigationProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onToggleSidebar,
}) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'patient';

  const getRoleHeader = () => {
    if (currentRole === 'doctor' || currentRole === 'clinician') {
      return {
        title: 'Attending Physician Workspace',
        subtitle: 'Schedule Management, Patient Records & Urgent Notifications'
      };
    }
    if (currentRole === 'caretaker' || currentRole === 'caregiver') {
      return {
        title: 'Family Caretaker Dashboard',
        subtitle: 'Timed Pills, Stock Refills, Recovery Graph & Doctor Briefings'
      };
    }
    return {
      title: 'Patient Recovery Portal',
      subtitle: 'Discharge Summaries, Daily BP & Sugar Check & Timed Reminders'
    };
  };

  const { title, subtitle } = getRoleHeader();

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#ECEAFC] px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-xl text-[#73758E] hover:text-[#24264A] hover:bg-[#F0EEFF] lg:hidden transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base lg:text-lg font-bold text-[#24264A] tracking-tight">{title}</h1>
          <p className="text-xs text-[#73758E] hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Secured Authenticated Role Indicator (Strict Role Security - No Manual Switching) */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${
          currentRole === 'doctor' || currentRole === 'clinician'
            ? 'bg-[#F0F1FA] border-[#D1D4EB] text-[#373B8F]'
            : currentRole === 'caretaker' || currentRole === 'caregiver'
            ? 'bg-[#EBF7F2] border-[#C2E8D9] text-[#278567]'
            : 'bg-[#F0EEFF] border-[#DCD6FC] text-[#665BE8]'
        }`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="hidden sm:inline text-slate-500 font-normal">Account Role:</span>
          <span className="font-bold flex items-center gap-1">
            {currentRole === 'doctor' || currentRole === 'clinician' ? (
              <>
                <Stethoscope className="w-3.5 h-3.5 inline" />
                <span>Physician (Doctor)</span>
              </>
            ) : currentRole === 'caretaker' || currentRole === 'caregiver' ? (
              <>
                <Users className="w-3.5 h-3.5 inline" />
                <span>Caretaker / Family</span>
              </>
            ) : (
              <>
                <UserIcon className="w-3.5 h-3.5 inline" />
                <span>Patient Account</span>
              </>
            )}
          </span>
        </div>

        {/* Verification Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#278567]/10 border border-[#278567]/20 text-[#278567] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Gemini 3.8 Flash Active</span>
        </div>

        {/* Quick Upload Action (Only on Patient view) */}
        {currentRole === 'patient' && (
          <Link
            to="/upload"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#665BE8] hover:bg-[#584ddb] text-white text-xs font-semibold shadow-soft hover:shadow-elevated transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upload Discharge</span>
          </Link>
        )}

        {/* Notifications */}
        <Link
          to={currentRole === 'doctor' ? '/doctor' : '/reminders'}
          className="p-2 rounded-xl text-[#73758E] hover:text-[#665BE8] hover:bg-[#F0EEFF] transition-colors relative"
          title="Notifications & Schedule"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#665BE8]" />
        </Link>

        {/* User Profile */}
        <Link to="/settings" className="flex items-center gap-2 pl-2 border-l border-[#F0EEFF]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-semibold text-[#24264A] hidden lg:inline">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </Link>
      </div>
    </header>
  );
};

export default TopNavigation;
