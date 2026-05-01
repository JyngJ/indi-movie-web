'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: `
    bg-[var(--color-primary-base)] text-[var(--color-text-inverse)]
    hover:bg-[var(--color-primary-hover-l)]
    active:opacity-80
  `,
  secondary: `
    bg-transparent text-[var(--color-primary-base)]
    border border-[var(--color-primary-base)]
    hover:bg-[var(--color-primary-subtle-l)]
  `,
  ghost: `
    bg-transparent text-[var(--color-text-body)]
    hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]
  `,
  danger: `
    bg-[var(--color-error)] text-[var(--color-text-inverse)]
    hover:opacity-90
    active:opacity-80
  `,
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-[var(--text-sm)] rounded-[var(--radius-md)]',
  md: 'h-11 px-4 text-[var(--text-base)] rounded-[var(--radius-md)]',
  lg: 'h-14 px-6 text-[var(--text-md)] rounded-[var(--radius-lg)]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-150
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
