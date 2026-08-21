'use client'

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react'

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
  /* 예전엔 id를 레이블 문자열에서 만들었다. label이 없으면 id가 undefined가 되어
     htmlFor 짝이 조용히 끊겼고, 한 화면에 같은 레이블이 둘이면 id가 겹쳤다.
     useId는 렌더마다 같은 값을 주면서 문서 안에서 유일하다. */
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  /* 아래 렌더와 같은 규칙 — 오류가 있으면 힌트는 그리지 않으므로 설명도 오류만 가리킨다 */
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[length:var(--text-body)] font-medium text-[var(--color-text-primary)]"
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
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`
            w-full h-11
            bg-[var(--color-surface-card)]
            text-[var(--color-text-primary)]
            text-[length:var(--text-body)]
            border rounded-[var(--radius-control)]
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
        <p id={errorId} className="text-[length:var(--text-caption)] text-[var(--color-error)]">{error}</p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-[length:var(--text-caption)] text-[var(--color-text-disabled)]">{hint}</p>
      )}
    </div>
  )
})
