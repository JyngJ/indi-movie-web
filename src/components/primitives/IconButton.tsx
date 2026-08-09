'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

/** IconButton 2.0 (2026-08-08 피그마 확정) — 아이콘 전용 버튼 49곳 통합.
 *  variant: ghost(투명 — 뒤로가기·지우기류) / overlay(black 6% 면 — 닫기 ×). 둘 다 r8 사각 (2026-08-09 원형 폐지 — 버튼과 나란히 설 때 도형 충돌)
 *  size: 32 / 44. 상태: ghost는 hover-raise 계열(투명→200→300), overlay는 state-layer(6→10→14%).
 *  aria-label 필수 — 아이콘만 있어서 접근성 라벨 없으면 안 됨. */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'overlay'
  size?: 32 | 44
  'aria-label': string
  children: ReactNode
}

const variantStyles = {
  ghost: `
    rounded-[var(--comp-btn-radius)] bg-transparent
    hover:bg-[var(--color-surface-raised)]
    active:bg-[var(--color-neutral-300)]
  `,
  overlay: `
    rounded-[var(--comp-btn-radius)] bg-[var(--color-surface-overlay)]
    hover:bg-[var(--color-surface-overlay-hover)]
    active:bg-[var(--color-surface-overlay-pressed)]
  `,
}

export function IconButton({
  variant = 'ghost',
  size = 44,
  children,
  className = '',
  style,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center shrink-0
        text-[var(--color-text-body)] transition-colors duration-150 cursor-pointer
        ${variantStyles[variant]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      style={{ width: size, height: size, minHeight: size, border: 'none', ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
