'use client'

import type { ButtonHTMLAttributes } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './FavoriteToggle.module.css'

interface FavoriteToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'> {
  active: boolean
  /** 선택 상태 문구: 관심 영화 · 관심 극장 · 관심 감독 */
  activeLabel: string
}

/** 상세 화면의 관심 토글. 로그인·저장 처리는 호출부가 맡고 모양과 상태 표현만 담당한다. */
export function FavoriteToggle({ active, activeLabel, className = '', ...props }: FavoriteToggleProps) {
  const color = active ? 'var(--comp-favorite-icon-active)' : 'currentColor'
  return (
    <Button {...props} variant="tertiary" size="md" aria-pressed={active} className={`${styles.control} ${className}`}>
      <span className={styles.heart}><Icon name="heart" size={16} fill={color} color={color} strokeWidth={0} /></span>
      <span className={styles.label}>
        {/* 두 상태 중 긴 문구로 폭을 유지한다. 숨긴 문구는 낭독하지 않는다. */}
        <span aria-hidden className={styles.reserve}>관심 등록</span>
        <span aria-hidden className={styles.reserve}>{activeLabel}</span>
        <span className={styles.visible}>{active ? activeLabel : '관심 등록'}</span>
      </span>
    </Button>
  )
}
