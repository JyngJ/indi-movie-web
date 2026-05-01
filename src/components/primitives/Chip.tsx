import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

export function Chip({
  selected = false,
  children,
  className = '',
  ...props
}: ChipProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        h-8 px-3
        rounded-[var(--radius-full)]
        text-[var(--text-sm)] font-medium
        border transition-all duration-150
        ${selected
          ? 'bg-[var(--color-primary-base)] text-[var(--color-text-inverse)] border-[var(--color-primary-base)]'
          : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-base)] hover:text-[var(--color-primary-base)]'
        }
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </button>
  )
}
