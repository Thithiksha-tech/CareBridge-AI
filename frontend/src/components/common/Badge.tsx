import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'lavender';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
}) => {
  const variants = {
    primary: 'bg-[#8C91F5]/15 text-[#373B8F] border border-[#8C91F5]/30',
    success: 'bg-[#278567]/15 text-[#278567] border border-[#278567]/30',
    warning: 'bg-[#C58A30]/15 text-[#C58A30] border border-[#C58A30]/30',
    error: 'bg-[#C94C62]/15 text-[#C94C62] border border-[#C94C62]/30',
    neutral: 'bg-gray-100 text-[#73758E] border border-gray-200',
    lavender: 'bg-[#F0EEFF] text-[#665BE8] border border-[#DCD6FC]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-xs px-3 py-1 rounded-full font-semibold',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
