import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'icon+wordmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ variant = 'icon+wordmark', size = 'md', className = '' }: LogoProps) {
  const sizeMap = {
    sm: { box: 24, font: 'text-xs', iconSize: 12 },
    md: { box: 34, font: 'text-sm', iconSize: 16 },
    lg: { box: 48, font: 'text-lg', iconSize: 22 },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
      {/* 1:1 square icon mark with violet background */}
      <div
        style={{ width: currentSize.box, height: currentSize.box }}
        className="rounded-xl bg-primary flex items-center justify-center text-primary-content font-sans font-black shadow-sm relative overflow-hidden"
      >
        <span className="z-10 leading-none" style={{ fontSize: currentSize.iconSize }}>
          I
        </span>
        {/* Subtle background retrieval graphic graph line indicator */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <line x1="20" y1="80" x2="50" y2="40" stroke="currentColor" strokeWidth="6" />
            <line x1="50" y1="40" x2="80" y2="20" stroke="currentColor" strokeWidth="6" />
            <circle cx="20" cy="80" r="10" fill="currentColor" />
            <circle cx="50" cy="40" r="10" fill="currentColor" />
            <circle cx="80" cy="20" r="10" fill="currentColor" />
          </svg>
        </div>
      </div>

      {variant === 'icon+wordmark' && (
        <div className="flex flex-col">
          <span className={`font-sans font-black tracking-wider leading-none text-base-content uppercase ${currentSize.font}`}>
            INTELLEXA
          </span>
          <span className="text-[7px] font-mono tracking-tighter uppercase mt-0.5 leading-none text-neutral-content whitespace-nowrap">
            ai workbench
          </span>
        </div>
      )}
    </div>
  );
}
