'use client'

import type { CSSProperties } from 'react'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * 극장 시트 액션 행용 "관심" 버튼 — 길찾기·공유하기·인스타그램과 같은 actionBtn 스타일을 그대로 받는다.
 * (피그마 G 확정: 하트는 상단바가 아니라 액션 행)
 */
export function TheaterFavoriteAction({ theaterId, style }: { theaterId: string; style: CSSProperties; compact?: boolean }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite('theater', theaterId)
  return (
    <button
      type="button"
      className="hover-raise"
      style={{ ...style, color: active ? 'var(--color-error-mid)' : style.color }}
      aria-pressed={active}
      onClick={() => toggle('theater', theaterId, { loginDescription: '관심 극장으로 등록하면 새 상영작 소식을 알려드려요.' })}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {active ? '관심 극장' : '관심'}
    </button>
  )
}
