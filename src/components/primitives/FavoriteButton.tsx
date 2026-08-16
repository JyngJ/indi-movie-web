'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ButtonHTMLAttributes } from 'react'
import { IconButton } from './IconButton'

/**
 * 관심(하트) 토글 버튼 — 표시 전용 프리미티브. 상태·로그인 게이트는 호출부(useFavorites)가 담당.
 * 채워진 하트 = --color-error-mid (아이콘용 레드), 빈 하트 = currentColor.
 * variant: ghost(상단바·헤더) / overlay(포스터 위).
 */
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  active: boolean
  onToggle: () => void
  variant?: 'ghost' | 'overlay'
  size?: 32 | 44 | 52
  /** 접근성 라벨 대상 (예: 영화 제목) */
  label: string
}

export function FavoriteButton({ active, onToggle, variant = 'ghost', size = 44, label, ...rest }: Props) {
  const reduce = useReducedMotion()
  const iconSize = size === 32 ? 18 : 22
  return (
    <IconButton
      variant={variant}
      size={size}
      aria-label={active ? `${label} 관심 해제` : `${label} 관심 등록`}
      aria-pressed={active}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      {...rest}
    >
      <motion.svg
        key={active ? 'on' : 'off'}
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={active ? 'var(--color-error-mid)' : 'none'}
        stroke={active ? 'var(--color-error-mid)' : 'currentColor'}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { scale: active ? 0.7 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </motion.svg>
    </IconButton>
  )
}
