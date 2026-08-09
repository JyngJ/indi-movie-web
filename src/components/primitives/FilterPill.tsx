'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

/** FilterPill 2.0 — 피그마 2.0/FilterPill·FilterButton 대응 (h28 pill).
 *  off: 투명 + neutral/300 보더 + caption색 / active: primary/100 + 700 보더 + primary/900.
 *  시트·리스트 위 필터 토글("예매 가능만 보기"·"필터") 전용 — 선택 칩(장르 등)은 Chip. */

interface FilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

export function FilterPill({ active = false, children, className = '', style, ...props }: FilterPillProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer ${className}`}
      style={{
        height: 28,
        minHeight: 28,
        paddingLeft: 'var(--spacing-3)',
        paddingRight: 'var(--spacing-3)',
        borderRadius: 'var(--radius-pill)',
        border: active ? '1px solid var(--color-primary-base)' : '1px solid var(--color-neutral-300)',
        backgroundColor: active ? 'var(--color-primary-subtle-l)' : 'transparent',
        color: active ? 'var(--color-primary-900)' : 'var(--color-text-caption)',
        fontSize: 'var(--text-meta)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
