'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ButtonHTMLAttributes } from 'react'
import { IconButton } from './IconButton'

/**
 * 관심(하트) 토글 버튼 — 표시 전용 프리미티브. 상태·로그인 게이트는 호출부(useFavorites)가 담당.
 * 채워진 하트 = --color-error-mid (아이콘용 레드), 빈 하트 = currentColor.
 * variant: ghost(상단바·헤더) / overlay(포스터 위). 모양은 항상 원형 — 하트는 지도 핀·캡슐도
 * 전부 원형이라 사각 8px만 튀었다 (2026-09-01, 피그마 2.0/FavoriteButton과 일치).
 */
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  active: boolean
  onToggle: () => void
  variant?: 'ghost' | 'overlay'
  /** 52는 쓰는 자리가 없어 뺐다 — 하트는 포스터 위 32, 그 밖은 44다 */
  size?: 32 | 44
  /** 접근성 라벨 대상 (예: 영화 제목) */
  label: string
}

export function FavoriteButton({ active, onToggle, variant = 'ghost', size = 44, label, ...rest }: Props) {
  const reduce = useReducedMotion()
  const iconSize = size === 32 ? 18 : 22
  /* 포스터 위(overlay)에서는 흰 테두리를 두른다. 배경 그림을 통제할 수 없어서
     빈 하트는 회색 선이 어두운 포스터에 묻히고, 채운 하트는 붉은 포스터에 묻힌다.
     PosterChip이 모든 톤에 흰 글자를 쓰는 것과 같은 이유다 */
  const onPoster = variant === 'overlay'
  return (
    <IconButton
      variant={variant}
      /* 포스터 위에서는 이 원형 면이 하트의 탭 영역을 알려주는 유일한 단서다 */
      shape="round"
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
        stroke={onPoster ? 'var(--color-on-accent)' : active ? 'var(--color-error-mid)' : 'currentColor'}
        strokeWidth={1.75}
        /* 흰 선만으로는 밝은 포스터에서 사라진다 — 얇은 그림자로 경계를 세운다 */
        style={onPoster ? { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' } : undefined}
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
