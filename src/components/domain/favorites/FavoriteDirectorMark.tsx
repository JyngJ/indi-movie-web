'use client'

import { Icon } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * 감독 이름 옆 관심 하트 (2026-09-08). 관심 극장 하트(FilmsMovieDetailClient)와 같은 꼴.
 *
 * 지도 포스터의 하트는 관심 영화뿐 아니라 관심 감독의 작품에도 붙는데
 * (PosterGrid의 isFavMovie), 상세 화면의 관심 버튼은 영화만 본다.
 * 관심 영화로 등록한 적 없는 영화에 하트가 떠 있는 이유를 여기서 설명한다.
 */
export function FavoriteDirectorMark({ name, size = 14 }: { name: string; size?: number }) {
  const { isFavorite } = useFavorites()
  if (!isFavorite('director', name)) return null
  return (
    <Icon
      name="heart"
      size={size}
      fill="var(--color-error-mid)"
      color="var(--color-error-mid)"
      label="관심 감독"
      style={{ flexShrink: 0 }}
    />
  )
}
