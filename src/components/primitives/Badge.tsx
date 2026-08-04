'use client'

import { HTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  children: ReactNode
}

/* 2.0: 틴트는 불투명 토큰(웜 종이 위에서도 일관), 글자는 딥 스탑 — "틴트 배경 + 900 텍스트" 문법 */
const variantStyles: Record<Variant, { bg: string; color: string }> = {
  default: { bg: 'var(--color-border)',              color: 'var(--color-text-secondary)' },
  success: { bg: 'var(--color-success-tint)',        color: 'var(--color-success-deep)' },
  warning: { bg: 'var(--color-warning-tint)',        color: 'var(--color-warning-deep)' },
  error:   { bg: 'var(--color-error-tint)',          color: 'var(--color-error)' },
  info:    { bg: 'var(--color-primary-subtle-l)',    color: 'var(--color-primary-text)' },
}

export function Badge({ variant = 'default', children, className = '', style, ...props }: BadgeProps) {
  const { bg, color } = variantStyles[variant]
  return (
    <span
      className={`
        inline-flex items-center
        h-5 px-2
        rounded-[var(--radius-pill)]
        text-[11px] font-semibold
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      style={{ backgroundColor: bg, color, ...style }}
      {...props}
    >
      {children}
    </span>
  )
}
