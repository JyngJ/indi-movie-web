'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

/** SortToggle 2.0 (2026-08-08 피그마 확정) — 텍스트 pill 정렬·필터 토글 ("최신순 ↓"·"예매 가능만").
 *  h28 pill, fs meta(12)/500. default=캡션색 · active=primary. hover=hover-raise(면 200). */

interface SortToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

export function SortToggle({ active = false, children, className = '', style, ...props }: SortToggleProps) {
  return (
    <button
      type="button"
      className={`
        inline-flex items-center gap-1 rounded-[var(--radius-pill)]
        bg-transparent hover:bg-[var(--color-surface-raised)] active:bg-[var(--color-neutral-300)]
        transition-colors duration-150 cursor-pointer
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      style={{
        height: 'var(--comp-sort-h)',
        minHeight: 'var(--comp-sort-h)',
        paddingLeft: 'var(--comp-sort-px)',
        paddingRight: 'var(--comp-sort-px)',
        fontSize: 'var(--text-meta)',
        fontWeight: 500,
        color: active ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
        border: 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
