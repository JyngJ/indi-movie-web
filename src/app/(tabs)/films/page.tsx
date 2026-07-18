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
import { PersonalizedSection } from '@/components/domain/PersonalizedSection'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { FilmsSearchBar } from '@/components/domain/FilmsSearchBar'
import { RegionDropdown } from '@/components/domain/filterBar/RegionDropdown'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useCurationData } from '@/hooks/useCurationData'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { getFilmsTabCurationSections, SECTION_GROUP } from '@/lib/curation/filmsTabLists'
import { formatAlmostSoldOutCaption, getAlmostSoldOutFilms } from '@/lib/curation/getAlmostSoldOutFilms'
import { dayOfWeekLabel, formatLateNightCaption, getLateNightFilms } from '@/lib/curation/getLateNightFilms'
import { formatWeekendCaption, getWeekendFilms } from '@/lib/curation/getWeekendFilms'
import { getTodayAnniversaries } from '@/lib/curation/directorAnniversaries'
import { trackEvent } from '@/lib/analytics/client'
import { buildYearsOnScreenCaptions } from '@/lib/curation/yearsOnScreenCaption'
import { formatLocalDate, formatLocalTimeHHMM } from '@/lib/date'
import { useActiveMovieIdsByRegion, useActiveMovieTheaterPairs, useAlmostSoldOutCandidates, useCurationLists, useFilmRankings, useLateNightCandidates, useMovies, useTheaters } from '@/lib/supabase/queries'
import { getRegionFromCity } from '@/lib/regions'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'
import type { Theater } from '@/types/api'
import { Hourglass, Clapperboard, Film, Zap, Moon, ArrowUp, Car, CalendarDays, MapPin } from 'lucide-react'

/* ── 지역 설정 힌트 말풍선 — 지도 FilterBar의 안내와 동일한 문구/닫기 동작(yh_region_tip) ── */
function RegionHintBubble({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        zIndex: 60,
        width: 236,
        animation: 'tipIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), tipGlow 0.7s ease-out',
      }}
    >
      <div style={{
        position: 'relative',
        background: 'var(--color-primary-base)',
        borderRadius: 12,
        boxShadow: '0 10px 28px rgba(40, 55, 75, 0.34)',
        padding: '12px 12px 12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span style={{
          flex: 1,
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 12.5,
          lineHeight: 1.55,
          fontWeight: 500,
          color: '#fff',
        }}>
          지역을 설정해서 내 주변 영화관의 상영 정보를 조회하세요
        </span>
        <button
          onClick={onDismiss}
          style={{
            width: 18, height: 18, minWidth: 18, minHeight: 18,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: -1,
            padding: 0,
          }}
        >
          <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function FilmsPage() {
  const router = useRouter()
  const isDesktopLayout = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  const [regionHintDismissed, setRegionHintDismissed] = useState(false)
  useEffect(() => {
    setMounted(true)
    // 지도 FilterBar와 같은 힌트 — 한쪽에서 닫으면 다른 쪽에서도 다시 안 뜨도록 같은 세션 키 공유
    if (sessionStorage.getItem('yh_region_tip') === 'closed') setRegionHintDismissed(true)
  }, [])

  const handleMovieClick = (id: string) => router.push(`/films/movie/${id}`)
  const handleDirectorClick = (name: string) => router.push(`/films/director/${encodeURIComponent(name)}`)

  const { state: locState, coords: locCoords, modalSuppressed: locModalSuppressed, request: requestLoc, dismiss: dismissLoc } = useLocationPermission()
  const isDesktop = mounted && isDesktopLayout

  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => getStoredRegion())

  function pickRegion(id: string | null) {
    setSelectedRegion(id)
    setStoredRegion(id)
  }
  const userLocation = locCoords
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setShowScrollTop(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    let tries = 0
    const interval = setInterval(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        clearInterval(interval)
      } else if (++tries > 30) {
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])
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
  const { lastWeekFilms, newIndieFilms, returningFilms, recentlyViewed, soloTheaterFilms, todayShowFilms } =
    useCurationData(true, selectedRegion, undefined, userLocation)

  const { data: almostSoldOutCandidates = [] } = useAlmostSoldOutCandidates()
  const { data: lateNightCandidates = [] } = useLateNightCandidates()

  const sections = getFilmsTabCurationSections(movies, new Set(activeMovieIds), curationLists)

  const lastWeekBadgeMap = new Map(lastWeekFilms.map((f) => [f.movie.id, f.daysLeft]))

  // 매진 임박 — 오늘~내일 회차 좌석 스냅샷 기준, 판정은 순수 함수에 위임
  const asoNow = new Date()
  const asoToday = formatLocalDate(asoNow)
  const asoTomorrow = formatLocalDate(new Date(asoNow.getTime() + 24 * 60 * 60 * 1000))
  const asoNowTime = formatLocalTimeHHMM(asoNow)
  const almostSoldOutFilms = getAlmostSoldOutFilms(
    selectedRegion
      ? almostSoldOutCandidates.filter((c) => getRegionFromCity(c.theaterCity) === selectedRegion)
      : almostSoldOutCandidates,
    asoToday,
    asoTomorrow,
    asoNowTime,
  )
  const almostSoldOutCaptions = new Map(
    almostSoldOutFilms.map((f) => [f.movie.id, formatAlmostSoldOutCaption(f, asoToday)]),
  )

  const almostSoldOutCustomInfos = new Map<string, React.ReactNode>(
    almostSoldOutFilms.map((f) => {
      const dir = f.movie.director.length > 0 ? f.movie.director[0] : '감독 미상'
      const first = f.showings[0]
      const dayLabel = first?.showDate === asoToday ? '오늘' : '내일'
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      return [
        f.movie.id,
        <div key={f.movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>{dir}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 600 }}>{theaterName}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-hover-l)' }}>{dateText}</span>
        </div>
      ]
    })
  )

  const handleAlmostSoldOutMovieClick = (movieId: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: almostSoldOutFilms.find((f) => f.movie.id === movieId)?.movie.title,
      source: 'films_tab',
      list_id: 'realtime_almost_soldout',
    })
    handleMovieClick(movieId)
  }

  // 심야 상영 — 오늘~D+7 회차 기준, 심야 시각 판정은 순수 함수에 위임
  const lnNow = new Date()
  const lnToday = formatLocalDate(lnNow)
  const lnEnd = formatLocalDate(new Date(lnNow.getTime() + 7 * 24 * 60 * 60 * 1000))
  const lnNowTime = formatLocalTimeHHMM(lnNow)
  const lateNightFilms = getLateNightFilms(
    selectedRegion
      ? lateNightCandidates.filter((c) => getRegionFromCity(c.theaterCity) === selectedRegion)
      : lateNightCandidates,
    lnToday,
    lnEnd,
    lnNowTime,
  )
  const lateNightCaptions = new Map(
    lateNightFilms.map((f) => [f.movie.id, formatLateNightCaption(f, lnToday)]),
  )

  const lateNightCustomInfos = new Map<string, React.ReactNode>(
    lateNightFilms.map((f) => {
      const dir = f.movie.director.length > 0 ? f.movie.director[0] : '감독 미상'
      const first = f.showings[0]
      const dayLabel = first?.showDate === lnToday ? '오늘' : '내일'
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      return [
        f.movie.id,
        <div key={f.movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>{dir}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 600 }}>{theaterName}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-hover-l)' }}>{dateText}</span>
        </div>
      ]
    })
  )

  const handleLateNightMovieClick = (movieId: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: lateNightFilms.find((f) => f.movie.id === movieId)?.movie.title,
      source: 'films_tab',
      list_id: 'realtime_late_night',
    })
    handleMovieClick(movieId)
  }

  // 이번 주말 상영 — 심야와 같은 오늘~D+7 candidates 재사용, 판정만 별도 순수 함수에 위임
  const weekendFilms = getWeekendFilms(
    selectedRegion
      ? lateNightCandidates.filter((c) => getRegionFromCity(c.theaterCity) === selectedRegion)
      : lateNightCandidates,
    lnToday,
    lnNowTime,
  )
  const weekendCaptions = new Map(
    weekendFilms.map((f) => [f.movie.id, formatWeekendCaption(f, lnToday)]),
  )
  const weekendCustomInfos = new Map<string, React.ReactNode>(
    weekendFilms.map((f) => {
      const dir = f.movie.director.length > 0 ? f.movie.director[0] : '감독 미상'
      const first = f.showings[0]
      const dayLabel = first?.showDate === lnToday ? '오늘' : dayOfWeekLabel(first?.showDate ?? lnToday)
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      return [
        f.movie.id,
        <div key={f.movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>{dir}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 600 }}>{theaterName}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-hover-l)' }}>{dateText}</span>
        </div>
      ]
    })
  )

  const handleWeekendMovieClick = (movieId: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: weekendFilms.find((f) => f.movie.id === movieId)?.movie.title,
      source: 'films_tab',
      list_id: 'realtime_weekend',
    })
    handleMovieClick(movieId)
  }

  // 지금 출발하면 볼 수 있는 — useCurationData의 todayShowFilms(출발 버퍼 30분 + 4시간 창) 재사용.
  // 훅 자체엔 최소 편수 게이트가 없어 여기서 3편 미만이면 숨긴다.
  const leaveNowFilms = todayShowFilms.length >= 3 ? todayShowFilms : []
  const leaveNowCaptions = new Map(
    leaveNowFilms.map((f) => [f.movie.id, `${f.nextShowTime} ${f.theaterName}`]),
  )
  const leaveNowCustomInfos = new Map<string, React.ReactNode>(
    leaveNowFilms.map((f) => {
      const dir = f.movie.director.length > 0 ? f.movie.director[0] : '감독 미상'
      return [
        f.movie.id,
        <div key={f.movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>{dir}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 600 }}>{f.theaterName}</span>
          <span style={{ fontSize: 11, color: 'var(--color-primary-hover-l)' }}>{`오늘 ${f.nextShowTime}`}</span>
        </div>
      ]
    })
  )

  const handleLeaveNowMovieClick = (movieId: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: leaveNowFilms.find((f) => f.movie.id === movieId)?.movie.title,
      source: 'films_tab',
      list_id: 'realtime_leave_now',
    })
    handleMovieClick(movieId)
  }

  // 단독 상영 — soloTheaterFilms는 지역 미선택 시 훅이 빈 배열을 반환(지도 탭과 동일 제약).
  // 크롤 커버리지가 낮은 지역에선 "단독"이 진짜 유일 상영이 아니라 "이 지도가 아는 극장이 하나뿐"일 수 있어
  // 카피에서 "유일하게"처럼 단정적인 표현은 쓰지 않는다.
  const soloFilms = soloTheaterFilms.length >= 3 ? soloTheaterFilms : []
  const soloCaptions = new Map(soloFilms.map((f) => [f.movie.id, f.theaterName]))

  const handleSoloMovieClick = (movieId: string) => {
    trackEvent('curation movie selected', {
      movie_id: movieId,
      movie_title: soloFilms.find((f) => f.movie.id === movieId)?.movie.title,
      source: 'films_tab',
      list_id: 'realtime_solo_theater',
    })
    handleMovieClick(movieId)
  }

  // 오래된 작품(15년↑)에만 제작연도 카피 — movies.year는 제작연도라 "N년 만에 재개봉" 단정 금지
  const returningYearCaptions = buildYearsOnScreenCaptions(
    returningFilms.map((f) => f.movie),
    new Date().getFullYear(),
  )


  const realtimeSections = [
    {
      listId: 'realtime_last_week',
      nameKo: '막바지 상영',
      emoji: <Hourglass size={24} strokeWidth={2} color="var(--color-primary-base)" />,
      description: '상영관이 줄고 있어요. 미리 확인하고 예매하세요',
      displayMode: 'default' as const,
      posterBadges: lastWeekBadgeMap,
      movies: lastWeekFilms.map((f) => f.movie),
    },
    {
      listId: 'realtime_new_indie',
      nameKo: '이번 주 새롭게 상영하는 영화',
      emoji: <Clapperboard size={24} strokeWidth={2} color="var(--color-primary-base)" />,
      description: '이번 주 스크린에 새로 오른 영화들',
      displayMode: 'default' as const,
      movies: newIndieFilms.map((f) => f.movie),
    },
    {
      listId: 'realtime_returning',
      nameKo: '오랜만에 상영하는 영화',
      emoji: <Film size={24} strokeWidth={2} color="var(--color-primary-base)" />,
      description: '잠시 사라졌다가 다시 스크린으로 돌아온 영화들',
      displayMode: 'default' as const,
      movieCaptions: returningYearCaptions,
      movies: returningFilms.map((f) => f.movie),
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
    if (!movie) continue
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
      <header ref={headerRef} style={{ padding: '20px 16px 0' }}>
        {isDesktop ? (
          /* 데스크톱: [영화+서브타이틀]  ←─검색창 절대 중앙─→  [지역칩] */
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 52 }}>

            {/* Left: title (flow) */}
            <div style={{ flexShrink: 0, zIndex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text-primary)',
                }}
              >
                상영작
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-caption)', whiteSpace: 'nowrap' }}>
                {subtitle}
              </p>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Right: region chip (flow) */}
            <div style={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>
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
              {mounted && !selectedRegion && !regionHintDismissed && !dropdownOpen && (
                <RegionHintBubble
                  onDismiss={() => {
                    sessionStorage.setItem('yh_region_tip', 'closed')
                    setRegionHintDismissed(true)
                  }}
                />
              )}
            </div>

            {/* Center: search bar — 항상 컨테이너 정중앙 고정 */}
            <div style={{
              position: 'absolute', left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}>
              <div style={{ width: 420, pointerEvents: 'auto' }}>
                <FilmsSearchBar
                  movies={movies}
                  theaters={theaters}
                  isDesktop={true}
                />
              </div>
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
                상영작
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
                {mounted && !selectedRegion && !regionHintDismissed && !dropdownOpen && (
                  <RegionHintBubble
                    onDismiss={() => {
                      sessionStorage.setItem('yh_region_tip', 'closed')
                      setRegionHintDismissed(true)
                    }}
                  />
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <FilmsSearchBar
                movies={movies}
                theaters={theaters}
                isDesktop={false}
              />
            </div>
          </>
        )}

        {!isDesktop && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
            {subtitle}
          </p>
        )}

        {/* 구분선 */}
        <div style={{ marginTop: 16, height: 1, background: 'var(--color-border)' }} />
      </header>

      {!locModalSuppressed && (locState === 'prompt' || locState === 'denied' || locState === 'requesting') && (
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

      {/* ── 렌더 순서 (30일 CTR 기준 재배치 — 시의성 상단, 지식형 하단) ──────
          0. 이런 작품은 어때요 (개인화 — 최근 조회 이력 기반)
          1. 기념일 (생몰일)
          2. 특별전 #0
          3. 지금 출발하면 + 이번주 마지막 + 매진 임박 (run1 — 시의성 최상단)
          4. 특별전 #1 (있으면)
          5. 이번 주말 + 새롭게 상영(realtime new/returning) + 심야 + 단독 상영
          6. 거장/수상작 (인지도 앵커)
          7. 시기별 큐레이션 (seasonal — 명당에서 강등)
          8. 연도별
          9. 평론가
          10. 무브먼트
          11. 감독 스포트라이트
      ─────────────────────────────────────────────────────── */}
      {(() => {
        type AnySection = {
          listId: string; nameKo: string; emoji: React.ReactNode; description?: string
          displayMode: string; movies: import('@/types/api').Movie[]
          posterBadges?: Map<string, number>
          movieCaptions?: Map<string, string>
          customBottomInfos?: Map<string, React.ReactNode>
          onMovieClick?: (movieId: string) => void
        }

        // 큐레이션 섹션 그룹별 분류
        const seasonal   = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 1)
        const awards     = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 2)
        const decades    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 3)
        const critics    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 4)
        const movements  = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 5)

        const rtLastWeek = realtimeSections.filter((s) => s.listId === 'realtime_last_week')
        const rtNew      = realtimeSections.filter((s) => s.listId !== 'realtime_last_week')

        // 매진 임박 — 3편 미만이면 getAlmostSoldOutFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtAlmostSoldOut: AnySection[] = almostSoldOutFilms.length > 0 ? [{
          listId: 'realtime_almost_soldout',
          nameKo: '매진 임박',
          emoji: <Zap size={24} strokeWidth={2} color="var(--color-primary-base)" />,
          description: '최근 확인 기준, 오늘·내일 회차의 좌석이 얼마 남지 않았어요',
          displayMode: 'default',
          movieCaptions: almostSoldOutCaptions,
          customBottomInfos: almostSoldOutCustomInfos,
          onMovieClick: handleAlmostSoldOutMovieClick,
          movies: almostSoldOutFilms.map((f) => f.movie),
        }] : []

        // 심야 상영 — 3편 미만이면 getLateNightFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtLateNight: AnySection[] = lateNightFilms.length > 0 ? [{
          listId: 'realtime_late_night',
          nameKo: '심야 상영',
          emoji: <Moon size={24} strokeWidth={2} color="var(--color-primary-base)" />,
          description: '하루의 끝, 밤 깊은 시간에 시작하는 회차들이에요',
          displayMode: 'default',
          movieCaptions: lateNightCaptions,
          customBottomInfos: lateNightCustomInfos,
          onMovieClick: handleLateNightMovieClick,
          movies: lateNightFilms.map((f) => f.movie),
        }] : []

        // 이번 주말 상영 — 3편 미만이면 getWeekendFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtWeekend: AnySection[] = weekendFilms.length > 0 ? [{
          listId: 'realtime_weekend',
          nameKo: '이번 주말 상영',
          emoji: <CalendarDays size={24} strokeWidth={2} color="var(--color-primary-base)" />,
          description: '이번 주말 볼 수 있는 회차예요',
          displayMode: 'default',
          movieCaptions: weekendCaptions,
          customBottomInfos: weekendCustomInfos,
          onMovieClick: handleWeekendMovieClick,
          movies: weekendFilms.map((f) => f.movie),
        }] : []

        // 지금 출발하면 볼 수 있는 — 3편 미만이면 위에서 이미 빈 배열로 걸러짐
        const rtLeaveNow: AnySection[] = leaveNowFilms.length > 0 ? [{
          listId: 'realtime_leave_now',
          nameKo: '지금 출발하면 볼 수 있는',
          emoji: <Car size={24} strokeWidth={2} color="var(--color-primary-base)" />,
          description: '지금 출발하면 늦지 않게 볼 수 있는 회차예요',
          displayMode: 'default',
          movieCaptions: leaveNowCaptions,
          customBottomInfos: leaveNowCustomInfos,
          onMovieClick: handleLeaveNowMovieClick,
          movies: leaveNowFilms.map((f) => f.movie),
        }] : []

        // 단독 상영 — 3편 미만이면 위에서 이미 빈 배열로 걸러짐, 지역 미선택 시에도 빈 배열
        const rtSolo: AnySection[] = soloFilms.length > 0 ? [{
          listId: 'realtime_solo_theater',
          nameKo: `${selectedRegion ?? '이 지역'}에서 단 한 곳`,
          emoji: <MapPin size={24} strokeWidth={2} color="var(--color-primary-base)" />,
          description: '이 지역에서는 이 극장에서만 상영해요',
          displayMode: 'default',
          movieCaptions: soloCaptions,
          onMovieClick: handleSoloMovieClick,
          movies: soloFilms.map((f) => f.movie),
        }] : []

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
          // 모바일에서는 2열로 묶지 않고 1개씩 — 가로로 합쳐서 보여주면 잘려서 잘 안 보임
          const rows: (typeof sparse)[] = []
          if (isDesktop) {
            for (let i = 0; i < sparse.length; i += 2) rows.push(sparse.slice(i, i + 2))
          } else {
            for (const s of sparse) rows.push([s])
          }
          return (
            <>
              {rich.map(({ ann, films }) => (
                <AnniversarySection key={`ann_${ann.nameKo}_${ann.eventType}`}
                  sectionTitle={ann.sectionTitle} sectionDesc={ann.sectionDesc}
                  eventType={ann.eventType} nameKo={ann.nameKo} nameEn={ann.nameEn}
                  birthYear={ann.birthYear} deathYear={ann.deathYear}
                  month={ann.month} day={ann.day}
                  films={films} isDesktop={isDesktop} onMovieClick={handleMovieClick} />
              ))}
              {rows.map((pair, ri) => (
                <div key={`ann_sparse_${ri}`} style={{ display: 'flex', gap: 12, padding: '24px 16px 0' }}>
                  {pair.map(({ ann, films }) => (
                    <AnniversarySection key={`ann_${ann.nameKo}_${ann.eventType}`}
                      sectionTitle={ann.sectionTitle} sectionDesc={ann.sectionDesc}
                      eventType={ann.eventType} nameKo={ann.nameKo} nameEn={ann.nameEn}
                      birthYear={ann.birthYear} deathYear={ann.deathYear}
                      month={ann.month} day={ann.day}
                      films={films} isDesktop={isDesktop} onMovieClick={handleMovieClick} compact={isDesktop} />
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
          type SectionDisplayMode = import('@/lib/curation/filmsTabLists').SectionDisplayMode
          function rowFor(s: AnySection, compact: boolean) {
            return (
              <CurationSectionRow key={s.listId} id={s.listId}
                title={s.nameKo} emoji={s.emoji} description={s.description}
                displayMode={s.displayMode as SectionDisplayMode}
                movies={s.movies} isDesktop={isDesktop}
                posterBadges={s.posterBadges} movieCaptions={s.movieCaptions}
                customBottomInfos={s.customBottomInfos}
                onMovieClick={s.onMovieClick ?? ((movieId) => {
                  trackEvent('curation movie selected', {
                    movie_id: movieId,
                    movie_title: movieById.get(movieId)?.title,
                    source: 'films_tab',
                    list_id: s.listId,
                  })
                  handleMovieClick(movieId)
                })}
                compact={compact} />
            )
          }
          // 모바일에서는 2열로 묶지 않음 — 가로로 합쳐서 보여주면 잘려서 잘 안 보임
          if (!isDesktop) {
            return <>{active.map((s) => rowFor(s, false))}</>
          }
          // 데스크톱: sparse(≤2편) 섹션끼리 짝지어 2열로 — 인접하지 않아도 사이의 rich 섹션은
          // 잠깐 미뤄뒀다가 짝을 맺은 직후 원래 순서대로 이어서 낸다 (건너뛴 줄만큼 빈 공간 안 남게)
          let pending: AnySection | null = null
          const deferred: AnySection[] = []
          for (const s of active) {
            const sparse = s.movies.length <= 2
            if (sparse && pending == null) {
              pending = s
              continue
            }
            if (sparse && pending != null) {
              nodes.push(
                <div key={`${keyPrefix}_pair_${pending.listId}`} style={{ display: 'flex', gap: 12, padding: '24px 16px 0' }}>
                  {rowFor(pending, true)}
                  {rowFor(s, true)}
                </div>
              )
              pending = null
              deferred.forEach((d) => nodes.push(rowFor(d, false)))
              deferred.length = 0
              continue
            }
            // rich 섹션: 짝을 기다리는 sparse가 있으면 뒤로 미뤄두고, 없으면 바로 낸다
            if (pending != null) deferred.push(s)
            else nodes.push(rowFor(s, false))
          }
          if (pending != null) {
            // 끝까지 짝을 못 찾은 sparse — 큰 포스터 1~2장에 빈 공간 안 남게 단독 카드로
            nodes.push(
              <div key={`${keyPrefix}_solo_${pending.listId}`} style={{ display: 'flex', gap: 12, padding: '24px 16px 0' }}>
                {rowFor(pending, true)}
              </div>
            )
            deferred.forEach((d) => nodes.push(rowFor(d, false)))
          }
          return <>{nodes}</>
        }

        // 특별전 앞뒤 경계를 기준으로 두 개의 run 구성 — 30일 CTR 기준 재배치:
        // 시의성(막바지·매진임박)을 최상단으로, 저CTR 시기별(seasonal)은 명당에서 강등
        const run1: AnySection[] = [...rtLeaveNow, ...rtLastWeek, ...rtAlmostSoldOut]
        const run2: AnySection[] = [
          ...rtWeekend, ...rtNew, ...rtLateNight,
          ...rtSolo,
          ...awards,
          ...seasonal,
          ...decades, ...critics, ...movements,
        ]

        return (
          <>
            {/* 0. 개인화 — 최근 본 영화 기반, 이력 없으면 미노출 */}
            <PersonalizedSection
              movies={movies}
              activeMovieIds={activeMovieIds}
              recentlyViewed={recentlyViewed}
              isDesktop={isDesktop}
              onMovieClick={handleMovieClick}
            />

            {/* 1. 기념일 */}
            {renderAnniversaries(anniversarySections)}

            {/* 2. 특별전 #0 */}
            {renderSpecial(special0)}

            {/* 3. 이번주 마지막 + 매진 임박 — 연속 sparse 자동 페어링 */}
            {renderRun(run1, 'run1')}

            {/* 4. 특별전 #1 (interleaved) */}
            {renderSpecial(special1)}

            {/* 5~10. 신작·심야 · 거장/수상 · 시기별 · 연도별 · 평론가 · 무브먼트 — 연속 sparse 자동 페어링 */}
            {renderRun(run2, 'run2')}

            {/* 11. 감독 스포트라이트 */}
            <DirectorSpotlightSection
              movies={movies} activeMovieIds={activeMovieIdSet}
              isDesktop={isDesktop} onDirectorClick={handleDirectorClick} />

            {/* 12. 전체 상영작 그리드 */}
            <AllMoviesGrid
              movies={movies.filter((m) => activeMovieIdSet.has(m.id))}
              isDesktop={isDesktop}
              regionLabel={selectedRegion ?? undefined}
              theaterCountByMovie={theaterCountByMovie}
              onMovieClick={handleMovieClick} />
          </>
        )
      })()}

      {/* scroll-to-top: 헤더가 뷰포트 밖으로 나가면 표시 */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            right: isDesktop ? 32 : 20,
            bottom: isDesktop
              ? 32
              : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
            width: 40, height: 40,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'var(--color-surface-card)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            color: 'var(--color-text-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
            minHeight: 'unset',
            transition: 'opacity 0.15s',
          }}
          title="맨 위로"
        >
          <ArrowUp size={20} strokeWidth={2} color="currentColor" />
        </button>
      )}
    </div>
  )
}
