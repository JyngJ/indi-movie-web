'use client'

import { useEffect, useState } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { getFilmsTabCurationSections } from '@/lib/curation/filmsTabLists'
import { useActiveMovieIds, useCurationLists, useMovies } from '@/lib/supabase/queries'

// 구현 2 — curation_list 테이블 + 라이브 상영작 교집합 (임계값 없음). docs/FILMS_TAB_PLAN.md §10 참고
export default function FilmsPage() {
  const isDesktopLayout = useIsDesktopLayout()
  const { data: movies = [] } = useMovies()
  const { data: curationLists = [] } = useCurationLists()
  const { data: activeMovieIds = [] } = useActiveMovieIds()
  const sections = getFilmsTabCurationSections(movies, new Set(activeMovieIds), curationLists)

  // 데스크톱/모바일 DOM이 달라 서버 렌더와 불일치(hydration mismatch) 발생 — 마운트 후에만 분기
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDesktop = mounted && isDesktopLayout

  return (
    <div
      style={{
        minHeight: '100dvh',
        paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <header style={{ padding: '20px 16px 0' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
          }}
        >
          영화
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
          지금 만날 수 있는 영화 {movies.length}편
        </p>
      </header>

      {sections.map((section) => (
        <CurationSectionRow key={section.listId} title={section.nameKo} movies={section.movies} isDesktop={isDesktop} />
      ))}
    </div>
  )
}
