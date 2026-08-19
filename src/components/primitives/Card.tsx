'use client'

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

/* clickable 카드의 상태 표현.
   누를 수 있으면 눌리는 게 보여야 한다 — hover에서 한 단계 뜨고(그림자 sm→md, 1px 상승),
   누르는 순간 도로 내려앉으며 면이 눌린 톤으로 바뀐다. 예전에는 active:opacity-80 하나뿐이라
   카드 전체가 흐려졌다: 글자까지 같이 흐려져 "비활성"처럼 읽혔다. */
const clickableStyles = `
  cursor-pointer select-none
  transition-[box-shadow,transform,background-color] duration-150
  hover:shadow-[var(--shadow-md)] hover:-translate-y-px
  active:translate-y-0 active:shadow-[var(--shadow-sm)] active:bg-[var(--color-surface-raised)]
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-base)]
`

export function Card({
  padding = 'md',
  shadow = 'sm',
  bordered = true,
  clickable = false,
  children,
  className = '',
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  // 누를 수 있는 카드는 키보드로도 눌려야 한다 — div는 기본으로 포커스를 못 받는다.
  const interactive = clickable && !!onClick

  return (
    <div
      className={`
        bg-[var(--color-surface-card)]
        rounded-[var(--radius-control)]
        ${paddingStyles[padding]}
        ${shadowStyles[shadow]}
        ${bordered ? 'border border-[var(--color-border)]' : ''}
        ${clickable ? clickableStyles : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      onClick={onClick}
      role={interactive ? 'button' : props.role}
      tabIndex={interactive ? (props.tabIndex ?? 0) : props.tabIndex}
      onKeyDown={interactive
        ? e => {
            onKeyDown?.(e)
            if (e.defaultPrevented) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.currentTarget.click()
            }
          }
        : onKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}
