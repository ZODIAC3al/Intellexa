'use client';

import React from 'react';

interface StatusPillProps {
  label: string;
  variant?: 'cyan' | 'amber' | 'violet' | 'rose' | 'slate';
  className?: string;
}

export default function StatusPill({
  label,
  variant = 'slate',
  className = '',
}: StatusPillProps) {
  const dotColors = {
    cyan: 'bg-accent-cyan shadow-sm shadow-accent-cyan/40',
    amber: 'bg-accent-amber shadow-sm shadow-accent-amber/40',
    violet: 'bg-accent-violet shadow-sm shadow-accent-violet/40',
    rose: 'bg-accent-rose shadow-sm shadow-accent-rose/40',
    slate: 'bg-text-muted',
  };

  const bgColors = {
    cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
    amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
    rose: 'bg-accent-rose/10 text-accent-rose border-accent-rose/20',
    slate: 'bg-surface-2 text-text-muted border-border-hairline',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${bgColors[variant]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
      <span>{label}</span>
    </div>
  );
}
