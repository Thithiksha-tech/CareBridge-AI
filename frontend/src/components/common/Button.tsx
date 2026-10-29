import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

  const variants = {
    primary: 'bg-[#665BE8] hover:bg-[#584ddb] text-white shadow-soft hover:shadow-elevated focus:ring-[#665BE8]',
    secondary: 'bg-[#F0EEFF] hover:bg-[#e4e0fc] text-[#373B8F] border border-[#DCD6FC] focus:ring-[#8C91F5]',
    outline: 'border-2 border-[#8C91F5] text-[#373B8F] hover:bg-[#F0EEFF] focus:ring-[#8C91F5]',
    danger: 'bg-[#C94C62] hover:bg-[#b83b51] text-white shadow-sm focus:ring-[#C94C62]',
    ghost: 'text-[#373B8F] hover:bg-[#F0EEFF] focus:ring-[#8C91F5]',
    glass: 'bg-white/80 hover:bg-white text-[#24264A] backdrop-blur-md border border-white/60 shadow-sm focus:ring-[#665BE8]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
