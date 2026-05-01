'use client'

import { HTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  children: ReactNode
}

const variantStyles: Record<Variant, { bg: string; color: string }> = {
  default: { bg: 'var(--color-border)',                    color: 'var(--color-text-secondary)' },
  success: { bg: 'rgba(74,124,89,0.15)',                   color: 'var(--color-success)' },
  warning: { bg: 'rgba(217,119,6,0.15)',                   color: 'var(--color-warning)' },
  error:   { bg: 'rgba(185,74,72,0.15)',                   color: 'var(--color-error)' },
  info:    { bg: 'rgba(59,130,246,0.15)',                  color: 'var(--color-info)' },
}

export function Badge({ variant = 'default', children, className = '', style, ...props }: BadgeProps) {
  const { bg, color } = variantStyles[variant]
  return (
    <span
      className={`
        inline-flex items-center
        h-5 px-2
        rounded-[var(--radius-full)]
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
