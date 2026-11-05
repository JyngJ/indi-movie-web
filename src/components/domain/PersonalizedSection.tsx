'use client'

import { useEffect, useMemo, useRef } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { useFavorites } from '@/hooks/useFavorites'
import { trackEvent } from '@/lib/analytics/client'
import { getPersonalizedFilms } from '@/lib/curation/getPersonalizedFilms'
import type { RecentlyViewedEntry } from '@/lib/curation/types'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'
import { pickSimilarViewersMovies } from '@/lib/recommendation/similarViewers'
import { useRecommendationNeighbors } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'

interface PersonalizedSectionProps {
  movies: Movie[]
  activeMovieIds: string[]
  recentlyViewed: RecentlyViewedEntry[]
  /** 최근 인기 순위 (높은 순). 행동 추천 점수에 조금 섞는다 */
  popular: Array<{ movieId: string }>
  isDesktop: boolean
  onMovieClick: (movieId: string) => void
}

type ReasonType = 'similar_viewers' | 'director' | 'nation-era' | 'genre'

/**
 * "이런 작품은 어때요" — 최근 본 영화·관심 영화 기반 개인화 섹션.
 *
 * 1순위: 같은 영화를 본 관객이 함께 본 상영작(EASE + 콘텐츠 + 인기, lib/recommendation).
 *        오프라인 평가에서 recall@10 0.282로 인기순 0.247·규칙 방식 0.171보다 높았다(2026-11-05).
 * 2순위: 이웃 기록이 없으면 규칙 방식(감독 → 국가·시대 → 장르, getPersonalizedFilms).
 * 이력이 없거나 둘 다 비면 아무것도 렌더하지 않는다. recentlyViewed는 클라이언트 effect에서
 * 로드되어 첫 렌더에 항상 [] — hydration 안전.
 */
export function PersonalizedSection({ movies, activeMovieIds, recentlyViewed, popular, isDesktop, onMovieClick }: PersonalizedSectionProps) {
  const { favorites } = useFavorites()
  const recent = useMemo(() => recentlyViewed.filter((e) => e.kind === 'movie'), [recentlyViewed])
  const favoriteMovieIds = useMemo(() => favorites.filter((f) => f.type === 'movie').map((f) => f.id), [favorites])
  const sourceIds = useMemo(() => [...recent.map((r) => r.id), ...favoriteMovieIds], [recent, favoriteMovieIds])
  const { data: neighbors, isLoading: neighborsLoading } = useRecommendationNeighbors(sourceIds)

  const result = useMemo((): { type: ReasonType; movies: Movie[] } | null => {
    if (sourceIds.length === 0) return null
    const activeSet = new Set(activeMovieIds)
    if (neighbors) {
      const pick = pickSimilarViewersMovies({
        recent, favoriteMovieIds, neighbors: new Map(Object.entries(neighbors)), movies,
        activeMovieIds: activeSet, popular, now: new Date(),
      })
      const movieById = new Map(movies.map((m) => [m.id, m]))
      const picked = pick.movieIds.map((id) => movieById.get(id)).filter((m): m is Movie => !!m)
      if (picked.length) return { type: 'similar_viewers', movies: picked }
    }
    const group = getPersonalizedFilms(recent.map((r) => r.id), movies, activeSet)[0]
    return group ? { type: group.reason.type, movies: group.movies } : null
  }, [sourceIds, neighbors, recent, favoriteMovieIds, movies, activeMovieIds, popular])

  // 이웃을 불러오는 동안 규칙 결과를 먼저 그리면 곧바로 다른 영화로 바뀐다 — 기다린다.
  const ready = !neighborsLoading
  const shown = ready ? result : null

  // 노출 계측 — 같은 결과로는 1회만
  const trackedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!shown) return
    const key = `${shown.type}:${shown.movies.map((m) => m.id).join(',')}`
    if (trackedKeyRef.current === key) return
    trackedKeyRef.current = key
    trackEvent('personalized section viewed', { reason_type: shown.type, movie_count: shown.movies.length })
  }, [shown])

  if (!shown) return null

  /* dwell·클릭에 같은 메타를 실어 다른 큐레이션 행과 같은 축으로 비교되게 한다.
     이 섹션은 run 밖(상단 고정)이라 position이 없다 — run 값으로 그걸 구분한다.
     reason_type으로 행동 추천(similar_viewers)과 규칙 방식을 나눠 본다. */
  const analytics = {
    ...buildSectionAnalytics({
      listId: 'personalized', sectionTitle: '이런 작품은 어때요',
      run: 'fixed_top', movieCount: shown.movies.length, compact: false,
    }),
    reason_type: shown.type,
  }

  return (
    <CurationSectionRow
      id="personalized"
      title="이런 작품은 어때요"
      movies={shown.movies}
      isDesktop={isDesktop}
      analytics={analytics}
      onMovieClick={(movieId) => {
        trackEvent('personalized movie clicked', { ...analytics, movie_id: movieId })
        onMovieClick(movieId)
      }}
    />
  )
}
