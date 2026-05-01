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

// ─── Pill FAB ────────────────────────────────────────────────────────

interface FabPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  leftLabel?: string
  rightLabel?: string
}

export function FabPill({
  leftLabel = '극장 탐색',
  rightLabel = '영화 탐색',
  className = '',
  style,
  ...props
}: FabPillProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 border transition-opacity duration-150 active:opacity-70 ${className}`}
      style={{
        height: 'var(--comp-fab-pill-height)',
        paddingLeft: 'var(--comp-fab-pill-pl)',
        paddingRight: 'var(--comp-fab-pill-pr)',
        borderRadius: 'var(--comp-fab-pill-radius)',
        backgroundColor: 'var(--color-surface-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        ...style,
      }}
      {...props}
    >
      <span
        className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full"
        style={{ backgroundColor: 'var(--color-primary-subtle-l)', color: 'var(--color-primary-base)' }}
      >
        <IconSwap />
      </span>
      <span>{leftLabel}</span>
      <span style={{ color: 'var(--color-text-caption)', fontWeight: 500 }}>↔</span>
      <span style={{ color: 'var(--color-text-caption)', fontWeight: 500 }}>{rightLabel}</span>
    </button>
  )
}
