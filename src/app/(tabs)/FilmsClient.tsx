'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { SectionHeader, MovieCardSkeleton, FabRound, Icon, Divider } from '@/components/primitives'
import { AllMoviesGrid } from '@/components/domain/AllMoviesGrid'
import { RouteProgressBar, navStart } from '@/components/domain/RouteProgressBar'
import { AnniversarySection } from '@/components/domain/AnniversarySection'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { FavoriteMoviesSection } from '@/components/domain/favorites/FavoriteMoviesSection'
import { DirectorSpecialSection } from '@/components/domain/DirectorSpecialSection'
import { DirectorSpotlightSection } from '@/components/domain/DirectorSpotlightSection'
import { FilmRankingSection } from '@/components/domain/FilmRankingSection'
import { LocationPermissionModal } from '@/components/domain/LocationPermissionModal'
import { PersonalizedSection } from '@/components/domain/PersonalizedSection'
import { InstagramRecsSection } from '@/components/domain/InstagramRecsSection'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { FilmsSearchBar } from '@/components/domain/FilmsSearchBar'
import { RegionDropdown } from '@/components/domain/filterBar/RegionDropdown'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useCurationData } from '@/hooks/useCurationData'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { useCurrentLocationRegion } from '@/hooks/useCurrentLocationRegion'
import { getFilmsTabCurationSections, SECTION_GROUP } from '@/lib/curation/filmsTabLists'
import { mergePopularRanking } from '@/lib/curation/popularRanking'
import { buildSectionAnalytics, computeRunStartIndexes } from '@/lib/curation/sectionRuns'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { buildAnniversaryAges } from '@/lib/curation/getAnniversaryFilms'
import { formatAlmostSoldOutCaption, getAlmostSoldOutFilms } from '@/lib/curation/getAlmostSoldOutFilms'
import { dayOfWeekLabel, formatLateNightCaption, getLateNightFilms } from '@/lib/curation/getLateNightFilms'
import { formatWeekendCaption, getWeekendFilms } from '@/lib/curation/getWeekendFilms'
import { getTodayAnniversaries } from '@/lib/curation/directorAnniversaries'
import { trackEvent } from '@/lib/analytics/client'
import { buildYearsOnScreenCaptions } from '@/lib/curation/yearsOnScreenCaption'
import { formatLocalDate, formatLocalTimeHHMM, toKstIsoDate } from '@/lib/date'
import { useActiveMovieIdsByRegion, useActiveMovieTheaterPairs, useAlmostSoldOutCandidates, useClickRankings, useCurationLists, useFestivals, useFilmRankings, useInstagramRecommendations, useLateNightCandidates, useMovies, useTheaters } from '@/lib/supabase/queries'
import { getRegionFromCity } from '@/lib/regions'
import { getStoredRegion, setStoredRegion, subscribeStoredRegion } from '@/lib/regionStorage'
import { getFestivalDateLabel, getFestivalStatus, type FestivalStatus } from '@/lib/festival/status'
import type { Theater } from '@/types/api'
import type { Festival } from '@/types/festival'
import { ArrowUp, ChevronRight } from 'lucide-react'

/* ── 지역 설정 힌트 말풍선 — 지도 FilterBar의 안내와 동일한 문구/닫기 동작(yh_region_tip) ── */
function RegionHintBubble({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 60,
        width: 276,   /* 안내 문구가 두 줄로 떨어지는 폭 */
        animation: 'tipIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), tipGlow 0.7s ease-out',
      }}
    >
      {/* 꼬리 — 지역 칩에 닿는 툴팁 문법 (우측 칩 정렬) */}
      <div style={{
        position: 'absolute',
        top: -5,
        right: 24,
        width: 11,
        height: 11,
        background: 'var(--color-primary-base)',
        transform: 'rotate(45deg)',
        borderRadius: 4,
      }} />
      <div style={{
        position: 'relative',
        background: 'var(--color-primary-base)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-popover)',
        padding: '12px 12px 12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        color: 'var(--color-on-accent)',
      }}>
        <Icon name="map-pin" size={15} />
        <span className="text-note" style={{ flex: 1, color: 'var(--color-on-accent)' }}>
          지역을 설정해서 내 주변 영화관의 상영 정보를 조회하세요
        </span>
        <button
          onClick={onDismiss}
          style={{
            width: 18, height: 18, minWidth: 18, minHeight: 18,
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--color-on-accent) 20%, transparent)',
            border: 'none',
            color: 'var(--color-on-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: -1,
            padding: 0,
          }}
        >
          <Icon name="close" size={8} />
        </button>
      </div>
    </div>
  )
}

const FESTIVAL_STATUS_LABEL: Record<FestivalStatus, string> = { upcoming: '예정', ongoing: '진행 중', ended: '종료' }

// 데스크톱 배너 고정 폭 — 포스터 3장 가로 길이 정도(CurationSectionRow 데스크톱 포스터 210px × 3 + gap 16px × 2)
const FESTIVAL_BANNER_DESKTOP_WIDTH = 662

/* ── 섹션 지연 마운트 — 뷰포트 근접 시 실제 렌더, 그 전엔 고스트 행.
   섹션 전체를 한 번에 그리면 초기 렌더가 무거워서 스크롤 도달 시점에 나눠 그린다 ── */
function GhostSectionRow({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div style={{ paddingTop: isDesktop ? 48 : 32 }}>
      {/* 실제 섹션과 동일 규격: h2(26px)+행 상단 여백 16, 포스터 210/120·gap 16/10 */}
      <div style={{ width: 180, height: 26, borderRadius: 'var(--radius-badge)', margin: '0 var(--gutter-sheet) 16px', backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: isDesktop ? 16 : 10, overflow: 'hidden', padding: '0 var(--gutter-sheet)' }}>
        {Array.from({ length: isDesktop ? 6 : 3 }).map((_, i) => (
          <div key={i} style={{ width: isDesktop ? 210 : 120, flexShrink: 0 }}>
            <MovieCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

function LazyBlock({ isDesktop, children }: { isDesktop: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { rootMargin: '900px 0px' })   // 4~5섹션 분량 미리 — 도달 전에 채워짐
    io.observe(el)
    return () => io.disconnect()
  }, [shown])
  return <div ref={ref}>{shown ? children : <GhostSectionRow isDesktop={isDesktop} />}</div>
}

/* ── 주목할 영화제 배너 — 카드 아님. 제목줄은 다른 섹션과 같은 SectionHeader(왼쪽 고정,
   배너 폭과 무관), 배너만 별도로 모바일은 좌우 꽉 채움 / 데스크톱은 폭 고정 + 중앙 정렬,
   양옆 빈 공간은 배경보다 살짝 어두운 surface-raised로 채운다.
   지역 필터 무관, 전국에서 가장 임박한 영화제 1개 ── */
function FestivalBannerCard({ festival, today, isDesktop, onClick }: { festival: Festival; today: string; isDesktop: boolean; onClick: () => void }) {
  const status = getFestivalStatus(festival.startDate, festival.endDate, today)
  /* 상영작 탭 최상단 — 여길 눌러 나가는 비율이 아래 큐레이션 행들의 노출 기회를 깎는다.
     순서 논의에서 "배너가 위에 있어도 되는가"를 판단하려면 계측이 필요하다. */
  const sectionRef = useRef<HTMLDivElement>(null)
  const analytics = {
    ...buildSectionAnalytics({
      listId: 'festival_banner', sectionTitle: '주목할 영화제',
      run: 'fixed_top', movieCount: 0, layout: 'banner',
    }),
    festival_slug: festival.slug,
    festival_name: festival.name,
    festival_status: status,
  }
  useSectionDwellTracking(sectionRef, 'festival_banner', analytics)
  const dateLabel = getFestivalDateLabel(status, festival.startDate, festival.endDate, today)
  const handleBannerClick = () => {
    trackEvent('curation movie selected', { ...analytics, target_type: 'festival' })
    onClick()
  }
  // 외부 배너 URL이 죽는 경우(원본 삭제·403)가 실제로 있었음 — 깨진 이미지 띠 대신 통째 숨김
  const [bannerBroken, setBannerBroken] = useState(false)

  return (
    <div ref={sectionRef}>
      <SectionHeader
        title="주목할 영화제"
        isDesktop={isDesktop}
        trailing={<ChevronRight size={18} strokeWidth={1.75} color="var(--color-text-caption)" />}
      />

      {/* 배너 이미지 — banner_url 있을 때만. 전체 폭 띠에 surface-raised 배경을 깔고
          그 안에서 데스크톱만 고정폭으로 중앙 정렬(모바일은 100%라 여백 자체가 없음) */}
      {festival.bannerUrl && !bannerBroken && (
        <button
          onClick={handleBannerClick}
          style={{
            display: 'block', width: '100%', padding: 0, margin: '12px 0 0', border: 'none',
            backgroundColor: isDesktop ? 'var(--color-surface-raised)' : 'transparent', cursor: 'pointer', minHeight: 'auto',
          }}
        >
          {/* 21/4 — jiff28 배너 실제 크기(1260x240) 기준. 다른 영화제 배너가 비율이 달라도
              objectFit:cover가 중앙 크롭하므로 레이아웃은 안 깨짐 */}
          <div style={{
            position: 'relative', aspectRatio: '21 / 4',
            width: isDesktop ? FESTIVAL_BANNER_DESKTOP_WIDTH : 'calc(100% - var(--gutter-sheet) * 2)',
            margin: isDesktop ? '0 auto' : '0 auto',
            borderRadius: isDesktop ? 0 : 'var(--radius-button)',
            overflow: 'hidden',
          }}>
            <Image
              src={festival.bannerUrl}
              alt={festival.name}
              fill
              priority
              sizes={isDesktop ? `${FESTIVAL_BANNER_DESKTOP_WIDTH}px` : '100vw'}
              style={{ objectFit: 'cover' }}
              onError={() => setBannerBroken(true)}
            />
          </div>
        </button>
      )}
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

  const handleMovieClick = (id: string) => { navStart(); router.push(`/films/movie/${id}`) }
  const handleDirectorClick = (name: string) => { navStart(); router.push(`/films/director/${encodeURIComponent(name)}`) }

  const { state: locState, coords: locCoords, modalSuppressed: locModalSuppressed, request: requestLoc, dismiss: dismissLoc } = useLocationPermission()
  // 접속 위치 지역 — 드롭다운 배지·자동 스크롤 + (미설정 사용자에 한해) 최초 1회 자동 지정
  const currentLocationRegion = useCurrentLocationRegion()
  const isDesktop = mounted && isDesktopLayout

  // getStoredRegion(localStorage)을 useState 초기화에서 읽으면 SSR(null)과 클라 첫 렌더가
  // 갈려 hydration mismatch → 트리 재생성 (상세 직진입 무한로딩 스톨의 진원). effect에서 읽는다.
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  useEffect(() => { setSelectedRegion(getStoredRegion()) }, [])
  // 지도 탭에서 지역 바꿔도 동기 — persistent 탭 마운트라 이벤트 구독으로만 전달됨
  useEffect(() => subscribeStoredRegion(setSelectedRegion), [])

  function pickRegion(id: string | null) {
    setSelectedRegion(id)
    setStoredRegion(id)
  }
  const userLocation = locCoords
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false)
  const [revealedByScrollUp, setRevealedByScrollUp] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setScrolledPastHeader(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* 모바일: 아래로 읽어 내려갈 땐 버튼을 숨기고, 위로 조금만 올리면 바로 띄운다.
     "맨 위로"를 찾는 순간은 위로 되돌아갈 때뿐이라, 내려가는 내내 떠 있으면 콘텐츠만 가린다.
     PC는 포인터로 정확히 피할 수 있고 화면도 넓어 기존대로 계속 띄운다. */
  useEffect(() => {
    if (isDesktop) {
      setRevealedByScrollUp(false)
      return
    }
    let lastY = window.scrollY
    let upAccum = 0
    /* setState는 상태가 실제로 바뀔 때만 — 스크롤마다 부르면 리렌더가 쏟아진다 */
    let shown = false
    const REVEAL_AFTER_PX = 24   // 스크롤 관성·바운스로 생기는 잔떨림은 무시

    function onScroll() {
      const y = window.scrollY
      const dy = y - lastY
      lastY = y
      if (dy > 0) {
        upAccum = 0
        if (shown) { shown = false; setRevealedByScrollUp(false) }
      } else if (dy < 0) {
        upAccum -= dy
        if (!shown && upAccum >= REVEAL_AFTER_PX) { shown = true; setRevealedByScrollUp(true) }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isDesktop])

  /* 헤더가 화면 밖으로 나갔을 때만 후보 — 맨 위에서 바운스로 뜨는 걸 막는다 */
  const showScrollTop = scrolledPastHeader && (isDesktop || revealedByScrollUp)

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

  const { data: movies = [], isLoading: moviesLoading } = useMovies()
  const { data: theaters = [] } = useTheaters()
  const { data: curationLists = [], isLoading: curationListsLoading } = useCurationLists()
  const { data: activeMovieIds = [] } = useActiveMovieIdsByRegion(selectedRegion)
  const { data: movieTheaterPairs = [] } = useActiveMovieTheaterPairs(selectedRegion)
  const { data: filmRankingRow } = useFilmRankings()
  const { data: clickRankings } = useClickRankings()
  const { data: festivals = [] } = useFestivals()
  const { data: instagramRecs = [] } = useInstagramRecommendations()
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

  /* 시의성 캡션 — [시간 / 극장] 통째 clickable → 극장 상세 시간표. PC는 폰트 한 단계 승격 */
  const theaterCaption = (movieKey: string, theaterId: string, timeText: string, theaterName: string, deep?: { date: string; time: string }, seatText?: string) => {
    const href = deep
      ? `/films/theater/${theaterId}?movie=${movieKey}&date=${deep.date}&time=${deep.time}`
      : `/films/theater/${theaterId}`
    const go = () => { navStart(); router.push(href) }
    return (
    <div
      key={movieKey}
      className="caption-link"
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); go() }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); go() } }}
      style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, minHeight: 'auto' }}
    >
      <span style={{ fontSize: isDesktop ? 'var(--text-body)' : 'var(--text-meta)', color: 'var(--color-neutral-800)', fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{timeText}</span>
      {seatText && (
        <span style={{ fontSize: isDesktop ? 'var(--text-body)' : 'var(--text-meta)', color: 'var(--color-error)', fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{seatText}</span>
      )}
      <span style={{ fontSize: isDesktop ? 'var(--text-body)' : 'var(--text-meta)', color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theaterName}</span>
    </div>
    )
  }

  const almostSoldOutCustomInfos = new Map<string, React.ReactNode>(
    almostSoldOutFilms.map((f) => {
      const first = f.showings[0]
      const dayLabel = first?.showDate === asoToday ? '오늘' : '내일'
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      const theaterId = first?.theaterId ?? ''
      // 잔여석은 크롤 스냅샷 — 0석이면 표시하지 않음 (isAlmostSoldOut이 매진을 거르지만 방어)
      const seatText = first && first.seatAvailable > 0 ? `잔여 ${first.seatAvailable}석` : undefined
      return [
        f.movie.id,
        theaterCaption(f.movie.id, theaterId, dateText, theaterName,
          first ? { date: first.showDate, time: first.showTime } : undefined,
          seatText),
      ]
    })
  )

  /* 예전엔 getRealtimePositions()가 run 조립 규칙을 손으로 복제해 커스텀 클릭 핸들러에
     position을 넣어줬다. 그 복제본이 startIndex(run1 길이)도, run2 앞의 랭킹 섹션도 세지 않아
     같은 섹션의 dwell 이벤트와 click 이벤트가 서로 다른 position을 보내고 있었다.
     이제 순번은 renderRun이 실제 렌더 순서에서 한 번만 계산하고, 커스텀 핸들러는 없앴다
     — 다섯 개 다 trackEvent + handleMovieClick뿐이라 기본 경로와 하는 일이 같았다. */


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
      const first = f.showings[0]
      const dayLabel = first?.showDate === lnToday ? '오늘' : '내일'
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      const theaterId = first?.theaterId ?? ''
      return [
        f.movie.id,
        theaterCaption(f.movie.id, theaterId, dateText, theaterName,
          first ? { date: first.showDate, time: first.showTime } : undefined),
      ]
    })
  )


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
      const first = f.showings[0]
      const dayLabel = first?.showDate === lnToday ? '오늘' : dayOfWeekLabel(first?.showDate ?? lnToday)
      const rest = f.showings.length - 1
      const dateText = first ? `${dayLabel} ${first.showTime}${rest > 0 ? ` · 외 ${rest}회` : ''}` : ''
      const theaterName = first?.theaterName ?? ''

      const theaterId = first?.theaterId ?? ''
      return [
        f.movie.id,
        theaterCaption(f.movie.id, theaterId, dateText, theaterName,
          first ? { date: first.showDate, time: first.showTime } : undefined),
      ]
    })
  )


  // 지금 출발하면 볼 수 있는 — useCurationData의 todayShowFilms(출발 버퍼 30분 + 4시간 창) 재사용.
  // 훅 자체엔 최소 편수 게이트가 없어 여기서 3편 미만이면 숨긴다.
  const leaveNowFilms = todayShowFilms.length >= 3 ? todayShowFilms : []
  const leaveNowCaptions = new Map(
    leaveNowFilms.map((f) => [f.movie.id, `${f.nextShowTime} ${f.theaterName}`]),
  )
  /* 2.0: [시간 / 극장명] 두 줄 — "언제"가 먼저 잡히게 (피그마 확정 문법) */
  const leaveNowCustomInfos = new Map<string, React.ReactNode>(
    leaveNowFilms.map((f) => [
      f.movie.id,
      <div key={f.movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-neutral-800)', fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{`오늘 ${f.nextShowTime}`}</span>
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.theaterName}</span>
      </div>,
    ])
  )


  // 단독 상영 — soloTheaterFilms는 지역 미선택 시 훅이 빈 배열을 반환(지도 탭과 동일 제약).
  // 크롤 커버리지가 낮은 지역에선 "단독"이 진짜 유일 상영이 아니라 "이 지도가 아는 극장이 하나뿐"일 수 있어
  // 카피에서 "유일하게"처럼 단정적인 표현은 쓰지 않는다.
  const soloFilms = soloTheaterFilms.length >= 3 ? soloTheaterFilms : []
  const soloCaptions = new Map(soloFilms.map((f) => [f.movie.id, f.theaterName]))


  // 오래된 작품(15년↑)에만 제작연도 카피 — movies.year는 제작연도라 "N년 만에 재개봉" 단정 금지
  const returningYearCaptions = buildYearsOnScreenCaptions(
    returningFilms.map((f) => f.movie),
    new Date().getFullYear(),
  )


  const realtimeSections = [
    {
      listId: 'realtime_last_week',
      nameKo: '막바지 상영',
      description: '상영관이 줄고 있어요. 미리 확인하고 예매하세요',
      posterBadges: lastWeekBadgeMap,
      movies: lastWeekFilms.map((f) => f.movie),
    },
    {
      listId: 'realtime_new_indie',
      nameKo: '이번 주 새롭게 상영하는 영화',
      description: '이번 주 스크린에 새로 오른 영화들',
      movies: newIndieFilms.map((f) => f.movie),
    },
    {
      listId: 'realtime_returning',
      nameKo: '오랜만에 상영하는 영화',
      description: '잠시 사라졌다가 다시 스크린으로 돌아온 영화들',
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
      {/* 데스크톱: 본문이 레일 위에 뜬 카드처럼 — 좌상/좌하 코너를 레일색으로 깎는 고정 마스크 (지도 탭 패널 r16과 동일 문법) */}
      {isDesktop && (
        <>
          <div aria-hidden style={{
            position: 'fixed', left: GLOBAL_NAV_DESKTOP_WIDTH, top: 0, width: 16, height: 16,
            background: 'radial-gradient(circle 16px at 100% 100%, transparent 98%, var(--color-surface-raised) 100%)',
            zIndex: 1100, pointerEvents: 'none',
          }} />
          <div aria-hidden style={{
            position: 'fixed', left: GLOBAL_NAV_DESKTOP_WIDTH, bottom: 0, width: 16, height: 16,
            background: 'radial-gradient(circle 16px at 100% 0%, transparent 98%, var(--color-surface-raised) 100%)',
            zIndex: 1100, pointerEvents: 'none',
          }} />
          {/* 카드가 레일 위에 떠 있다면 그림자가 레일 쪽으로 떨어져야 한다 — 코너만 깎여 있고
              그림자가 없어 평평하게 붙어 보였다. 본문이 카드 요소가 아니라(전폭 + paddingLeft)
              boxShadow를 직접 못 걸므로, 카드 왼쪽 라인과 같은 라운딩의 투명 요소를 세워
              그 그림자만 쓴다 — 직선 그라데이션 띠는 코너 곡선을 무시해 어긋나 보였다.
              세기는 --shadow-sm을 수평으로 눕힌 값. 레일(z 1150) 위에 보이도록 z 1200. */}
          <div aria-hidden style={{
            position: 'fixed', left: GLOBAL_NAV_DESKTOP_WIDTH, top: 0, bottom: 0, width: 16,
            borderRadius: '16px 0 0 16px',
            boxShadow: 'var(--shadow-panel-left)',
            /* 블러(8px)가 오프셋(-2px)보다 커서 요소 오른쪽으로도 번진다 —
               본문 위에 흐린 세로선으로 보였다. 오른쪽 경계에서 잘라낸다. */
            clipPath: 'inset(-24px 0 -24px -24px)',
            zIndex: 1200, pointerEvents: 'none',
          }} />
        </>
      )}
      <header ref={headerRef} style={{
        padding: '20px var(--gutter-sheet) 0',
        /* 2.0: PC는 헤더 고정 — 콘텐츠가 구분선 아래로 스크롤 */
        ...(isDesktop ? { position: 'sticky' as const, top: 0, zIndex: 100, backgroundColor: 'var(--color-surface-bg)' } : {}),
      }}>
        {isDesktop ? (
          /* 데스크톱: [영화+서브타이틀]  ←─검색창 절대 중앙─→  [지역칩] */
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 52 }}>

            {/* Left: title (flow) */}
            <div style={{ flexShrink: 0, zIndex: 1 }}>
              <h2 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                상영작
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', whiteSpace: 'nowrap' }}>
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
                    currentLocationId={currentLocationRegion}
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
                  festivals={festivals}
                  isDesktop={true}
                />
              </div>
            </div>
          </div>
        ) : (
          /* 모바일: 제목 + 지역칩 → 검색창 → 서브타이틀 순 */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                상영작
              </h2>
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
                      currentLocationId={currentLocationRegion}
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
                festivals={festivals}
                isDesktop={false}
              />
            </div>
          </>
        )}

        {!isDesktop && (
          <p style={{ margin: '8px 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
            {subtitle}
          </p>
        )}

        {/* 구분선 */}
        <Divider style={{ marginTop: 16 }} />
      </header>

      <RouteProgressBar isDesktop={isDesktop} />

      {/* 2.0: PC 콘텐츠 최대폭 컬럼 (내부 gutter 포함 시각 ≈1000) — 프레임은 풀블리드 유지 */}
      <div style={isDesktop ? { maxWidth: 1048, margin: '0 auto' } : undefined}>
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
          listId: string; nameKo: string; description?: string
          movies: import('@/types/api').Movie[]
          posterBadges?: Map<string, number>
          movieCaptions?: Map<string, string>
          showRank?: boolean
          customBottomInfos?: Map<string, React.ReactNode>
          onMovieClick?: (movieId: string) => void
        }

        // 큐레이션 섹션 그룹별 분류
        const seasonal   = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 1)
        const awards     = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 2)
        const decades    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 3)
        const critics    = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 4)
        const movements  = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 5)
        const themes     = visibleSections.filter((s) => (SECTION_GROUP[s.listId] ?? 99) === 6)

        const rtLastWeek = realtimeSections.filter((s) => s.listId === 'realtime_last_week')
        const rtNew      = realtimeSections.filter((s) => s.listId !== 'realtime_last_week')

        // 매진 임박 — 3편 미만이면 getAlmostSoldOutFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtAlmostSoldOut: AnySection[] = almostSoldOutFilms.length > 0 ? [{
          listId: 'realtime_almost_soldout',
          nameKo: '매진 임박',
          description: '최근 확인 기준, 오늘·내일 회차의 좌석이 얼마 남지 않았어요',
          movieCaptions: almostSoldOutCaptions,
          customBottomInfos: almostSoldOutCustomInfos,
          movies: almostSoldOutFilms.map((f) => f.movie),
        }] : []

        // 심야 상영 — 3편 미만이면 getLateNightFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtLateNight: AnySection[] = lateNightFilms.length > 0 ? [{
          listId: 'realtime_late_night',
          nameKo: '심야 상영',
          description: '하루의 끝, 밤 깊은 시간에 시작하는 회차들이에요',
          movieCaptions: lateNightCaptions,
          customBottomInfos: lateNightCustomInfos,
          movies: lateNightFilms.map((f) => f.movie),
        }] : []

        // 이번 주말 상영 — 3편 미만이면 getWeekendFilms가 빈 배열을 반환해 섹션 자체가 숨겨짐
        const rtWeekend: AnySection[] = weekendFilms.length > 0 ? [{
          listId: 'realtime_weekend',
          nameKo: '이번 주말 상영',
          description: '이번 주말 볼 수 있는 회차예요',
          movieCaptions: weekendCaptions,
          customBottomInfos: weekendCustomInfos,
          movies: weekendFilms.map((f) => f.movie),
        }] : []

        // 지금 출발하면 볼 수 있는 — 3편 미만이면 위에서 이미 빈 배열로 걸러짐
        const rtLeaveNow: AnySection[] = leaveNowFilms.length > 0 ? [{
          listId: 'realtime_leave_now',
          nameKo: '지금 출발하면 볼 수 있는',
          description: '지금 출발하면 늦지 않게 볼 수 있는 회차예요',
          movieCaptions: leaveNowCaptions,
          customBottomInfos: leaveNowCustomInfos,
          movies: leaveNowFilms.map((f) => f.movie),
        }] : []

        // 단독 상영 — 3편 미만이면 위에서 이미 빈 배열로 걸러짐, 지역 미선택 시에도 빈 배열
        const rtSolo: AnySection[] = soloFilms.length > 0 ? [{
          listId: 'realtime_solo_theater',
          nameKo: `${selectedRegion ?? '이 지역'}에서 단 한 곳`,
          description: '이 지역에서는 이 극장에서만 상영해요',
          movieCaptions: soloCaptions,
          movies: soloFilms.map((f) => f.movie),
        }] : []

        /* 인기 랭킹 — 예매 클릭·상세 조회를 합쳐 하나로. 예전엔 두 섹션이었는데 상위 10의
           겹침이 4/10라 절반이 같은 포스터였고, 각각은 표본이 작아 하위권이 전부 동점이었다
           (근거와 가중치는 lib/curation/popularRanking.ts 주석). 순위는 캡션 텍스트가 아니라
           포스터 좌하단 숫자로 보여주므로 캡션 자리는 감독명에 돌려준다. */
        const popularRanked = mergePopularRanking(
          clickRankings?.booking,
          clickRankings?.views,
          (movieId) => activeMovieIdSet.has(movieId) && movieById.has(movieId),
        )
        const rtPopularRank: AnySection[] = popularRanked.length >= 3 ? [{
          listId: 'realtime_popular_rank',
          nameKo: '지금 가장 많이 찾는 영화',
          description: '최근 7일, 예매하러 떠나고 상세를 열어본 걸 합쳐 매겼어요',
          showRank: true,
          movies: popularRanked.map((e) => movieById.get(e.movieId)!),
        }] : []

        /* 개봉 N주년 — 섹션에서 포스터 칩으로 강등. 한 줄을 통째로 쓸 만한 정보가 아니었고,
           칩으로 두면 어느 섹션에 나오든 따라붙어 노출 기회가 오히려 늘어난다.
           3편 게이트도 뗐다 — 섹션은 편수가 모여야 성립하지만 칩은 한 편이어도 된다. */
        const anniversaryAges = buildAnniversaryAges(movies, activeMovieIdSet, new Date().getFullYear())

        // 러닝타임 — 100분 이내 / 3시간 이상, 활성 상영작만, 3편 미만 숨김
        function runtimeSection(
          listId: string, nameKo: string, description: string,
          match: (runtime: number) => boolean, sort: (a: number, b: number) => number,
        ): AnySection[] {
          const films = movies
            .filter((m) => m.runtimeMinutes != null && match(m.runtimeMinutes) && activeMovieIdSet.has(m.id))
            .sort((a, b) => sort(a.runtimeMinutes!, b.runtimeMinutes!))
          if (films.length < 3) return []
          return [{
            listId, nameKo, description,
            movieCaptions: new Map(films.map((m) => [m.id, `${m.runtimeMinutes}분`])),
            movies: films,
          }]
        }
        const rtShortRuntime = runtimeSection(
          'realtime_short_runtime', '퇴근 후 부담 없는, 100분 이내',
          '짧아서 더 오래 남는 영화들이에요', (r) => r <= 100 && r >= 60, (a, b) => a - b)
        const rtLongRuntime = runtimeSection(
          'realtime_long_runtime', '3시간, 각오하고 보는 영화',
          '긴 호흡만이 데려갈 수 있는 곳이 있어요', (r) => r >= 180, (a, b) => b - a)

        // 특별전 interleave 준비
        const [special0, special1] = specialDirectorSections

        function renderSpecial(s: typeof specialDirectorSections[number] | undefined, slot?: number) {
          if (!s) return null
          const dist = userLocation
            ? haversineKm(userLocation.lat, userLocation.lng, s.theater.lat, s.theater.lng)
            : null
          const distSuffix = dist != null ? `(${formatDist(dist)})` : undefined
          return (
            <DirectorSpecialSection
              key={`special_${s.directorName}_${s.theater.id}`}
              directorName={s.directorName} theater={s.theater} films={s.films}
              distSuffix={distSuffix} isDesktop={isDesktop} slot={slot}
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
                <div key={`ann_sparse_${ri}`} style={{ display: 'flex', gap: 12, padding: isDesktop ? '48px var(--gutter-sheet) 0' : '32px var(--gutter-sheet) 0' }}>
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
        function renderRun(list: AnySection[], keyPrefix: string, startIndex: number) {
          const active = list.filter((s) => s.movies.length > 0)
          if (active.length === 0) return null
          const nodes: React.ReactNode[] = []
          function rowFor(s: AnySection, compact: boolean) {
            /* 순번은 실제 렌더 순서에서 여기서만 계산한다. 그날 게이트를 통과한 섹션만
               세므로 날짜 간 절대 비교용이 아니다 — 시점 간 비교는 list_id로 한다. */
            const position = startIndex + active.indexOf(s)
            /* dwell 이벤트와 click 이벤트에 같은 객체를 실어 둘의 속성이 어긋나지 않게 한다 */
            const analytics = buildSectionAnalytics({
              listId: s.listId, sectionTitle: s.nameKo, run: keyPrefix,
              position, movieCount: s.movies.length, compact,
            })
            return (
              <CurationSectionRow key={s.listId} id={s.listId}
                title={s.nameKo}   /* 2.0: 부제 삭제 */
                movies={s.movies} isDesktop={isDesktop}
                posterBadges={s.posterBadges} movieCaptions={s.movieCaptions}
                showRank={s.showRank}
                posterAnniversaries={anniversaryAges}
                customBottomInfos={s.customBottomInfos}
                analytics={analytics}
                onMovieClick={(movieId) => {
                  trackEvent('curation movie selected', {
                    ...analytics,
                    movie_id: movieId,
                    movie_title: movieById.get(movieId)?.title,
                    movie_rank: s.showRank ? s.movies.findIndex((m) => m.id === movieId) + 1 : undefined,
                  })
                  handleMovieClick(movieId)
                }}
                compact={compact} />
            )
          }
          // 모바일: 2열로 묶진 않지만, sparse(≤2편)는 카드 문법(수상 워터마크 포함)으로
          if (!isDesktop) {
            return <>{active.map((s) =>
              <LazyBlock key={s.listId} isDesktop={isDesktop}>
                {s.movies.length <= 2
                  ? <div style={{ display: 'flex', padding: '32px var(--gutter-sheet) 0' }}>{rowFor(s, true)}</div>
                  : rowFor(s, false)}
              </LazyBlock>
            )}</>
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
                <LazyBlock key={`${keyPrefix}_pair_${pending.listId}`} isDesktop={isDesktop}>
                  <div style={{ display: 'flex', gap: 12, padding: '48px var(--gutter-sheet) 0' }}>
                    {rowFor(pending, true)}
                    {rowFor(s, true)}
                  </div>
                </LazyBlock>
              )
              pending = null
              deferred.forEach((d) => nodes.push(<LazyBlock key={d.listId} isDesktop={isDesktop}>{rowFor(d, false)}</LazyBlock>))
              deferred.length = 0
              continue
            }
            // rich 섹션: 짝을 기다리는 sparse가 있으면 뒤로 미뤄두고, 없으면 바로 낸다
            if (pending != null) deferred.push(s)
            else nodes.push(<LazyBlock key={s.listId} isDesktop={isDesktop}>{rowFor(s, false)}</LazyBlock>)
          }
          if (pending != null) {
            // 끝까지 짝을 못 찾은 sparse — 큰 포스터 1~2장에 빈 공간 안 남게 단독 카드로
            nodes.push(
              <LazyBlock key={`${keyPrefix}_solo_${pending.listId}`} isDesktop={isDesktop}>
                <div style={{ display: 'flex', gap: 12, padding: '48px var(--gutter-sheet) 0' }}>
                  {rowFor(pending, true)}
                </div>
              </LazyBlock>
            )
            deferred.forEach((d) => nodes.push(<LazyBlock key={d.listId} isDesktop={isDesktop}>{rowFor(d, false)}</LazyBlock>))
          }
          return <>{nodes}</>
        }

        // 특별전 앞뒤 경계를 기준으로 두 개의 run 구성 — 30일 CTR 기준 재배치:
        // 시의성(막바지·매진임박)을 최상단으로, 저CTR 시기별(seasonal)은 명당에서 강등
        /* run을 넷으로 나눈다. sparse(≤2편) 페어링이 run 안에서만 일어나므로, run 경계가
           곧 "이것들끼리는 한 줄에 묶지 말라"는 선언이다. 시의성(run1)과 지식형(run1b)을
           한 배열에 넣으면 PC에서 "매진 임박" 옆에 "비 오는 날 보는 영화"가 붙는다. */
        const runTop: AnySection[] = [...rtPopularRank]                    // 최상단 — 인기 랭킹 단독
        const run1: AnySection[] = [...rtLeaveNow, ...rtLastWeek, ...rtAlmostSoldOut]   // 시의성
        const run1b: AnySection[] = [                                      // 지식형 — 특별전 앞
          ...rtShortRuntime,
          ...themes,
          ...rtLongRuntime,
        ]
        const run2: AnySection[] = [                                       // 나머지 — 특별전 뒤
          ...rtWeekend, ...rtNew, ...rtLateNight,
          ...rtSolo,
          ...awards,
          ...seasonal,
          ...decades, ...critics, ...movements,
        ]

        /* startIndex는 "그날 실제로 그려진 섹션 수"로 이어붙인다. 예전엔 run1.length(게이트
           통과 여부를 안 본 배열 길이)를 썼는데, 숨은 섹션까지 세어 run2 순번이 부풀었다.
           산술은 순수 함수에 맡긴다 — 손으로 관리하다 어긋난 게 이번 버그의 원인이었다. */
        const [startTop, startRun1, startRun1b, startRun2] =
          computeRunStartIndexes([runTop, run1, run1b, run2])

        return (
          <>
            {/* 로딩 중 자리표시 — 큐레이션 섹션이 몇 개 뜰지 로딩 전엔 알 수 없어 최소 자리만 흉내.
                로딩 끝난 뒤에도 visibleSections가 비어 있으면(진짜 빈 상태) 계속 아무것도 안 그림 */}
            {(moviesLoading || curationListsLoading) && (
              <div style={{ paddingTop: isDesktop ? 48 : 24 }}>
                <div style={{ display: 'flex', gap: isDesktop ? 16 : 10, overflow: 'hidden', padding: '0 16px' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ width: isDesktop ? 210 : 120, flexShrink: 0 }}>
                      <MovieCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 주목할 영화제 — 지역 필터 무관 전국 대상, festivals 0개면 미노출 */}
            {festivals.length > 0 && (
              <div style={{ paddingTop: isDesktop ? 24 : 16 }}>
                <FestivalBannerCard
                  festival={festivals[0]}
                  today={toKstIsoDate(new Date())}
                  isDesktop={isDesktop}
                  onClick={() => router.push(`/festival/${festivals[0].slug}`)}
                />
              </div>
            )}

            {/* 0. 인기 랭킹 — 순번 체계의 첫 자리. 상단 고정 섹션(개인화·기념일·특별전·인스타)과
                달리 renderRun을 그대로 타므로 dwell/클릭 계측이 다른 큐레이션 행과 동일하다 */}
            {renderRun(runTop, 'top', startTop)}

            {/* 0.5 내 관심 영화 상영 소식 — 로그인 + 관심 영화가 상영 중일 때만 (P2) */}
            <FavoriteMoviesSection
              movies={movies}
              activeMovieIds={activeMovieIds}
              isDesktop={isDesktop}
              onMovieClick={handleMovieClick}
            />

            {/* 1. 개인화 — 최근 본 영화 기반, 이력 없으면 미노출 */}
            <PersonalizedSection
              movies={movies}
              activeMovieIds={activeMovieIds}
              recentlyViewed={recentlyViewed}
              isDesktop={isDesktop}
              onMovieClick={handleMovieClick}
            />

            {/* 2. 기념일 */}
            {renderAnniversaries(anniversarySections)}

            {/* 3. 특별전 #0 */}
            {renderSpecial(special0, 0)}

            {/* 인스타그램에서 추천한 그 영화 — run1/run2 순번 체계 밖(개인화·기념일·특별전과 동일),
                발견 성격이라 시의성 run1보다 위, 상단권에 배치 */}
            <InstagramRecsSection
              recommendations={instagramRecs}
              activeMovieIds={activeMovieIdSet}
              today={toKstIsoDate(new Date())}
              isDesktop={isDesktop}
              onMovieClick={handleMovieClick}
              onFestivalClick={(slug) => router.push(`/festival/${slug}`)}
            />

            {/* 3. 지금 출발하면 + 막바지 + 매진 임박 — 시의성. 연속 sparse 자동 페어링 */}
            {renderRun(run1, 'run1', startRun1)}

            {/* 4. 러닝타임·개봉주년·테마 — 지식형. run1(시의성)과 나눠서 PC 2열 페어링이
                두 성격을 한 줄에 묶지 않게 한다 */}
            {renderRun(run1b, 'run1b', startRun1b)}

            {/* 4. 특별전 #1 (interleaved) */}
            {special1 && <LazyBlock isDesktop={isDesktop}>{renderSpecial(special1, 1)}</LazyBlock>}

            {/* 5~10. 주말·신작·심야·단독 · 거장/수상 · 시기별 · 연도별 · 평론가 · 무브먼트 */}
            {renderRun(run2, 'run2', startRun2)}

            {/* 11. 감독 스포트라이트 */}
            <LazyBlock isDesktop={isDesktop}>
              <DirectorSpotlightSection
                movies={movies} activeMovieIds={activeMovieIdSet}
                isDesktop={isDesktop} onDirectorClick={handleDirectorClick} />
            </LazyBlock>

            {/* 12. 전체 상영작 그리드 */}
            <LazyBlock isDesktop={isDesktop}>
            <AllMoviesGrid
              movies={movies.filter((m) => activeMovieIdSet.has(m.id))}
              isDesktop={isDesktop}
              regionLabel={selectedRegion ?? undefined}
              theaterCountByMovie={theaterCountByMovie}
              onMovieClick={handleMovieClick} />
            </LazyBlock>
          </>
        )
      })()}

      </div>

      {/* scroll-to-top: 헤더가 뷰포트 밖으로 나가면 표시 */}
      {showScrollTop && (
        /* 지도 탭 FAB와 같은 프리미티브 — 크기(44)·그림자(--shadow-md)·테두리를 공유한다.
           예전엔 40px 인라인 버튼이라 지도와 크기가 어긋났고 hit area도 44 미만이었다. */
        <FabRound
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
          title="맨 위로"
          style={{
            position: 'fixed',
            right: isDesktop ? 32 : 20,
            bottom: isDesktop
              ? 32
              : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
            zIndex: 100,
          }}
        >
          <ArrowUp size={20} strokeWidth={1.75} color="currentColor" />
        </FabRound>
      )}
    </div>
  )
}
