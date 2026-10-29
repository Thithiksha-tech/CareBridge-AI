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
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const currentRole = user?.role || 'patient';

  const handleSwitchRole = (role: 'patient' | 'caretaker' | 'doctor') => {
    updateUser({ role });
    if (role === 'patient') navigate('/dashboard');
    else if (role === 'caretaker') navigate('/caregiver');
    else if (role === 'doctor') navigate('/doctor');
  };

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
        {/* Dynamic Role Switcher for Seamless Testing & Multi-Role Support */}
        <div className="flex items-center p-1 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] shadow-2xs">
          <button
            onClick={() => handleSwitchRole('patient')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'patient'
                ? 'bg-[#665BE8] text-white shadow-xs'
                : 'text-[#73758E] hover:text-[#24264A]'
            }`}
            title="Switch to Patient View"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Patient</span>
          </button>

          <button
            onClick={() => handleSwitchRole('caretaker')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'caretaker' || currentRole === 'caregiver'
                ? 'bg-[#278567] text-white shadow-xs'
                : 'text-[#73758E] hover:text-[#24264A]'
            }`}
            title="Switch to Caretaker View"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Caretaker</span>
          </button>

          <button
            onClick={() => handleSwitchRole('doctor')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'doctor' || currentRole === 'clinician'
                ? 'bg-[#373B8F] text-white shadow-xs'
                : 'text-[#73758E] hover:text-[#24264A]'
            }`}
            title="Switch to Doctor View"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Doctor</span>
          </button>
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
