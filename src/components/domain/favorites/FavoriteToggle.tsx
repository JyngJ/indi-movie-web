'use client'

import { FavoriteButton } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import type { FavoriteItemType } from '@/lib/favorites/types'

const LOGIN_COPY: Record<FavoriteItemType, string> = {
  movie: '관심 영화로 등록하면 새로 상영하는 곳이 생길 때 알려드려요.',
  theater: '관심 극장으로 등록하면 새 상영작 소식을 알려드려요.',
  director: '관심 감독으로 등록하면 이 감독 영화가 상영될 때 알려드려요.',
}

/**
 * 영화/극장 하트 — useFavorites + FavoriteButton 결합. 비로그인 클릭은 훅이 로그인 시트로 보낸다.
 * 상세 상단바·극장 시트 헤더·(P2-c) 카드 오버레이에서 이거 하나로 쓴다.
 */
export function FavoriteToggle({
  type,
  id,
  label,
  variant = 'ghost',
  size = 44,
}: {
  type: FavoriteItemType
  id: string
  label: string
  variant?: 'ghost' | 'overlay'
  size?: 32 | 44 | 52
}) {
  const { isFavorite, toggle } = useFavorites()
  return (
    <FavoriteButton
      active={isFavorite(type, id)}
      onToggle={() => toggle(type, id, { loginDescription: LOGIN_COPY[type] })}
      variant={variant}
      size={size}
      label={label}
    />
  )
}
