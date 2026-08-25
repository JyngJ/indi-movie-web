'use client'

import { useMemo } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { useFavorites } from '@/hooks/useFavorites'
import type { Movie } from '@/types/api'

/**
 * 상영작 탭 "내 관심 영화 상영 소식" (IA 22).
 * 로그인 + 관심 영화 중 (선택 지역에서) 상영 중인 게 있을 때만 렌더. 없으면 null — 빈 섹션 안 띄운다.
 */
export function FavoriteMoviesSection({
  movies,
  activeMovieIds,
  isDesktop,
  onMovieClick,
}: {
  movies: Movie[]
  activeMovieIds: string[]
  isDesktop: boolean
  onMovieClick: (movieId: string) => void
}) {
  const { favorites, signedIn } = useFavorites()

  const list = useMemo(() => {
    if (!signedIn) return []
    const active = new Set(activeMovieIds)
    const favIds = favorites.filter((f) => f.type === 'movie' && active.has(f.id)).map((f) => f.id)
    const byId = new Map(movies.map((m) => [m.id, m]))
    return favIds.map((id) => byId.get(id)).filter((m): m is Movie => !!m)
  }, [signedIn, favorites, activeMovieIds, movies])

  if (list.length === 0) return null

  return (
    <CurationSectionRow
      id="favorite-movies"
      title="내 관심 영화, 지금 상영 중"
      movies={list}
      isDesktop={isDesktop}
      onMovieClick={onMovieClick}
    />
  )
}
