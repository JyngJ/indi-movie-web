'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

/** IconButton 2.0 — 아이콘 전용 버튼.
 *  variant: ghost(투명 — 뒤로가기·지우기류) / overlay(black 6% 면 — 닫기 ×)
 *  shape: square(r8 — 기본, 버튼과 나란히 설 때) / round(원형 — 단독 배치·스크림 위)
 *  size: 32 / 44 / 52 — Button의 sm·md·lg 높이와 같은 스케일. 나란히 설 때 높이가 맞아야 한다.
 *  상태: ghost는 hover-raise 계열, overlay는 state-layer(6→10→14%).
 *  aria-label 필수 — 아이콘만 있어서 접근성 라벨 없으면 안 됨. */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'overlay'
  shape?: 'square' | 'round'
  size?: 32 | 44 | 52
  'aria-label': string
  children: ReactNode
}

const variantStyles = {
  ghost: `
    bg-transparent
    hover:bg-[var(--color-surface-raised)]
    active:bg-[var(--color-neutral-300)]
  `,
  overlay: `
    bg-[var(--color-surface-overlay)]
    hover:bg-[var(--color-surface-overlay-hover)]
    active:bg-[var(--color-surface-overlay-pressed)]
  `,
}

export function IconButton({
  variant = 'ghost',
  shape = 'square',
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
        ${shape === 'round' ? 'rounded-full' : 'rounded-[var(--comp-btn-radius)]'}
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
