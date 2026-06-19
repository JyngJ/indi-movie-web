'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AllMoviesGrid } from '@/components/domain/AllMoviesGrid'
import { AnniversarySection } from '@/components/domain/AnniversarySection'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { DirectorSpecialSection } from '@/components/domain/DirectorSpecialSection'
import { DirectorSpotlightSection } from '@/components/domain/DirectorSpotlightSection'
import { FilmRankingSection } from '@/components/domain/FilmRankingSection'
import { LocationPermissionModal } from '@/components/domain/LocationPermissionModal'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { RegionDropdown } from '@/components/domain/filterBar/RegionDropdown'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useCurationData } from '@/hooks/useCurationData'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { getFilmsTabCurationSections, SECTION_GROUP } from '@/lib/curation/filmsTabLists'
import { getTodayAnniversaries } from '@/lib/curation/directorAnniversaries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { useActiveMovieIdsByRegion, useActiveMovieTheaterPairs, useCurationLists, useFilmRankings, useMovies, useTheaters } from '@/lib/supabase/queries'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'
import type { Theater } from '@/types/api'

export default function FilmsPage() {
  const router = useRouter()
  const isDesktopLayout = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleMovieClick = (id: string) => router.push(`/films/movie/${id}`)
  const handleDirectorClick = (name: string) => router.push(`/films/director/${encodeURIComponent(name)}`)

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

  // 영화별 상영관 수 (AllMoviesGrid 정렬용)
  const theaterCountByMovie = new Map<string, number>()
  for (const { movieId } of movieTheaterPairs) {
    theaterCountByMovie.set(movieId, (theaterCountByMovie.get(movieId) ?? 0) + 1)
  }
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

  const anniversarySections = getTodayAnniversaries()
    .map((ann) => ({
      ann,
      films: movies.filter((m) =>
        m.director.some((d) => d === ann.nameKo) && activeMovieIdSet.has(m.id),
      ),
    }))
    .filter((s) => s.films.length > 0)

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

      {/* 주간 랭킹 — 독립영화 필터 미완성으로 임시 숨김
      {filmRankingRow && (
        <FilmRankingSection
          weekStart={filmRankingRow.week_start}
          rankings={filmRankingRow.rankings}
          movies={movies}
          isDesktop={isDesktop}
          onMovieClick={handleMovieClick}
        />
      )}
      */}

      {/* ── 렌더 순서 ─────────────────────────────────────────────
          1. 기념일 (생몰일)
          2. 특별전 #0
          3. 시기별 큐레이션 (seasonal) + 이번주 마지막
          4. 특별전 #1 (있으면)
          5. 거장/수상작
          6. 새롭게 상영 (realtime new/returning)
          7. 연도별
          8. 평론가
          9. 무브먼트
          10. 감독 스포트라이트
      ─────────────────────────────────────────────────────── */}
      {(() => {
        type AnySection = {
          listId: string; nameKo: string; emoji: string; description?: string
          displayMode: string; movies: import('@/types/api').Movie[]
          posterBadges?: Map<string, number>
        }

        // 큐레이션 섹션 그룹별 분류
        const seasonal   = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 1)
        const awards     = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 2)
        const decades    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 3)
        const critics    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 4)
        const movements  = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 5)

        const rtLastWeek = realtimeSections.filter((s) => s.listId === 'realtime_last_week')
        const rtNew      = realtimeSections.filter((s) => s.listId !== 'realtime_last_week')

        // 특별전 interleave 준비
        const [special0, special1] = specialDirectorSections

        function renderSpecial(s: typeof specialDirectorSections[number] | undefined) {
          if (!s) return null
          const dist = userLocation
            ? haversineKm(userLocation.lat, userLocation.lng, s.theater.lat, s.theater.lng)
            : null
          const distSuffix = dist != null ? `(${formatDist(dist)})` : undefined
          return (
            <DirectorSpecialSection
              key={`special_${s.directorName}_${s.theater.id}`}
              directorName={s.directorName} theater={s.theater} films={s.films}
              distSuffix={distSuffix} isDesktop={isDesktop}
              onDirectorClick={handleDirectorClick}
              onTheaterClick={(id) => router.push(`/films/theater/${id}`)}
              onMovieClick={handleMovieClick}
            />
          )
        }

        function renderAnniversaries(list: typeof anniversarySections) {
          const rich   = list.filter((s) => s.films.length > 2)
          const sparse = list.filter((s) => s.films.length <= 2)
          const rows: (typeof sparse)[] = []
          for (let i = 0; i < sparse.length; i += 2) rows.push(sparse.slice(i, i + 2))
          return (
            <>
              {rich.map(({ ann, films }) => (
                <AnniversarySection key={`ann_${ann.nameKo}_${ann.eventType}`}
                  sectionTitle={ann.sectionTitle} sectionDesc={ann.sectionDesc}
                  eventType={ann.eventType} nameKo={ann.nameKo} nameEn={ann.nameEn}
                  birthYear={ann.birthYear} deathYear={ann.deathYear}
                  films={films} isDesktop={isDesktop} onMovieClick={handleMovieClick} />
              ))}
              {rows.map((pair, ri) => (
                <div key={`ann_sparse_${ri}`} style={{ display: 'flex', gap: 12, padding: '24px 16px 0' }}>
                  {pair.map(({ ann, films }) => (
                    <AnniversarySection key={`ann_${ann.nameKo}_${ann.eventType}`}
                      sectionTitle={ann.sectionTitle} sectionDesc={ann.sectionDesc}
                      eventType={ann.eventType} nameKo={ann.nameKo} nameEn={ann.nameEn}
                      birthYear={ann.birthYear} deathYear={ann.deathYear}
                      films={films} isDesktop={isDesktop} onMovieClick={handleMovieClick} compact />
                  ))}
                </div>
              ))}
            </>
          )
        }

        // 연속 sparse 섹션을 2열로 페어링 (그룹 경계 무관)
        function renderRun(list: AnySection[], keyPrefix: string) {
          const active = list.filter((s) => s.movies.length > 0)
          if (active.length === 0) return null
          const nodes: React.ReactNode[] = []
          let i = 0
          type SectionDisplayMode = import('@/lib/curation/filmsTabLists').SectionDisplayMode
          function rowFor(s: AnySection, compact: boolean) {
            return (
              <CurationSectionRow key={s.listId}
                title={s.nameKo} emoji={s.emoji} description={s.description}
                displayMode={s.displayMode as SectionDisplayMode}
                movies={s.movies} isDesktop={isDesktop}
                posterBadges={s.posterBadges} onMovieClick={handleMovieClick}
                compact={compact} />
            )
          }
          while (i < active.length) {
            const curr = active[i]
            const next = active[i + 1]
            const currSparse = curr.movies.length <= 2
            const nextSparse = next != null && next.movies.length > 0 && next.movies.length <= 2
            if (currSparse && nextSparse) {
              nodes.push(
                <div key={`${keyPrefix}_pair_${i}`} style={{ display: 'flex', gap: 12, padding: '24px 16px 0' }}>
                  {rowFor(curr, true)}
                  {rowFor(next, true)}
                </div>
              )
              i += 2
            } else {
              nodes.push(rowFor(curr, false))
              i++
            }
          }
          return <>{nodes}</>
        }

        // 특별전 앞뒤 경계를 기준으로 두 개의 run 구성
        const run1: AnySection[] = [...seasonal, ...rtLastWeek]
        const run2: AnySection[] = [...awards, ...rtNew, ...decades, ...critics, ...movements]

        return (
          <>
            {/* 1. 기념일 */}
            {renderAnniversaries(anniversarySections)}

            {/* 2. 특별전 #0 */}
            {renderSpecial(special0)}

            {/* 3. 시기별 + 이번주 마지막 — 연속 sparse 자동 페어링 */}
            {renderRun(run1, 'run1')}

            {/* 4. 특별전 #1 (interleaved) */}
            {renderSpecial(special1)}

            {/* 5~9. 거장/수상 · 신작 · 연도별 · 평론가 · 무브먼트 — 연속 sparse 자동 페어링 */}
            {renderRun(run2, 'run2')}

            {/* 10. 감독 스포트라이트 */}
            <DirectorSpotlightSection
              movies={movies} activeMovieIds={activeMovieIdSet}
              isDesktop={isDesktop} onDirectorClick={handleDirectorClick} />

            {/* 11. 전체 상영작 그리드 */}
            <AllMoviesGrid
              movies={filteredMovies.filter((m) => activeMovieIdSet.has(m.id))}
              isDesktop={isDesktop}
              regionLabel={selectedRegion ?? undefined}
              theaterCountByMovie={theaterCountByMovie}
              onMovieClick={handleMovieClick} />
          </>
        )
      })()}
    </div>
  )
}
