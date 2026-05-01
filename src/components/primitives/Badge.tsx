import { HTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-[var(--color-border)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  error:   'bg-[var(--color-error)]/15 text-[var(--color-error)]',
  info:    'bg-[var(--color-info)]/15 text-[var(--color-info)]',
}

export function Badge({
  variant = 'default',
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        h-5 px-2
        rounded-[var(--radius-full)]
        text-[var(--text-xs)] font-semibold
        ${variantStyles[variant]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </span>
  )
}
