import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  gradient = false,
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl p-6 transition-all duration-200 ${
        gradient
          ? 'bg-gradient-to-br from-[#665BE8] to-[#373B8F] text-white shadow-elevated border border-white/20'
          : 'bg-white text-[#24264A] shadow-soft border border-[#ECEAFC]'
      } ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-elevated hover:border-[#D4D0FA] cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
