'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from '@/components/primitives'

const IconSwap = () => (
  <Icon name="swap" size={12} />
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
