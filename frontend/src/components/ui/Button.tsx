'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-violet/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-content shadow-md shadow-primary/10',
    secondary: 'border border-border-hairline bg-surface-2 text-text-primary hover:bg-surface-1 hover:border-border-hairline/80',
    ghost: 'text-text-muted hover:text-text-primary hover:bg-surface-2/60',
    destructive: 'bg-accent-rose hover:bg-accent-rose/90 text-white shadow-md shadow-accent-rose/10',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
