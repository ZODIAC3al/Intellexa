'use client';

import React from 'react';
import Logo from '@/components/ui/Logo';
import { motion, useReducedMotion } from 'framer-motion';

function FloatingOrbs({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl"
        animate={reduceMotion ? {} : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-secondary/10 blur-3xl"
        animate={reduceMotion ? {} : { x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="flex h-screen w-screen bg-base-100 overflow-hidden font-sans">
      {/* Left panel (visual intro) */}
      <div className="hidden lg:flex lg:w-1/2 bg-base-200 relative items-center justify-center p-12 overflow-hidden border-r border-neutral">
        <FloatingOrbs reduceMotion={reduceMotion} />

        <div className="flex flex-col gap-6 max-w-md z-10">
          <Logo size="lg" />
          <h1 className="text-3xl font-black text-base-content mt-4 leading-tight">
            Cloud speed or local privacy — one workbench.
          </h1>
          <p className="text-sm text-neutral-content leading-relaxed">
            Query multiple collections, compare assistants side by side, review raw chunks before execution, and keep control of your personal data.
          </p>
        </div>
      </div>

      {/* Right panel (form container) */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[380px] flex flex-col gap-6">
          <div className="lg:hidden flex justify-center mb-2">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
