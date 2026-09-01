'use client'

import type { CSSProperties } from 'react'
import { useFavorites } from '@/hooks/useFavorites'
import { Button, Icon } from '@/components/primitives'

/**
 * 극장 시트 액션 행용 "관심" 버튼 — 길찾기·공유하기·인스타그램과 같은 actionBtn 스타일을 그대로 받는다.
 * (피그마 G 확정: 하트는 상단바가 아니라 액션 행)
 */
export function TheaterFavoriteAction({ theaterId, theaterName, style }: { theaterId: string; theaterName?: string; style: CSSProperties; compact?: boolean }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite('theater', theaterId)
  return (
    <Button
      type="button"
      variant="text"
      size="md"
      style={{ ...style, ...(active ? { color: 'var(--color-error-mid)' } : null) }}
      aria-pressed={active}
      onClick={() => toggle('theater', theaterId, { loginDescription: '관심 극장으로 등록하면 새 상영작 소식을 알려드려요.', label: theaterName })}
    >
      <Icon name="heart" size={14} fill="currentColor" color="currentColor" strokeWidth={0} />
      {active ? '관심 극장' : '관심'}
    </Button>
  )
}
