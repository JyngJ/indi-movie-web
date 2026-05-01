'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, className = '', id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[var(--color-text-disabled)] pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-11
            bg-[var(--color-surface-card)]
            text-[var(--color-text-primary)]
            text-[var(--text-base)]
            border rounded-[var(--radius-md)]
            outline-none transition-all duration-150
            placeholder:text-[var(--color-text-disabled)]
            ${error
              ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-1 focus:ring-[var(--color-error)]'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary-base)] focus:ring-1 focus:ring-[var(--color-primary-base)]/30'
            }
            ${leftIcon ? 'pl-10' : 'pl-3'}
            ${rightIcon ? 'pr-10' : 'pr-3'}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
          {...props}
        />

        {rightIcon && (
          <span className="absolute right-3 text-[var(--color-text-disabled)]">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[var(--text-xs)] text-[var(--color-error)]">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[var(--text-xs)] text-[var(--color-text-disabled)]">{hint}</p>
      )}
    </div>
  )
})
