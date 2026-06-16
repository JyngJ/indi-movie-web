'use client'

import { useEffect, useRef, useState } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { DirectorSpotlightSection } from '@/components/domain/DirectorSpotlightSection'
import { FilmRankingSection } from '@/components/domain/FilmRankingSection'
import { LocationPermissionModal } from '@/components/domain/LocationPermissionModal'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { RegionDropdown } from '@/components/domain/filterBar/RegionDropdown'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useCurationData } from '@/hooks/useCurationData'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { getFilmsTabCurationSections } from '@/lib/curation/filmsTabLists'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { useActiveMovieIdsByRegion, useActiveMovieTheaterPairs, useCurationLists, useFilmRankings, useMovies, useTheaters } from '@/lib/supabase/queries'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'
import type { Theater } from '@/types/api'

export default function FilmsPage() {
  const isDesktopLayout = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { state: locState, coords: locCoords, request: requestLoc, dismiss: dismissLoc } = useLocationPermission()
  const isDesktop = mounted && isDesktopLayout

  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => getStoredRegion())

  function pickRegion(id: string | null) {
    setSelectedRegion(id)
    setStoredRegion(id)
  }
  const userLocation = locCoords
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const chipRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function onPointerDown(e: PointerEvent) {
      if (
        chipRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setDropdownOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [dropdownOpen])

  const { data: movies = [] } = useMovies()
  const { data: theaters = [] } = useTheaters()
  const { data: curationLists = [] } = useCurationLists()
  const { data: activeMovieIds = [] } = useActiveMovieIdsByRegion(selectedRegion)
  const { data: movieTheaterPairs = [] } = useActiveMovieTheaterPairs(selectedRegion)
  const { data: filmRankingRow } = useFilmRankings()
  const { lastWeekFilms, newIndieFilms, returningFilms } = useCurationData(true, selectedRegion)

  const q = searchQuery.trim()

  function matchesSearch(title: string, directors: string[]) {
    if (!q) return true
    const ql = q.toLowerCase()
    return (
      normalizeTitle(title).toLowerCase().includes(ql) ||
      directors.some((d) => d.toLowerCase().includes(ql))
    )
  }

  const filteredMovies = movies.filter((m) => matchesSearch(m.title, m.director))

  const sections = getFilmsTabCurationSections(filteredMovies, new Set(activeMovieIds), curationLists)

  const lastWeekBadgeMap = new Map(lastWeekFilms.map((f) => [f.movie.id, f.daysLeft]))

  const realtimeSections = [
    {
      listId: 'realtime_last_week',
      nameKo: '이번 주가 마지막',
      emoji: '⏳',
      description: '한동안 다시 못볼지도 몰라요! 놓치기 전에 여기서',
      displayMode: 'default' as const,
      posterBadges: lastWeekBadgeMap,
      movies: lastWeekFilms
        .filter((f) => matchesSearch(f.movie.title, f.movie.director))
        .map((f) => f.movie),
    },
    {
      listId: 'realtime_new_indie',
      nameKo: '이번 주 새롭게 상영하는 영화',
      emoji: '🎬',
      description: '이번 주 스크린에 새로 오른 영화들',
      displayMode: 'default' as const,
      movies: newIndieFilms
        .filter((f) => matchesSearch(f.movie.title, f.movie.director))
        .map((f) => f.movie),
    },
    {
      listId: 'realtime_returning',
      nameKo: '오랜만에 상영하는 영화',
      emoji: '🎞️',
      description: '잠시 사라졌다가 다시 스크린으로 돌아온 영화들',
      displayMode: 'default' as const,
      movies: returningFilms
        .filter((f) => matchesSearch(f.movie.title, f.movie.director))
        .map((f) => f.movie),
    },
  ].filter((s) => s.movies.length > 0)

  const visibleSections = sections.filter((s) => s.movies.length > 0)

  // 특별전: 같은 극장에서 동일 감독 영화 3편↑, 최대 2개
  const activeMovieIdSet = new Set(activeMovieIds)
  const movieById = new Map(movies.map((m) => [m.id, m]))
  const theaterDirMap = new Map<string, Map<string, typeof movies>>()
  for (const { movieId, theaterId } of movieTheaterPairs) {
    const movie = movieById.get(movieId)
    if (!movie || !matchesSearch(movie.title, movie.director)) continue
    if (!theaterDirMap.has(theaterId)) theaterDirMap.set(theaterId, new Map())
    const dirMap = theaterDirMap.get(theaterId)!
    for (const dir of movie.director) {
      if (!dirMap.has(dir)) dirMap.set(dir, [])
      const arr = dirMap.get(dir)!
      if (!arr.find((m) => m.id === movieId)) arr.push(movie)
    }
  }
  const specialCandidates: { directorName: string; theater: Theater; films: typeof movies }[] = []
  for (const [theaterId, dirMap] of theaterDirMap) {
    const theater = theaters.find((t) => t.id === theaterId)
    if (!theater) continue
    for (const [dirName, films] of dirMap) {
      if (films.length >= 3) specialCandidates.push({ directorName: dirName, theater, films })
    }
  }
  const specialDirectorSections = specialCandidates
    .sort((a, b) => b.films.length - a.films.length)
    .slice(0, 2)

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.asin(Math.sqrt(a))
  }

  function formatDist(km: number) {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
  }

  const subtitle = selectedRegion
    ? `${selectedRegion}에서 지금 만날 수 있는 영화 ${activeMovieIds.length}편`
    : `지금 만날 수 있는 영화 ${activeMovieIds.length}편`

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
        {isDesktop ? (
          /* 데스크톱: [영화+서브타이틀] [검색창──────] [지역칩] */
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
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
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-caption)', whiteSpace: 'nowrap' }}>
                {q && visibleSections.length === 0 ? '검색 결과 없음' : subtitle}
              </p>
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-caption)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="영화, 감독, 배우 검색"
                style={{
                  width: '100%',
                  height: 36,
                  paddingLeft: 36,
                  paddingRight: searchQuery ? 34 : 14,
                  borderRadius: 20,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-card)',
                  color: 'var(--color-text-body)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--color-text-caption)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--color-surface-bg)',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ position: 'relative', flexShrink: 0 }}>
              <FilterChip
                label="검색 지역"
                value={selectedRegion ?? undefined}
                open={dropdownOpen}
                selected={!!selectedRegion}
                hasDropdown
                chipRef={chipRef}
                onClick={() => setDropdownOpen((o) => !o)}
                onClear={selectedRegion ? () => { pickRegion(null); setDropdownOpen(false) } : undefined}
              />
              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200 }}
                >
                  <RegionDropdown
                    selectedId={selectedRegion}
                    onSelect={(id) => { pickRegion(id); setDropdownOpen(false) }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 모바일: 제목 + 지역칩 → 검색창 → 서브타이틀 순 */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <div style={{ position: 'relative' }}>
                <FilterChip
                  label="검색 지역"
                  value={selectedRegion ?? undefined}
                  open={dropdownOpen}
                  selected={!!selectedRegion}
                  hasDropdown
                  chipRef={chipRef}
                  onClick={() => setDropdownOpen((o) => !o)}
                  onClear={selectedRegion ? () => { pickRegion(null); setDropdownOpen(false) } : undefined}
                />
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200 }}
                  >
                    <RegionDropdown
                      selectedId={selectedRegion}
                      onSelect={(id) => { pickRegion(id); setDropdownOpen(false) }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: 'relative', marginTop: 12 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-caption)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="영화, 감독, 배우 검색"
                style={{
                  width: '100%',
                  height: 40,
                  paddingLeft: 38,
                  paddingRight: searchQuery ? 36 : 14,
                  borderRadius: 20,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-card)',
                  color: 'var(--color-text-body)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--color-text-caption)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--color-surface-bg)',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </>
        )}

        {!isDesktop && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
            {q && visibleSections.length === 0 ? '검색 결과 없음' : subtitle}
          </p>
        )}

        {/* 구분선 */}
        <div style={{ marginTop: 16, height: 1, background: 'var(--color-border)' }} />
      </header>

      {(locState === 'prompt' || locState === 'denied' || locState === 'requesting') && (
        <LocationPermissionModal
          state={locState}
          onRequest={requestLoc}
          onDismiss={dismissLoc}
        />
      )}

      {filmRankingRow && (
        <FilmRankingSection
          weekStart={filmRankingRow.week_start}
          rankings={filmRankingRow.rankings}
          movies={movies}
          isDesktop={isDesktop}
        />
      )}

      {specialDirectorSections.map(({ directorName, theater, films }) => {
        const dist = userLocation
          ? haversineKm(userLocation.lat, userLocation.lng, theater.lat, theater.lng)
          : null
        const distSuffix = dist != null ? ` (${formatDist(dist)})` : ''
        return (
          <CurationSectionRow
            key={`special_${directorName}_${theater.id}`}
            title={`${directorName} 특별전 — ${theater.name}에서${distSuffix}`}
            emoji="🎭"
            description={`지금 ${theater.name}에서 ${directorName}의 작품 ${films.length}편을 만날 수 있어요`}
            displayMode="default"
            movies={films}
            isDesktop={isDesktop}
          />
        )
      })}

      <DirectorSpotlightSection
        movies={movies}
        activeMovieIds={activeMovieIdSet}
        isDesktop={isDesktop}
      />

      {realtimeSections.map((section) => (
        <CurationSectionRow
          key={section.listId}
          title={section.nameKo}
          emoji={section.emoji}
          description={section.description}
          displayMode={section.displayMode}
          movies={section.movies}
          isDesktop={isDesktop}
          posterBadges={section.posterBadges}
        />
      ))}

      {visibleSections.map((section) => (
        <CurationSectionRow
          key={section.listId}
          title={section.nameKo}
          emoji={section.emoji}
          description={section.description}
          displayMode={section.displayMode}
          movies={section.movies}
          isDesktop={isDesktop}
        />
      ))}
    </div>
  )
}
