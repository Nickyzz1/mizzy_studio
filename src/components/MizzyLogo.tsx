import React from 'react';

export const MizzyLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="inline-flex select-none items-center gap-2.5">
    <span className="neon-logo relative flex size-8 items-center justify-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/20 via-bg-card to-bg-subtle transition-all">
      <svg viewBox="0 0 28 28" fill="none" className="size-[18px]" aria-hidden="true">
        <path
          d="M4.5 21V7L10.5 14.5L14 10"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-primary"
        />
        <path d="M15.5 8.5L23.5 14L15.5 19.5V8.5Z" fill="currentColor" className="text-accent" />
      </svg>
    </span>
    {!compact && (
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[17px] font-extrabold tracking-tight text-text-primary">
          MIZZY
        </span>
        <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-accent">
          STUDIO
        </span>
      </div>
    )}
  </div>
);
