'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

/** Button 2.0 (2026-08-08 피그마 확정)
 *  variant: primary(솔리드 CTA) / secondary(소프트 면 150) / tertiary(그레이스케일 면 200)
 *           / text(투명, tertiary 액션) / danger(확인 모달 전용 — 목록 안 파괴 액션은 secondary·text로)
 *  size: sm 32 / md 44 / lg 52 / full(모바일 풀폭 = lg 스펙 + w-full)
 *  상태: hover·pressed = 단계 다크닝, disabled = 40% 불투명. 'ghost'는 text의 구명칭 alias. */

type Variant = 'primary' | 'secondary' | 'tertiary' | 'text' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'full'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variantStyles: Record<Exclude<Variant, 'ghost'>, string> = {
  primary: `
    bg-[var(--color-primary-base)] text-[var(--color-text-inverse)]
    hover:bg-[var(--color-primary-800)]
    active:bg-[var(--color-primary-900)]
  `,
  secondary: `
    bg-[var(--color-surface-soft)] text-[var(--color-primary-900)]
    hover:bg-[var(--color-surface-raised)]
    active:bg-[var(--color-neutral-300)]
  `,
  tertiary: `
    bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]
    hover:bg-[var(--color-neutral-300)]
    active:bg-[var(--color-neutral-400)]
  `,
  text: `
    bg-transparent text-[var(--color-text-sub)]
    hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-body)]
    active:bg-[var(--color-neutral-300)]
  `,
  danger: `
    bg-[var(--color-error)] text-[var(--color-text-inverse)]
    hover:bg-[var(--color-error-hover)]
    active:bg-[var(--color-error-pressed)]
  `,
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-[var(--comp-btn-px-sm)] text-[length:var(--text-meta)] font-normal',
  md: 'px-[var(--comp-btn-px-md)] text-[length:var(--text-body)] font-medium',
  lg: 'px-[var(--comp-btn-px-lg)] text-[length:var(--text-title)] font-bold',
  full: 'w-full px-[var(--comp-btn-px-lg)] text-[length:var(--text-title)] font-bold',
}

/* 높이는 인라인으로 — 전역 button { min-height: 44 }가 무레이어라 @layer utilities 클래스를 이김 */
const sizeHeights: Record<Size, string> = {
  sm: 'var(--comp-btn-h-sm)',
  md: 'var(--comp-btn-h-md)',
  lg: 'var(--comp-btn-h-lg)',
  full: 'var(--comp-btn-h-lg)',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const v = variant === 'ghost' ? 'text' : variant

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-[var(--comp-btn-gap)]
        rounded-[var(--comp-btn-radius)]
        transition-colors duration-150
        ${variantStyles[v]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      style={{ height: sizeHeights[size], minHeight: sizeHeights[size], ...style }}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
