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
      className={`inline-flex items-center border transition-colors duration-150 filter-chip ${className}`}
      style={{
        /* 호버는 filter-chip 클래스(--chip-bg/-hover)가 그린다 — 인라인 bg로 박으면 hover가 못 이긴다 */
        ['--chip-bg' as string]: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-bg)',
        ['--chip-bg-hover' as string]: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        /* height 대신 padding으로 세로 크기 제어 — 전역 button min-height(44) 무력화 필수 */
        minHeight: 'unset',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 'var(--comp-chip-px)',
        paddingRight: 'var(--comp-chip-px)',
        borderRadius: 'var(--comp-chip-radius)',
        fontSize: 'var(--comp-chip-font-size)',
        fontWeight: 500,
        lineHeight: 1.2,
        gap: 4,
        color: selected ? 'var(--color-primary-text)' : 'var(--color-text-body)',
        borderColor: selected ? 'var(--color-primary-base)' : 'var(--color-neutral-300)',
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
            backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 18%, transparent)',
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
