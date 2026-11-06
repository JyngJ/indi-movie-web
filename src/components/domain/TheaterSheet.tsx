import { useEffect, useRef, useState, useMemo } from 'react'
import { usePendingNavItem } from '@/hooks/usePendingNavItem'
import { PosterThumb } from './PosterThumb'
import { DetailDateTabs } from './DetailDateTabs'
import { TheaterScheduleBody } from './theaterSchedule/TheaterScheduleBody'
import { Button } from '@/components/primitives/Button'
import { IconButton } from '@/components/primitives/IconButton'
import { Icon } from '@/components/primitives/Icon'
import { PosterChip } from '@/components/primitives/PosterChip'
import { ScrollNavButton } from '@/components/primitives/ScrollNavButton'
import { EmptyState } from '@/components/primitives/EmptyState'
import { TheaterFavoriteAction } from '@/components/domain/favorites/TheaterFavoriteAction'
import { FilterPill } from '@/components/primitives/FilterPill'
import { Chip } from '@/components/primitives/Chip'
import { DirectorChip } from '@/components/primitives/DirectorChip'
import { Toast } from '@/components/primitives/Toast'
import type { Theater } from '@/types/api'
import { GENRES, normalizeGenre } from '@/lib/genres'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { withFlag } from '@/lib/nations'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { useDragSheet } from '@/hooks/useDragSheet'
import { useMomentumScroll } from '@/hooks/useMomentumScroll'
import { useTheaterSchedule } from '@/hooks/useTheaterSchedule'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { GvEventSection } from './GvEventSection'
import { GvDetailPanel } from './GvDetailPanel'
import { BookingCtaButton, ShareScheduleButton } from './booking/BookingActions'
import type { GvEvent } from '@/data/gv-events'
import { isSoldOut } from '@/lib/catalog/seatAvailability'
import { naverDirectionsUrls } from '@/lib/map/directions'
import {
  EMPTY_SCHEDULE_FILTER,
  dateForMovie,
  filterMovieGroups,
  isFilterActive,
  splitNations,
  type ScheduleMovieFilter,
} from '@/lib/theater/schedule'

/* ── 상수 ──────────────────────────────────────────────────────── */
// 접힌 상태에서 보이는 높이 — 피그마 TOBE collapsed: 핸들(24) + 헤더(128) + 포스터스트립(262, 포스터 238 + 상하 12)
// 드래그 계산에 숫자가 필요해 safe-area(아이폰 홈 인디케이터)는 빠져 있다 — 아이폰에서는 탭바가 그만큼 더 높아
// 보이는 시트가 약 34px 줄어든다. 고치려면 safe-area를 런타임에 읽어야 해서 보류(2026-09, --nav-mobile-offset 도입 시 확인).
export const THEATER_SHEET_COLLAPSED_H = 414 + GLOBAL_NAV_MOBILE_HEIGHT

/* ── 포스터 캐러셀 레이아웃 — 2.0: 고정폭 128 (피그마 PosterItem 스펙) ──
   화면 분할(N열 딱 맞춤) 폐지 — 스크롤 리스트는 다음 아이템이 잘려 보이는 게 어포던스.
   좁은 화면(<360)만 112로 한 단계 축소. */
const POSTER_GAP = 16
const POSTER_PAD_LEFT = 24  // = --gutter-sheet (시트 좌우 정렬선)
function calcPosterItemW(w: number): number {
  if (w <= 0) return 128
  return w < 360 ? 112 : 128
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */




/* Lucide map-pinned */






/* ── Sheet filter ───────────────────────────────────────────────── */
function TheaterQueryFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ flex: 1, minWidth: '100%' }}>
      <EmptyState
        message={message}
        paddingY={32}
        style={{ gap: 16 }}
        action={
          <Button variant="secondary" size="md" onClick={onRetry}>
            <Icon name="rotate-cw" size="md" />
            다시 불러오기
          </Button>
        }
      />
    </div>
  )
}

type SheetFilterState = ScheduleMovieFilter

/* ── Props ──────────────────────────────────────────────────────── */
interface TheaterSheetProps {
  theater: Theater
  expanded: boolean
  exiting?: boolean           // true이면 아래로 퇴장 애니메이션
  presentation?: 'sheet' | 'panel' | 'dock'
  selectedMovieId: string
  onMovieSelect: (id: string) => void
  onExpand: () => void
  onCollapse: () => void
  onClose: () => void
  onMovieSearch?: (movieId: string, movieTitle: string) => void
  onMovieDetailOpen?: (movieId: string) => void
  onDirectorOpen?: (name: string) => void
  mapFilters?: { genres: string[]; nations: string[] }
  initialIsoDate?: string
  initialShowtimeId?: string
  initialGvId?: string
  gvEvents?: GvEvent[]
  onBack?: () => void
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export function TheaterSheet({
  theater,
  expanded,
  exiting = false,
  presentation = 'sheet',
  selectedMovieId,
  onMovieSelect,
  onExpand,
  onCollapse,
  onClose,
  onMovieSearch,
  onMovieDetailOpen,
  onDirectorOpen,
  mapFilters,
  initialIsoDate,
  initialShowtimeId,
  initialGvId,
  gvEvents = [],
  onBack,
}: TheaterSheetProps) {

  const { pendingId: movieNavPendingId, navigate: navigateMovie } = usePendingNavItem()
  // 'panel'(우측 플로팅 카드) · 'dock'(좌측 도크 내장) — 헤더/스크롤/배경 등 콘텐츠 쪽 스타일은 동일하게 취급
  const floatingPanel = presentation === 'panel'
  const dockMode = presentation === 'dock'
  const panelMode = floatingPanel || dockMode
  const shownExpanded = panelMode || expanded

  /* ── Sheet filter state ─────────────────────────────────────── */
  // const [showTodayFirst, setShowTodayFirst] = useState(false) // TODO: 이 날 상영 필터 — UX 재검토 필요 (todo.md 참고)
  const [sheetFilters, setSheetFilters] = useState<SheetFilterState>(EMPTY_SCHEDULE_FILTER)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<SheetFilterState>(EMPTY_SCHEDULE_FILTER)

  const applySheetFilters = (next: SheetFilterState, scope: 'theater_sheet' | 'theater_sheet_quick' = 'theater_sheet') => {
    trackEvent('map filter changed', {
      filter_scope: scope,
      theater_id: theater.id,
      theater_name: theater.name,
      selected_movie_id: selectedMovieId || null,
      genres: next.genres,
      genres_count: next.genres.length,
      nations: next.nations,
      nations_count: next.nations.length,
      bookable: next.bookable,
    })
    setSheetFilters(next)
    // 스크롤 위치는 센터링 이펙트가 결정 — 선택 영화가 필터에 걸리면 센터, 빠지면 맨 왼쪽
  }

  /* ── 진입 애니메이션 ─────────────────────────────────────────── */
  // 마운트 직후 translateY = window.innerHeight → 다음 프레임에 정상 위치로 전환
  const enterDone = useRef(false)
  const [, forceUpdate] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(900)
  useEffect(() => {
    setViewportHeight(window.innerHeight)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        enterDone.current = true
        forceUpdate((n) => n + 1)
      })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* ── 시놉시스 아코디언 상태 ──────────────────────────────────── */

  /* ── 포스터 축소 진행도 (0 = 풀사이즈, 1 = 미니) — 스크롤에 비례 ── */
  const posterProgress = 0

  // 시트가 접힐 때 포스터 복원
  useEffect(() => {
    void posterProgress
  }, [shownExpanded])

  /* ── GV 상세 서브페이지 ── */
  const [selGvId, setSelGvId] = useState<string | null>(initialGvId ?? null)
  useEffect(() => { if (initialGvId) setSelGvId(initialGvId) }, [initialGvId])
  // Keep last event alive so exit animation can play (panel stays rendered during slide-out)
  const lastGvEvRef = useRef<GvEvent | undefined>(undefined)

  /* ── 시간표 — 날짜 먼저: 날짜를 고르면 그날 상영하는 영화가 회차와 함께 묶여 나온다.
     상영작 탭 극장 페이지와 같은 훅·본문을 쓴다(2026-11). 예전엔 포스터로 영화를 먼저 고르는 구조라
     페이지와 시트가 다른 앱처럼 보였고, 시트에서 회차까지 고른 비율이 3%였다. ── */
  const schedule = useTheaterSchedule({
    theaterId: theater.id,
    initialDate: initialIsoDate,
    initialShowtimeId,
  })
  const { allMovieEntries, moviesLoading: allMoviesLoading, moviesError, retryMovies } = schedule
  const selectedIsoDate = schedule.selectedDate

  /* ── selectedMovieId 초기화 — 지도(공유·분석)가 쓰는 '보고 있는 영화' ── */
  useEffect(() => {
    if (allMovieEntries.length > 0 && !allMovieEntries.find((e) => e.movie.id === selectedMovieId)) {
      onMovieSelect(allMovieEntries[0].movie.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMovieEntries])


  /* ── 바텀시트 필터 — 이 극장 영화에서만 가능한 장르/국가 ── */
  const availableGenres = useMemo(() => {
    const found = new Set<string>()
    for (const entry of allMovieEntries)
      for (const raw of entry.movie.genre) {
        const g = normalizeGenre(raw)
        if (g) found.add(g)
      }
    return GENRES.filter(g => found.has(g))
  }, [allMovieEntries])

  const availableNations = useMemo(() => {
    const s = new Set<string>()
    for (const entry of allMovieEntries) {
      if (!entry.movie.nation) continue
      for (const n of splitNations(entry.movie.nation)) s.add(n)
    }
    return Array.from(s)
  }, [allMovieEntries])

  /* 펼칠 때 지도 필터 상속, 접을 때 초기화 */
  useEffect(() => {
    if (shownExpanded) {
      setSheetFilters({ genres: mapFilters?.genres ?? [], nations: mapFilters?.nations ?? [], bookable: false })
    } else {
      setSheetFilters(EMPTY_SCHEDULE_FILTER)
      setFilterSheetOpen(false)
    }
    // mapFilters는 open 시점에만 읽음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownExpanded])

  /* ── 드래그 상태 ── */
  const containerRef    = useRef<HTMLDivElement>(null)
  const [copyCount, setCopyCount] = useState(0)

  /* ── 포스터 스크롤 드래그 ── */
  const posterScrollRef = useRef<HTMLDivElement>(null)

  const {
    posterDrag,
    posterTouching,
    posterCanScrollLeft,
    posterCanScrollRight,
    updatePosterScrollEdge,
    scrollByPage,
  } = useMomentumScroll(posterScrollRef, shownExpanded, allMovieEntries)

  /* ── 캐러셀 반응형 아이템 폭 (스크롤러 폭 기준 2~4열) ── */
  const [posterItemW, setPosterItemW] = useState(88)
  const posterItemH = Math.round(posterItemW * 1.5)
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el) return
    const update = () => setPosterItemW(calcPosterItemW(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [shownExpanded])

  /* ── 확장 시 스크롤 영역 ── */
  const scrollAreaRef      = useRef<HTMLDivElement>(null)
  const theaterNameRef     = useRef<HTMLDivElement>(null)
  const dateBarStickyRef   = useRef<HTMLDivElement>(null)
  const showtimeSectionRef = useRef<HTMLDivElement>(null)
  const [nameInNav, setNameInNav] = useState(false)
  const [showtimeInView, setShowtimeInView] = useState(true)

  /* Leaflet 이벤트 차단 — 시트 영역에서 map 이벤트가 발동되지 않게 */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    // 페이지 스크롤 방지: 스크롤 영역 내부 터치는 네이티브 스크롤 허용
    const preventPageScroll = (e: TouchEvent) => {
      if (scrollAreaRef.current?.contains(e.target as Node)) return
      e.preventDefault()
    }
    // pointerdown은 제외 — 포함하면 React의 onPointerDown(드래그 핸들)까지 차단됨
    el.addEventListener('wheel',      stop, { passive: false })
    el.addEventListener('mousedown',  stop)
    el.addEventListener('touchstart', stop, { passive: false })
    el.addEventListener('touchmove',  preventPageScroll, { passive: false })
    return () => {
      el.removeEventListener('wheel',      stop)
      el.removeEventListener('mousedown',  stop)
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove',  preventPageScroll)
    }
  }, [])

  /* 극장 이름이 nav 위로 스크롤되면 nav에 이름 표시 */
  useEffect(() => {
    const scrollEl = scrollAreaRef.current
    if (!scrollEl || !shownExpanded) { setNameInNav(false); return }
    const onScroll = () => {
      const nameEl = theaterNameRef.current
      if (!nameEl) return
      setNameInNav(nameEl.getBoundingClientRect().bottom < 60)
    }
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    setNameInNav(false)
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [shownExpanded])

  /* 상영시간표 섹션 뷰포트 진입/이탈 감지 → 예매 바 표시 제어 */
  useEffect(() => {
    setShowtimeInView(true)
    const target = showtimeSectionRef.current
    const root   = scrollAreaRef.current
    if (!target || !root) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowtimeInView(entry.isIntersecting),
      { root, threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [shownExpanded])

  /* ── 수직 드래그 (핸들) ─────────────────────────────────────────── */
  const {
    dragging,
    effectiveTranslate,
    finalTranslate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useDragSheet({
    viewportHeight,
    shownExpanded,
    panelMode,
    exiting,
    enterDone,
    scrollAreaRef,
    posterTouching,
    posterDrag,
    collapsedHeight: THEATER_SHEET_COLLAPSED_H,
    onClose,
    onCollapse,
    onExpand,
  })

  /* ── 매진 영화 ID 집합 (선택일 기준) — 접힌 포스터 줄 배지 ── */
  const soldoutMovieIds = useMemo(() => {
    const byMovie = new Map<string, boolean[]>()
    for (const st of schedule.dayShowtimes) {
      if (!byMovie.has(st.movieId)) byMovie.set(st.movieId, [])
      byMovie.get(st.movieId)!.push(isSoldOut(st.seatAvailable, st.seatTotal))
    }
    const ids = new Set<string>()
    for (const [id, seats] of byMovie) {
      if (seats.length > 0 && seats.every(Boolean)) ids.add(id)
    }
    return ids
  }, [schedule.dayShowtimes])

  /* ── 시트 필터 적용 결과 — 그날 영화 카드에 건다 ── */
  const filteredGroups = useMemo(
    () => filterMovieGroups(schedule.groups, sheetFilters, schedule.clock),
    [schedule.groups, sheetFilters, schedule.clock],
  )

  /* ── 접힌 포스터 줄을 선택 영화 자리로 ── */
  const posterCenterDone = useRef(false)
  /* 이 조합으로 이미 한 번 맞췄으면 다시 건드리지 않는다 — 사용자가 옮긴 위치를 되돌리지 않게 */
  const lastCenterKey = useRef('')
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el || shownExpanded || !selectedMovieId || allMovieEntries.length === 0) return

    const centerKey = `${selectedMovieId}|${allMovieEntries.length}|${posterItemW}`
    if (lastCenterKey.current === centerKey) return
    lastCenterKey.current = centerKey

    const idx = allMovieEntries.findIndex(e => e.movie.id === selectedMovieId)
    if (idx < 0) return
    const targetLeft = POSTER_PAD_LEFT + idx * (posterItemW + POSTER_GAP)
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const left = Math.min(max, Math.max(0, targetLeft - el.clientWidth / 2 + posterItemW / 2))
    // 시트 첫 진입은 즉시 배치, 이후 선택 변경은 부드럽게 이동
    el.scrollTo({ left, behavior: posterCenterDone.current ? 'smooth' : 'auto' })
    posterCenterDone.current = true
  }, [selectedMovieId, allMovieEntries, shownExpanded, posterItemW])

  /* 접힌 포스터 줄은 목차다 — 영화를 누르면 그 영화가 상영하는 날로 옮기고, 펼친 뒤 그 카드로 스크롤한다 */
  const [focusMovieId, setFocusMovieId] = useState<string | null>(initialShowtimeId ? selectedMovieId || null : null)
  const handleMovieSelect = (movieId: string, source: string) => {
    const entry = allMovieEntries.find((item) => item.movie.id === movieId)
    trackEvent('theater movie selected', {
      theater_id: theater.id,
      theater_name: theater.name,
      movie_id: movieId,
      movie_title: entry?.movie.title,
      source,
      selected_date: selectedIsoDate,
    })
    onMovieSelect(movieId)
    const date = entry ? dateForMovie(entry.availableDates, selectedIsoDate) : undefined
    if (date && date !== selectedIsoDate) schedule.selectDate(date)
    setFocusMovieId(movieId)
  }

  useEffect(() => {
    if (!shownExpanded || !focusMovieId || schedule.showtimesLoading) return
    const id = requestAnimationFrame(() => {
      const container = scrollAreaRef.current
      const target = container?.querySelector<HTMLElement>(`[data-movie-anchor="${focusMovieId}"]`)
      setFocusMovieId(null)
      if (!container || !target) return
      const headerOffset = dateBarStickyRef.current?.offsetHeight ?? 0
      const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top - headerOffset - 12
      container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [focusMovieId, shownExpanded, schedule.showtimesLoading, schedule.groups])

  const selectedShowtime = schedule.selectedShowtime

  const openWebsite = () => {
    if (!theater.website) return
    trackEvent('website clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      source: 'theater_sheet',
    })
    window.open(theater.website, '_blank', 'noopener')
  }

  const openDirections = () => {
    trackEvent('directions clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      selected_movie_id: selectedMovieId || null,
      source: 'theater_sheet',
    })
    const { app, web } = naverDirectionsUrls(theater)
    const a = document.createElement('a')
    a.href = app
    a.click()
    setTimeout(() => window.open(web, '_blank', 'noopener'), 1500)
  }

  const shareTheater = () => {
    // '/map' — 진입점이 상영작으로 바뀐 뒤(#262) 지도 파라미터를 읽는 건 MapView 하나뿐이고
    // 그건 '/map'에서만 마운트된다. 루트로 보내면 받은 사람에게 파라미터가 통째로 무시된다.
    const url = new URL('/map', window.location.origin)
    url.searchParams.set('theater', theater.id)
    let title = theater.name
    if (selectedShowtime) {
      url.searchParams.set('movie', selectedShowtime.movieId)
      url.searchParams.set('date', selectedIsoDate)
      url.searchParams.set('showtime', selectedShowtime.id)
      title += ` - ${selectedShowtime.movieTitle} ${selectedShowtime.showTime.slice(0, 5)}`
    }
    void shareAndTrack({
      // text + url 동시에 넘기면 iOS Safari가 url을 무시하는 버그 있음 → title + url만 사용
      payload: { title, url: url.toString() },
      source: 'theater_sheet',
      scope: selectedShowtime ? 'showtime' : 'page',
      properties: {
        theater_id: theater.id,
        theater_name: theater.name,
        selected_movie_id: selectedShowtime?.movieId ?? null,
        selected_showtime_id: selectedShowtime?.id ?? null,
      },
      onCopied: () => setCopyCount(c => c + 1),
    })
  }

  const hasInstagram = Boolean(theater.instagramUrl)

  const openInstagram = () => {
    const username = theater.instagramUrl?.match(/instagram\.com\/([^/?#]+)/)?.[1]

    if (!theater.instagramUrl) {
      return
    }

    trackEvent('instagram clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      source: 'theater_sheet',
    })

    const webUrl = username
      ? `https://www.instagram.com/${username}/`
      : theater.instagramUrl
    window.open(webUrl, '_blank', 'noopener')
  }

  /* 2.0: 고스트 유틸리티 — 이 화면의 주 행동은 포스터·시간표라 액션은 침묵.
     시각은 텍스트+아이콘만, 히트박스는 44 유지(시각 크기 ≠ 터치 크기) */
  /* 액션 행(관심·길찾기·공유·인스타) — 면·크기·상태는 Button(text·md)이 갖는다.
     좌우 여백만 좁힌다: Button md의 32px은 이 행에 4개가 들어가면 모바일에서 넘친다 */
  const actionBtn: React.CSSProperties = {
    gap: 4,
    padding: '0 8px',
    whiteSpace: 'nowrap',
  }

  /* 영화 카드 하단 액션 2칸 — 면·상태는 Button(text)이 갖고, 칸 나눔과 높이만 여기서 */
  const cardActionBtn: React.CSSProperties = {
    flex: 1,
    height: 56,
    minHeight: 56,
    padding: 0,
    gap: 4,
    color: 'var(--color-text-body)',
    borderRadius: 0,
  }

  /* 포스터 스트립 좌우 버튼 — ScrollNavButton의 기본은 컨테이너 세로 중앙(top 50%)인데
     여기는 캡션을 뺀 포스터 이미지 중앙에 놓아야 한다. 면도 카드 반투명 + 블러다 */
  const posterNavStyle: React.CSSProperties = {
    top: 12 + posterItemH / 2,
    width: 32, height: 32,
    border: 'none',
    backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 72%, transparent)',
    backdropFilter: 'blur(8px)',
    color: 'var(--color-text-body)',
    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
  }

  /* 주소 줄 안에 박히는 16px 아이콘 — IconButton의 최소 규격이 32라 여기는 원시 button으로 둔다.
     글줄 높이를 밀지 않는 게 이 자리의 요구 조건이다 */
  const inlineIconBtn: React.CSSProperties = {
    flex: '0 0 16px',
    width: 16,
    height: 16,
    padding: 0,
    boxSizing: 'border-box',
    border: 'none',
    background: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-caption)',
    verticalAlign: 'middle',
  }

  /* 극장 이름 아래 주소·액션 행 — 접힘·펼침·PC 패널이 같은 것을 쓴다.
     세 군데에 따로 적혀 있을 때 접힘만 주소가 13px 보통 굵기, 액션 간격이 8이라
     펼치는 순간 글자 굵기가 바뀌고 인스타그램이 둘째 줄에서 첫째 줄로 올라갔다(2026-10). */
  const addressLineStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    minWidth: 0,
    color: 'var(--color-text-sub)',
    fontSize: 'var(--text-body)',
    fontWeight: 700,   /* 2.0/body-strong */
    lineHeight: 1.5,
  }

  const theaterActionRow = (
    /* 피그마 주소→액션 시각 간격 16 = gap 4 + 액션 pad 12. 버튼 히트박스(44) 안 여백 ~11이 이미 있으므로 4만 더함.
       왼쪽 -8은 첫 버튼의 좌우 여백을 상쇄해 아이콘을 주소 글자선에 맞춘다 */
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginTop: 4, marginLeft: -8 }}>
      <TheaterFavoriteAction theaterId={theater.id} theaterName={theater.name} style={actionBtn} />
      <Button type="button" variant="text" size="md" style={actionBtn} onClick={openDirections}>
        <Icon name="map-pinned" size={14} />
        길찾기
      </Button>
      <Button type="button" variant="text" size="md" style={actionBtn} onClick={shareTheater}>
        <Icon name="share-2" size={14} />
        공유하기
      </Button>
      {hasInstagram && (
        <Button type="button" variant="text" size="md" style={actionBtn} onClick={openInstagram}>
          <Icon name="instagram" size={14} />
          인스타그램
        </Button>
      )}
    </div>
  )

  return (
    <>
    <Toast message="복사했어요" trigger={copyCount} />
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUp(e)}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      style={{
        position: dockMode ? 'relative' : 'absolute',
        left: dockMode ? 0 : floatingPanel ? 'auto' : 0,
        right: dockMode ? 'auto' : floatingPanel ? 16 : 0,
        top: dockMode ? 'auto' : floatingPanel ? 16 : 'auto',
        bottom: dockMode ? 'auto' : floatingPanel ? 16 : 0,
        width: dockMode ? '100%' : floatingPanel ? 440 : 'auto',
        maxWidth: floatingPanel ? 'calc(100vw - 32px)' : undefined,
        height: dockMode ? '100%' : floatingPanel ? 'auto' : '100dvh',
        transform: dockMode
          ? undefined
          : floatingPanel
          ? (exiting ? 'translateX(calc(100% + 24px))' : 'translateX(0)')
          : `translateY(${finalTranslate}px)`,
        opacity: floatingPanel && exiting ? 0 : 1,
        // 드래그 중엔 transition 없음, 진입/퇴장/snap엔 항상 transition
        transition: dockMode
          ? undefined
          : floatingPanel
          ? 'transform 0.24s ease, opacity 0.2s ease'
          : (dragging && enterDone.current && !exiting)
          ? 'none'
          : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: dockMode ? undefined : 1200,  // GlobalNav 모바일 탭바(zIndex 1150)보다 위 — 시트가 하단 메뉴를 가려야 함
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: dockMode ? 'transparent' : panelMode ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
        border: dockMode ? undefined : panelMode ? '1px solid var(--color-border)' : undefined,
        borderRadius: dockMode
          ? 0
          : panelMode
          ? 18
          : effectiveTranslate === 0
          ? '0'
          : 'var(--comp-sheet-radius)',
        boxShadow: dockMode
          ? 'none'
          : panelMode
          ? '0 22px 70px rgba(20, 15, 10, 0.22), 0 3px 14px rgba(20, 15, 10, 0.10)'
          : 'var(--shadow-sheet)',
        overflow: 'hidden',
        // collapsed 모드: 컨테이너 전체가 드래그 대상이므로 native scroll 차단
        touchAction: panelMode || shownExpanded ? 'auto' : 'none',
        cursor: panelMode ? 'auto' : dragging ? 'grabbing' : (shownExpanded ? 'auto' : 'grab'),
        userSelect: 'none',
      }}
    >
      {/* ── 드래그 핸들 바 — expanded이면 숨김 ── */}
      {!panelMode && <div
        style={{
          padding: shownExpanded ? '4px 0' : '8px 0 6px',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          pointerEvents: 'none',   // 컨테이너가 드래그 처리
        }}
      >
        {!shownExpanded && (
          <div style={{
            width: 'var(--comp-sheet-handle-width)',
            height: 'var(--comp-sheet-handle-height)',
            borderRadius: 'var(--comp-sheet-handle-radius)',
            backgroundColor: 'var(--color-border)',
          }} />
        )}
      </div>}

      {/* ── 헤더 — collapsed: 이름+주소+버튼 / expanded: 메뉴바 ── */}
      {!shownExpanded ? (
        /* Collapsed 헤더 */
        <div style={{
          padding: '0 var(--gutter-sheet) 12px',
          position: 'relative',
          flexShrink: 0,
        }}>
          <div>
            <div className="display-h1" style={{
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              paddingRight: 84,
              paddingLeft: onBack ? 40 : 0,
            }}>
              <span style={{ minWidth: 0 }}>{theater.name}</span>
              {theater.website && (
                <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                  <Icon name="external-link" size={10} />
                </button>
              )}
            </div>
            <div style={addressLineStyle}>
              <span style={{ minWidth: 0 }}>{theater.address}</span>
            </div>
            {theaterActionRow}
          </div>
          <div style={{
            position: 'absolute',
            top: -2,
            right: 20,
            display: 'flex',
            gap: 8,
          }}>
            <IconButton variant="ghost" size={32} aria-label="닫기" onClick={onClose}>
              <Icon name="x" size={20} />
            </IconButton>
          </div>
          {onBack && (
            <div style={{ position: 'absolute', top: -2, left: 'var(--gutter-sheet)' }}>
              <IconButton variant="ghost" size={32} aria-label="이전으로" onClick={onBack}>
                <Icon name="chevron-left" size={20} />
              </IconButton>
            </div>
          )}
        </div>
      ) : panelMode ? (
        /* PC 패널 헤더 — 극장 정보 고정 */
        <div style={{
          flexShrink: 0,
          padding: '20px var(--gutter-sheet) 6px',   /* 액션 버튼 히트박스(44) 하단 여백 ~11 감안 — 시각 간격 ~16 */
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-card)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            {onBack && (
              <IconButton variant="ghost" size={32} aria-label="이전으로" onClick={onBack}>
                <Icon name="chevron-left" size={20} />
              </IconButton>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <h2 className="display-h1" style={{
                  margin: 0,
                  minWidth: 0,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.name}
                </h2>
                {theater.website && (
                  <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                    <Icon name="external-link" size={11} />
                  </button>
                )}
              </div>
              <div style={addressLineStyle}>
                <span style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.address}
                </span>
              </div>
            </div>
            <IconButton variant="ghost" size={32} aria-label="닫기" onClick={onClose}>
              <Icon name="x" size={20} />
            </IconButton>
          </div>
          {theaterActionRow}
        </div>
      ) : (
        /* Expanded 헤더 — nav row만 고정 (극장 정보는 스크롤 안으로)
           피그마: h56, pad 좌우 24 — 글리프(20)가 24 정렬선에 오도록 버튼 여백(8) 상쇄 */
        <div style={{
          flexShrink: 0,
          minHeight: 56,
          padding: '0 var(--gutter-sheet)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <IconButton variant="ghost" size={32} aria-label="뒤로" style={{ marginLeft: -8 }} onClick={onBack ?? onCollapse}>
            <Icon name="chevron-left" size={20} />
          </IconButton>
          <span style={{
            flex: 1, textAlign: 'center',
            fontSize: 'var(--text-subtitle)', fontWeight: 600,
            color: 'var(--color-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            padding: '0 8px',
            opacity: nameInNav ? 1 : 0,
            transition: 'opacity 180ms ease',
          }}>
            {theater.name}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton variant="ghost" size={32} aria-label="닫기" style={{ marginRight: -8 }} onClick={onClose}>
              <Icon name="x" size={20} />
            </IconButton>
          </div>
        </div>
      )}

      {/* ── GV/이벤트 — collapsed에서도 노출 (expanded와 동일 컴포넌트, 이벤트 없으면 자체적으로 null) ── */}
      {!shownExpanded && (
        <GvEventSection
          events={gvEvents}
          theaterName={theater.name}
          selectedIsoDate={selectedIsoDate}
          showTopBorder
          onGvOpen={(id) => { setSelGvId(id); onExpand() }}
        />
      )}

      {/* ── 포스터 가로 스크롤 — collapsed 전용 ── */}
      {!shownExpanded && <div style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-bg)',
        flexShrink: 0,
        // 스크롤 비례 높이 축소 (228 → 90) + 하단 탭바 및 safe-area만큼 높이 확장
        maxHeight: `calc(${262 - 172 * posterProgress}px + var(--nav-mobile-offset))`,
        overflow: 'hidden',
        position: 'relative',  // 스크롤 버튼 절대 위치 기준
      }}>
        {/* 모바일 포스터 좌우 스크롤 버튼 */}
        {posterCanScrollLeft && (
          <ScrollNavButton
            direction="left"
            style={posterNavStyle}
            onClick={() => scrollByPage(-1, posterItemW + POSTER_GAP)}
          />
        )}
        {posterCanScrollRight && (
          <ScrollNavButton
            direction="right"
            style={posterNavStyle}
            onClick={() => scrollByPage(1, posterItemW + POSTER_GAP)}
          />
        )}
        <div
          ref={posterScrollRef}
          onScroll={updatePosterScrollEdge}
          style={{
            display: 'flex',
            gap: 16 - 8 * posterProgress,           // 16(피그마) → 8
            overflowX: 'auto',
            paddingTop: 12,    /* 2.0: 피그마 posters pad */
            paddingLeft: POSTER_PAD_LEFT,
            paddingRight: POSTER_PAD_LEFT,
            paddingBottom: 'calc(12px + var(--nav-mobile-offset))',
            scrollbarWidth: 'none',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'pan-y',
          }}
        >
          {allMoviesLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: posterItemW }}>
                  <div style={{ width: posterItemW, height: posterItemH, borderRadius: 0, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                  <div style={{ width: 70, height: 11, borderRadius: 4, marginTop: 8, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                  <div style={{ width: 50, height: 10, borderRadius: 4, marginTop: 4, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                </div>
              ))
            : moviesError
              ? <TheaterQueryFailure message="상영작을 불러오지 못했어요" onRetry={() => { void retryMovies() }} />
            : allMovieEntries.length === 0
              ? (
                  <EmptyState
                    illustration={{ src: '/illust/no-showtimes.png', alt: '상영 정보 없음', width: 78, height: 104 }}
                    message="확인된 상영 정보가 없어요"
                    paddingY={8}
                    style={{ flex: 1, minWidth: '100%', paddingBottom: 12 }}
                  />
                )
              : (() => {
                  return allMovieEntries.map((entry) => {
                    const { movie } = entry
                    const unavailable = false // showTodayFirst && !entry.availableDates.has(selectedIsoDate)
                    const soldout = !unavailable && soldoutMovieIds.has(movie.id)

                    return (
                      <div
                        key={movie.id}
                        style={{ flexShrink: 0, width: posterItemW * (1 - 0.5 * posterProgress), overflow: 'visible' }}
                      >
                        <div style={{
                          width: posterItemW,
                          transformOrigin: 'top left',
                          transform: `scale(${1 - 0.5 * posterProgress})`,
                        }}>
                          <div style={{ position: 'relative' }}>
                            <PosterThumb
                              width={posterItemW}
                              height={posterItemH}
                              size="lg"
                              radius={2}
                              alt={movie.title}
                              src={movie.posterUrl}
                              selected={shownExpanded && selectedMovieId === movie.id}
                              onClick={unavailable ? undefined : () => {
                                handleMovieSelect(movie.id, 'collapsed_poster_strip')
                                if (!shownExpanded) onExpand()
                              }}
                            />
                            {/* 매진 배지 */}
                            {soldout && (
                              <PosterChip corner="bottom-right" tone="error">매진</PosterChip>
                            )}
                            {/* 이 날 상영 없는 영화 — 반투명 오버레이 */}
                            {unavailable && (
                              <div style={{
                                position: 'absolute', inset: 0,
                                borderRadius: 0,
                                background: 'var(--color-scrim-soft)',
                                pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                          <div style={{
                            marginTop: 8,
                            fontSize: 'var(--text-badge)',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            opacity: unavailable ? 0.4 : Math.max(0, 1 - posterProgress * 2.5),
                            textDecoration: unavailable ? 'line-through' : 'none',
                          }}>
                            {movie.title}
                          </div>
                          {movie.director && movie.director.length > 0 && (
                            <div style={{
                              marginTop: 4,
                              fontSize: 10,
                              color: 'var(--color-text-caption)',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              opacity: unavailable ? 0.3 : Math.max(0, 1 - posterProgress * 2.5),
                            }}>
                              {movie.director[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()
          }
        </div>
      </div>}

      {/* ── expanded: 극장 정보 + DateBar + 포스터 + 내용 한 스크롤 ── */}
      {shownExpanded && (
        <div
          ref={scrollAreaRef}
          className={panelMode ? 'theater-panel-scroll themed-scrollbar' : undefined}
          style={{
            flex: 1,
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch' as never,
            overscrollBehavior: 'none',
            backgroundColor: panelMode ? 'var(--color-surface-bg)' : undefined,
            // 회차 선택 시 하단에서 뜨는 예매 바가 마지막 회차를 가리지 않도록 여백 확보
            paddingBottom: (schedule.selectedShowtimeId && showtimeInView)
              ? (panelMode ? 'calc(88px + env(safe-area-inset-bottom))' : 'calc(88px + var(--nav-mobile-offset))')
              : (panelMode ? 'env(safe-area-inset-bottom)' : 'var(--nav-mobile-offset)'),
          }}
        >
          {/* 극장 정보 — 스크롤 시 위로 밀림 */}
          {!panelMode && <div ref={theaterNameRef} style={{ padding: '8px var(--gutter-sheet) 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className="display-h1" style={{
                color: 'var(--color-text-primary)', minWidth: 0,
              }}>
                {theater.name}
              </div>
              {theater.website && (
                <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                  <Icon name="external-link" size={10} />
                </button>
              )}
            </div>
            <div style={addressLineStyle}>
              <span style={{ minWidth: 0 }}>{theater.address}</span>
            </div>
            {theaterActionRow}
          </div>}

          {/* 날짜 탭 — sticky */}
          <div ref={dateBarStickyRef} style={{
            position: 'sticky', top: 0, zIndex: 10,
            backgroundColor: panelMode ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
            borderTop: panelMode ? 'none' : '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <DetailDateTabs
              dates={schedule.dates}
              selectedDate={selectedIsoDate}
              activeDates={schedule.activeDates}
              onSelect={(date) => {
                trackEvent('theater date changed', {
                  theater_id: theater.id,
                  theater_name: theater.name,
                  from_date: selectedIsoDate,
                  to_date: date,
                  selected_movie_id: selectedMovieId || null,
                  source: 'theater_sheet',
                })
                classifySessionIntent('type_c', {
                  source: 'theater_sheet',
                  theater_id: theater.id,
                })
                schedule.selectDate(date)
              }}
            />
          </div>

          {/* GV & 이벤트 */}
          <GvEventSection events={gvEvents} theaterName={theater.name} selectedIsoDate={selectedIsoDate} onGvOpen={(id) => setSelGvId(id)} />

          {/* 그날 상영작 — 상영작 탭 극장 페이지와 같은 본문 */}
          <div ref={showtimeSectionRef} style={{ padding: `var(--gutter) var(--gutter-sheet) ${schedule.selectedShowtimeId ? 88 : 40}px` }}>
            {(() => {
              const activeCount = sheetFilters.genres.length + sheetFilters.nations.length + (sheetFilters.bookable ? 1 : 0)
              const filtersOn = isFilterActive(sheetFilters)
              const hasFilterOptions = availableGenres.length > 0 || availableNations.length > 0
              return (
                <TheaterScheduleBody
                  schedule={schedule}
                  groups={filteredGroups}
                  countLabel={filtersOn ? `${filteredGroups.length}/${schedule.groups.length}편` : undefined}
                  headingTrailing={(
                    <div style={{ display: 'flex', gap: 8, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {/* 예매 가능만 보기 — 즉시 토글, 드로어 열지 않음 */}
                      <FilterPill
                        active={sheetFilters.bookable}
                        onClick={() => applySheetFilters({ ...sheetFilters, bookable: !sheetFilters.bookable }, 'theater_sheet_quick')}
                      >
                        예매 가능만
                      </FilterPill>
                      {hasFilterOptions && (
                        <FilterPill
                          active={sheetFilters.genres.length + sheetFilters.nations.length > 0}
                          onClick={() => {
                            trackEvent('theater sheet filter opened', { theater_id: theater.id, source: 'theater_sheet' })
                            setPendingFilters(sheetFilters)
                            setFilterSheetOpen(true)
                          }}
                        >
                          <Icon name="funnel" size={12} />
                          필터{activeCount > 0 ? ` ${activeCount}` : ''}
                        </FilterPill>
                      )}
                    </div>
                  )}
                  onMovieOpen={(id) => onMovieDetailOpen ? onMovieDetailOpen(id) : navigateMovie(id, `/movie/${id}?theater=${theater.id}`)}
                  onShowtimeSelected={(st) => trackEvent('showtime selected', {
                    theater_id: theater.id,
                    theater_name: theater.name,
                    movie_id: st.movieId,
                    movie_title: st.movieTitle,
                    showtime_id: st.id,
                    show_date: st.showDate,
                    show_time: st.showTime,
                    seat_available: st.seatAvailable,
                    seat_total: st.seatTotal,
                    has_booking_url: Boolean(st.bookingUrl),
                    source: 'theater_sheet',
                  })}
                  onShowtimeUnavailable={(_, kind) => trackEvent('showtime unavailable clicked', {
                    theater_id: theater.id,
                    kind,
                    source: 'theater_sheet',
                  })}
                  renderCardFooter={(movie) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px var(--gutter)' }}>
                      {movie.director.length > 0 && (
                        <DirectorChip
                          name={movie.director[0]}
                          pending={movieNavPendingId === `director-${movie.id}`}
                          onClick={() => {
                            if (onDirectorOpen) onDirectorOpen(movie.director[0])
                            else navigateMovie(`director-${movie.id}`, `/director/${encodeURIComponent(movie.director[0])}`)
                          }}
                        />
                      )}
                      {onMovieSearch && (
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          style={{ marginLeft: 'auto', gap: 4 }}
                          onClick={() => { onMovieSearch(movie.id, movie.title); onClose() }}
                        >
                          <Icon name="search" size={14} />
                          지도에서 이 영화 찾기
                        </Button>
                      )}
                    </div>
                  )}
                />
              )
            })()}
          </div>
        </div>
      )}
      {/* ── 예매 바 — 회차 선택 시 하단에서 슬라이드 업 ── */}
      {shownExpanded && (() => {
        const selectedSt = selectedShowtime
        const normalizedBookingUrl = selectedSt?.bookingUrl?.replace(/^http:\/\//i, 'https://')
        return (
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            bottom: 0,
            transform: (schedule.selectedShowtimeId && showtimeInView) ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
            backgroundColor: 'var(--color-surface-card)',
            borderTop: '1px solid var(--color-border)',
            padding: '12px var(--gutter-sheet)',
            paddingBottom: panelMode ? 'max(12px, env(safe-area-inset-bottom))' : 'calc(12px + var(--nav-mobile-offset))',
            zIndex: 10,
            display: 'flex', gap: 12,
          }}>
            <ShareScheduleButton variant="bar" onClick={shareTheater} />
            <BookingCtaButton
              variant="bar"
              bookingUrl={normalizedBookingUrl}
              onClick={() => {
                if (!selectedSt) return
                trackEvent('booking clicked', {
                  theater_id: theater.id,
                  theater_name: theater.name,
                  movie_id: selectedSt.movieId,
                  movie_title: selectedSt.movieTitle,
                  showtime_id: selectedSt.id,
                  show_date: selectedSt.showDate,
                  show_time: selectedSt.showTime,
                  source: 'theater_sheet',
                })
              }}
            />
          </div>
        )
      })()}

      {/* ── GV 상세 서브페이지 ── */}
      {(() => {
        const gvEv = selGvId ? gvEvents.find(e => e.id === selGvId) : undefined
        if (gvEv) lastGvEvRef.current = gvEv
        const displayEv = gvEv ?? lastGvEvRef.current
        return (
          <div
            style={{
              position: 'absolute', inset: 0,
              transform: selGvId ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              zIndex: 50,
              overflow: 'hidden',
              borderRadius: 'inherit',
            }}
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {displayEv && <GvDetailPanel ev={displayEv} onClose={() => setSelGvId(null)} onCloseAll={onClose} panelMode={panelMode} />}
          </div>
        )
      })()}

      {/* ── 영화 필터 팝업 ── */}
      {filterSheetOpen && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'var(--color-scrim)',
            zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setPendingFilters(sheetFilters); setFilterSheetOpen(false) }}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => { e.stopPropagation(); setPendingFilters(sheetFilters); setFilterSheetOpen(false) }}
        >
          <div
            style={{
              width: 'calc(100% - 48px)', maxWidth: 360,
              backgroundColor: 'var(--color-surface-card)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sheet)',
            }}
            onClick={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px var(--gutter-sheet) 12px',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>영화 필터</span>
              <Button
                variant="text"
                size="sm"
                onClick={() => setPendingFilters({ genres: [], nations: [], bookable: false })}
              >
                모두 선택해제
              </Button>
            </div>

            {/* 본문 (스크롤) */}
            <div style={{ padding: '0 var(--gutter-sheet)', maxHeight: '50vh', overflowY: 'auto' }}>
              {/* 장르 */}
              {availableGenres.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 12 }}>장르</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {availableGenres.map(g => (
                      <Chip
                        key={g}
                        selected={pendingFilters.genres.includes(g)}
                        onClick={() => setPendingFilters(prev => ({
                          ...prev,
                          genres: prev.genres.includes(g) ? prev.genres.filter(x => x !== g) : [...prev.genres, g],
                        }))}
                      >{g}</Chip>
                    ))}
                  </div>
                </>
              )}
              {/* 국가 */}
              {availableNations.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 12 }}>국가</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {availableNations.map(n => (
                      <Chip
                        key={n}
                        selected={pendingFilters.nations.includes(n)}
                        onClick={() => setPendingFilters(prev => ({
                          ...prev,
                          nations: prev.nations.includes(n) ? prev.nations.filter(x => x !== n) : [...prev.nations, n],
                        }))}
                      >{withFlag(n)}</Chip>
                    ))}
                  </div>
                </>
              )}
              {/* 예매 가능한 영화만 토글 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 4, paddingBottom: 20,
                borderTop: '1px solid var(--color-border)',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>예매 가능한 영화만</div>
                  <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', marginTop: 4 }}>잔여석이 있는 상영회만 표시</div>
                </div>
                <div
                  onClick={() => setPendingFilters(prev => ({ ...prev, bookable: !prev.bookable }))}
                  style={{
                    flexShrink: 0,
                    width: 44, height: 26, borderRadius: 9999,
                    backgroundColor: pendingFilters.bookable ? 'var(--color-primary-base)' : 'var(--color-neutral-500)',
                    position: 'relative', cursor: 'pointer',
                    transition: 'background-color 180ms',
                    marginLeft: 16,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    left: pendingFilters.bookable ? 21 : 3,
                    width: 20, height: 20,
                    borderRadius: '50%', backgroundColor: 'var(--color-on-accent)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transition: 'left 180ms',
                  }} />
                </div>
              </div>
            </div>

            {/* 적용하기 버튼 */}
            <div style={{ padding: '0 var(--gutter-sheet) 20px' }}>
              <Button
                variant="primary"
                size="full"
                onClick={() => { applySheetFilters(pendingFilters); setFilterSheetOpen(false) }}
              >
                적용하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
