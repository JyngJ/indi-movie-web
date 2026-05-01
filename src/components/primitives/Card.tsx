import { HTMLAttributes, ReactNode } from 'react'

type Padding = 'none' | 'sm' | 'md' | 'lg'
type Shadow = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  shadow?: Shadow
  bordered?: boolean
  clickable?: boolean
  children: ReactNode
}

const paddingStyles: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const shadowStyles: Record<Shadow, string> = {
  none: '',
  sm: 'shadow-[var(--shadow-sm)]',
  md: 'shadow-[var(--shadow-md)]',
  lg: 'shadow-[var(--shadow-lg)]',
}

export function Card({
  padding = 'md',
  shadow = 'sm',
  bordered = true,
  clickable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-[var(--color-surface-card)]
        rounded-[var(--radius-lg)]
        ${paddingStyles[padding]}
        ${shadowStyles[shadow]}
        ${bordered ? 'border border-[var(--color-border)]' : ''}
        ${clickable ? 'cursor-pointer active:opacity-80 transition-opacity duration-150' : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </div>
  )
}
