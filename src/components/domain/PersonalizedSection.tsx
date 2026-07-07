'use client'

import { useEffect, useMemo, useRef } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { trackEvent } from '@/lib/analytics/client'
import { getPersonalizedFilms } from '@/lib/curation/getPersonalizedFilms'
import type { PersonalizedReason } from '@/lib/curation/getPersonalizedFilms'
import type { RecentlyViewedEntry } from '@/lib/curation/types'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { Movie } from '@/types/api'
import { Sparkles } from 'lucide-react'

interface PersonalizedSectionProps {
  movies: Movie[]
  activeMovieIds: string[]
  recentlyViewed: RecentlyViewedEntry[]
  isDesktop: boolean
  onMovieClick: (movieId: string) => void
}

/** 목적격 조사: 받침 있으면 '을', 없으면 '를', 한글이 아니면 '을(를)' */
function objectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '을(를)'
  return (last - 0xac00) % 28 === 0 ? '를' : '을'
}

/** 추천 근거 → 부제 문구 조립 (로직은 getPersonalizedFilms, 카피는 여기) */
function reasonDescription(reason: PersonalizedReason): string {
  const title = normalizeTitle(reason.sourceMovie.title)
  const seen = `〈${title}〉${objectParticle(title)} 보셨다면`
  switch (reason.type) {
    case 'director':
      return `${seen} — ${reason.director} 감독의 다른 상영작`
    case 'nation-era':
      return `${seen} — 비슷한 시기의 ${reason.nation} 영화`
    case 'genre':
      return `${seen} — 같은 ${reason.genre} 장르의 상영작`
  }
}

/**
 * "이런 작품은 어때요" — 쿠키 기반 최근 조회 이력으로 만드는 규칙 기반 개인화 섹션.
 * 이력이 없거나 폴백 체인이 전부 공집합이면 아무것도 렌더하지 않는다 (placeholder 없음).
 * recentlyViewed는 클라이언트 effect에서 로드되어 첫 렌더에 항상 [] — hydration 안전.
 */
export function PersonalizedSection({
  movies,
  activeMovieIds,
  recentlyViewed,
  isDesktop,
  onMovieClick,
}: PersonalizedSectionProps) {
  const group = useMemo(() => {
    const recentMovieIds = recentlyViewed
      .filter((entry) => entry.kind === 'movie')
      .map((entry) => entry.id)
    if (recentMovieIds.length === 0) return null
    const groups = getPersonalizedFilms(recentMovieIds, movies, new Set(activeMovieIds))
    return groups[0] ?? null
  }, [recentlyViewed, movies, activeMovieIds])

  // 노출 계측 — 같은 그룹으로는 1회만
  const trackedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!group) return
    const key = `${group.reason.type}:${group.reason.sourceMovie.id}:${group.movies.length}`
    if (trackedKeyRef.current === key) return
    trackedKeyRef.current = key
    trackEvent('personalized section viewed', {
      reason_type: group.reason.type,
      movie_count: group.movies.length,
    })
  }, [group])

  if (!group) return null

  return (
    <CurationSectionRow
      id="personalized"
      title="이런 작품은 어때요"
      emoji={<Sparkles size={24} strokeWidth={2} color="var(--color-primary-base)" />}
      description={reasonDescription(group.reason)}
      displayMode="default"
      movies={group.movies}
      isDesktop={isDesktop}
      onMovieClick={(movieId) => {
        trackEvent('personalized movie clicked', {
          movie_id: movieId,
          reason_type: group.reason.type,
        })
        onMovieClick(movieId)
      }}
    />
  )
}
