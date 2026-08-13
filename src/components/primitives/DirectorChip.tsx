'use client'

import React from 'react'
import { Avatar } from './Avatar'

/**
 * 감독 칩 — 아바타 + 이름, 통째로 감독 상세로 가는 클릭 타깃.
 * 피그마 2.0/MovieCard(개선) 실측: pill · pad 8/12/8/8 · gap 8 · 아바타 24 · caption 12/500.
 *
 * 좌우 패딩이 다른 건 의도다 — 왼쪽은 아바타가 여백을 채우고 오른쪽은 글자만 있어서,
 * 같은 값을 주면 시각적으로 오른쪽이 좁아 보인다. 값은 토큰(--comp-director-chip-pad)에 있다.
 *
 * 예전엔 극장 시트가 이걸 카드 아래 전체폭 행으로 그려서 카드가 한 줄 더 길었다.
 * 감독 표시는 이 밖에도 여러 화면에 흩어져 있다 — 새로 그리지 말고 이걸 쓸 것.
 */

interface DirectorChipProps {
  name: string
  photoUrl?: string | null
  onClick?: () => void
  /** 진행 중 표시 (라우팅 대기 등) */
  pending?: boolean
}

export function DirectorChip({ name, photoUrl, onClick, pending = false }: DirectorChipProps) {
  return (
    <div
      className={onClick ? 'chip-raise' : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick() }
      } : undefined}
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--comp-director-chip-pad)',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: onClick ? undefined : 'var(--color-surface-bg)',
        cursor: onClick ? 'pointer' : undefined,
        maxWidth: '100%',
        /* 피그마 40 — role="button"에 걸리는 전역 min-height 44를 끈다 */
        minHeight: 'auto',
        opacity: pending ? 0.5 : 1,
      }}
    >
      <Avatar name={name} photoUrl={photoUrl} size={24} />
      <span style={{
        fontSize: 'var(--text-caption)',
        fontWeight: 500,
        letterSpacing: '0.4px',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
    </div>
  )
}
