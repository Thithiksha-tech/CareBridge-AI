import React from 'react';
import { Menu, Sparkles, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface TopNavigationProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onToggleSidebar,
  title = 'Patient Recovery Portal',
  subtitle = 'AI-Assisted Post-Hospital Care',
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#ECEAFC] px-4 lg:px-8 py-3.5 flex items-center justify-between">
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

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Verification Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#278567]/10 border border-[#278567]/20 text-[#278567] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Gemini 3.8 Flash Online</span>
        </div>

        {/* Quick Upload Action */}
        <Link
          to="/upload"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#665BE8] hover:bg-[#584ddb] text-white text-xs font-semibold shadow-soft hover:shadow-elevated transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upload PDF</span>
        </Link>

        {/* Notifications */}
        <Link
          to="/reminders"
          className="p-2 rounded-xl text-[#73758E] hover:text-[#665BE8] hover:bg-[#F0EEFF] transition-colors relative"
          title="Care Reminders & Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#665BE8]" />
        </Link>

        {/* User Avatar */}
        <Link to="/settings" className="flex items-center gap-2 pl-2 border-l border-[#F0EEFF]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-semibold text-[#24264A] hidden md:inline">
            {user?.name?.split(' ')[0] || 'Patient'}
          </span>
        </Link>
      </div>
    </header>
  );
};
