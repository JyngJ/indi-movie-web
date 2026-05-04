'use client'

import { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  onDismiss?: () => void
  children: ReactNode
}

export function Chip({ selected = false, onDismiss, children, className = '', onClick, style: externalStyle, ...props }: ChipProps) {
  const handleDismiss = (e: MouseEvent) => {
    e.stopPropagation()
    onDismiss?.()
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center border transition-colors duration-150 ${className}`}
      style={{
        /* height 대신 padding으로 세로 크기 제어 */
        paddingTop: 1,
        paddingBottom: 1,
        paddingLeft: 'var(--comp-chip-px)',
        paddingRight: 'var(--comp-chip-px)',
        borderRadius: 'var(--comp-chip-radius)',
        fontSize: 'var(--comp-chip-font-size)',
        fontWeight: 500,
        lineHeight: 1.2,
        gap: 4,
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        color: selected ? 'var(--color-primary-text)' : 'var(--color-text-body)',
        borderColor: selected ? 'var(--color-primary-base)' : 'var(--color-border)',
        ...externalStyle,
      }}
      onClick={onClick}
      {...props}
    >
      {onDismiss && (
        <span
          onClick={handleDismiss}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          <svg width={8} height={8} viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </span>
      )}
      {children}
    </button>
  )
}
