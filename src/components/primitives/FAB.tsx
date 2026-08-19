'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

const IconSwap = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h14l-3-3M20 16H6l3 3" />
  </svg>
)

// ─── Round FAB ────────────────────────────────────────────────────────

interface FabRoundProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function FabRound({ children, className = '', style, ...props }: FabRoundProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center border transition-opacity duration-150 active:opacity-70 ${className}`}
      style={{
        width: 'var(--comp-fab-round-size)',
        height: 'var(--comp-fab-round-size)',
        borderRadius: '50%',
        backgroundColor: 'var(--color-surface-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--color-text-body)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
