'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PosterThumb } from './PosterThumb'
import { DateBar, type Day, type DayType } from './DateBar'
import { ShowtimeCell } from './ShowtimeCell'
import { Button } from '@/components/primitives/Button'
import { Toast } from '@/components/primitives/Toast'
import { useTheaterShowtimes, useTheaterAllMovies } from '@/lib/supabase/queries'
import type { TheaterMovieEntry } from '@/lib/supabase/queries'
import type { Theater, Showtime } from '@/types/api'
import { Skeleton } from '@/components/primitives/Skeleton'
import { GENRES, normalizeGenre } from '@/lib/genres'
import { withFlag } from '@/lib/nations'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { useDragSheet } from '@/hooks/useDragSheet'
import { useMomentumScroll } from '@/hooks/useMomentumScroll'
import { shareAdapter } from '@/lib/adapters/share'

/* ── 상수 ──────────────────────────────────────────────────────── */
// 접힌 상태에서 보이는 높이 = 핸들(20) + 헤더(88, 액션버튼 포함) + 포스터스트립(228) + 테두리(2) + 여유(6)
const COLLAPSED_H = 344

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IconStar = ({ filled = false }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24"
    fill={filled ? 'var(--color-primary-base)' : 'none'}
    stroke={filled ? 'var(--color-primary-base)' : 'currentColor'}
    strokeWidth="1.8" strokeLinejoin="round"
  >
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" />
  </svg>
)

const IconClose = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const IconChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const IconExternal = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const IconCopy = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

const IconRoute = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h5l4 12h9" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="18" r="2" />
  </svg>
)

const IconShare = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" />
  </svg>
)

const IconInstagram = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconSearch = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconChevronRight = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const IconFilter = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

/* ── 시놉시스 카드 ──────────────────────────────────────────────── */
interface SynopsisCardProps {
  synopsis: string
  tags?: string[]
  visible: boolean
  onSearchTheaters?: () => void
}

function SynopsisCard({ synopsis, tags, visible, onSearchTheaters }: SynopsisCardProps) {
  return (
    // grid-template-rows: 0fr → 1fr 트릭: 실제 콘텐츠 높이로 부드럽게 애니메이션
    <div style={{
      display: 'grid',
      gridTemplateRows: visible ? '1fr' : '0fr',
      transition: 'grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: 'var(--color-neutral-800)',
      flexShrink: 0,
    }}>
      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        <div style={{ padding: '16px 20px 20px' }}>
          {/* 태그 — 있을 때만 */}
          {tags && tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 500,
                    lineHeight: 1,
                    color: 'var(--color-neutral-200)',
                    border: '1px solid var(--color-neutral-600)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 3,
                    paddingBottom: 3,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* 시놉시스 — 전체 표시 (자세히 버튼 없음) */}
          <p style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--color-neutral-200)',
          }}>
            {synopsis}
          </p>
          {/* 상영 중인 영화관 모두 검색 버튼 */}
          <div style={{ marginTop: 16 }}>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={onSearchTheaters}
              style={{ borderColor: 'var(--color-neutral-600)', color: 'var(--color-neutral-200)' }}
            >
              상영중인 영화관 모두 검색
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 날짜 생성 헬퍼 ─────────────────────────────────────────────── */
// availableDates: 'YYYY-MM-DD' 형태의 Set — 해당 날짜에만 상영 있음
function buildDays(count = 7, availableDates?: Set<string>, offset = 0): Day[] {
  const today = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offset + i)
    const dow  = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
    const date = String(d.getDate())
    const absIdx = offset + i
    const type: DayType =
      absIdx === 0       ? 'today'
      : d.getDay() === 0 ? 'sunday'
      : d.getDay() === 6 ? 'saturday'
      : 'weekday'

    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const disabled = availableDates ? !availableDates.has(isoDate) : false

    return { dow, date, isoDate, type, disabled }
  })
}

/* ── Sheet filter ───────────────────────────────────────────────── */
interface SheetFilterState {
  genres: string[]
  nations: string[]
  bookable: boolean
}

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
  favorited?: boolean
  onFavorite?: () => void
  mapFilters?: { genres: string[]; nations: string[] }
  initialIsoDate?: string
  initialShowtimeId?: string
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
  favorited = false,
  onFavorite,
  mapFilters,
  initialIsoDate,
  initialShowtimeId,
  onBack,
}: TheaterSheetProps) {

  const router = useRouter()
  // 'panel'(우측 플로팅 카드) · 'dock'(좌측 도크 내장) — 헤더/스크롤/배경 등 콘텐츠 쪽 스타일은 동일하게 취급
  const floatingPanel = presentation === 'panel'
  const dockMode = presentation === 'dock'
  const panelMode = floatingPanel || dockMode
  const shownExpanded = panelMode || expanded

  /* ── Sheet filter state ─────────────────────────────────────── */
  // const [showTodayFirst, setShowTodayFirst] = useState(false) // TODO: 이 날 상영 필터 — UX 재검토 필요 (todo.md 참고)
  const [sheetFilters, setSheetFilters] = useState<SheetFilterState>({ genres: [], nations: [], bookable: false })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<SheetFilterState>({ genres: [], nations: [], bookable: false })

  const applySheetFilters = (next: SheetFilterState) => {
    trackEvent('map filter changed', {
      filter_scope: 'theater_sheet',
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
    if (posterScrollRef.current) posterScrollRef.current.scrollLeft = 0
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

  /* ── 날짜 선택 상태 (ISO date 기준) ── */
  const todayIso = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  const [selectedIsoDate, setSelectedIsoDate] = useState(initialIsoDate ?? todayIso)

  /* ── Supabase 상영 데이터 ── */
  const { data: showtimeData, isLoading: showtimesLoading } = useTheaterShowtimes(
    theater.id,
    selectedIsoDate,
  )
  const showtimes: Showtime[] = showtimeData?.showtimes ?? []

  /* ── 전체 상영 영화 (날짜 무관, 7일 범위) ── */
  const { data: allMovieEntries = [], isLoading: allMoviesLoading } = useTheaterAllMovies(theater.id)

  /* ── selectedMovieId 초기화 — 전체 목록 기준 ── */
  useEffect(() => {
    if (allMovieEntries.length > 0 && !allMovieEntries.find((e) => e.movie.id === selectedMovieId)) {
      onMovieSelect(allMovieEntries[0].movie.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMovieEntries])

  /* ── 날짜 바 — 7일, 상영 있는 날만 활성 ── */
  const theaterAvailableDates = useMemo(() => {
    const dates = new Set<string>()
    for (const entry of allMovieEntries) {
      for (const d of entry.availableDates) dates.add(d)
    }
    return dates
  }, [allMovieEntries])

  const [dateWindowOffset, setDateWindowOffset] = useState(0)
  const days = buildDays(7, theaterAvailableDates, dateWindowOffset)
  const selectedDate = days.find((d) => d.isoDate === selectedIsoDate)?.date ?? days[0].date

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
      for (const n of entry.movie.nation.split(/[,，/·]+/).map(x => x.trim()).filter(Boolean)) s.add(n)
    }
    return Array.from(s)
  }, [allMovieEntries])

  /* 펼칠 때 지도 필터 상속, 접을 때 초기화 */
  useEffect(() => {
    if (shownExpanded) {
      setSheetFilters({ genres: mapFilters?.genres ?? [], nations: mapFilters?.nations ?? [], bookable: false })
    } else {
      setSheetFilters({ genres: [], nations: [], bookable: false })
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
  } = useMomentumScroll(posterScrollRef, shownExpanded, allMovieEntries)

  /* ── 확장 시 스크롤 영역 ── */
  const scrollAreaRef      = useRef<HTMLDivElement>(null)
  const theaterNameRef     = useRef<HTMLDivElement>(null)
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
  } = useDragSheet({
    viewportHeight,
    shownExpanded,
    panelMode,
    exiting,
    enterDone,
    scrollAreaRef,
    posterTouching,
    posterDrag,
    collapsedHeight: COLLAPSED_H,
    onClose,
    onCollapse,
    onExpand,
  })

  /* ── 매진 영화 ID 집합 (선택일 기준) ── */
  const soldoutMovieIds = useMemo(() => {
    const byMovie = new Map<string, number[]>()
    for (const st of showtimes) {
      if (!byMovie.has(st.movieId)) byMovie.set(st.movieId, [])
      byMovie.get(st.movieId)!.push(st.seatAvailable)
    }
    const ids = new Set<string>()
    for (const [id, seats] of byMovie) {
      if (seats.length > 0 && seats.every((s) => s === 0)) ids.add(id)
    }
    return ids
  }, [showtimes])

  /* ── 바텀시트 필터 적용 결과 ── */
  const bookableMovieIds = useMemo(() => {
    const ids = new Set<string>()
    for (const entry of allMovieEntries) {
      if (!entry.availableDates.has(selectedIsoDate)) continue
      if (soldoutMovieIds.has(entry.movie.id)) continue
      ids.add(entry.movie.id)
    }
    return ids
  }, [allMovieEntries, selectedIsoDate, soldoutMovieIds])

  const filteredMovieEntries = useMemo(() => {
    const { genres, nations, bookable } = sheetFilters
    if (genres.length === 0 && nations.length === 0 && !bookable) return allMovieEntries
    return allMovieEntries.filter(entry => {
      const matchesGenre = genres.length === 0 || entry.movie.genre.some(g => {
        const normalized = normalizeGenre(g)
        return normalized !== null && genres.includes(normalized)
      })
      const matchesNation = nations.length === 0 || (() => {
        const ns = entry.movie.nation?.split(/[,，/·]+/).map(x => x.trim()).filter(Boolean) ?? []
        return ns.some(n => nations.includes(n))
      })()
      const matchesBookable = !bookable || bookableMovieIds.has(entry.movie.id)
      return matchesGenre && matchesNation && matchesBookable
    })
  }, [allMovieEntries, sheetFilters, bookableMovieIds])

  /* ── 이 날 상영 영화 우선 정렬 (비활성화 — todo.md 참고) ── */
  // const sortedAllEntries = useMemo(() => {
  //   if (!showTodayFirst) return allMovieEntries
  //   const playing = allMovieEntries.filter(e => e.availableDates.has(selectedIsoDate))
  //   const notPlaying = allMovieEntries.filter(e => !e.availableDates.has(selectedIsoDate))
  //   return [...playing, ...notPlaying]
  // }, [allMovieEntries, selectedIsoDate, showTodayFirst])
  const sortedAllEntries = allMovieEntries

  // const sortedFilteredEntries = useMemo(() => {
  //   if (!showTodayFirst) return filteredMovieEntries
  //   const playing = filteredMovieEntries.filter(e => e.availableDates.has(selectedIsoDate))
  //   const notPlaying = filteredMovieEntries.filter(e => !e.availableDates.has(selectedIsoDate))
  //   return [...playing, ...notPlaying]
  // }, [filteredMovieEntries, selectedIsoDate, showTodayFirst])
  const sortedFilteredEntries = filteredMovieEntries

  /* ── 선택 영화로 포스터 스트립 스크롤 ── */
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el || !selectedMovieId || allMovieEntries.length === 0) return

    // 현재 모드별 포스터 순서 계산
    let visualEntries: typeof allMovieEntries
    if (shownExpanded) {
      const matchedIds = new Set(filteredMovieEntries.map(e => e.movie.id))
      const nonMatching = allMovieEntries.filter(e => !matchedIds.has(e.movie.id))
      visualEntries = [...filteredMovieEntries, ...nonMatching]
    } else {
      visualEntries = allMovieEntries
    }

    const idx = visualEntries.findIndex(e => e.movie.id === selectedMovieId)
    if (idx < 0) return

    const itemW = 88
    const gap = 12
    const paddingLeft = 20
    const targetLeft = paddingLeft + idx * (itemW + gap)
    el.scrollLeft = Math.max(0, targetLeft - el.clientWidth / 2 + itemW / 2)
  // selectedMovieId 변경(외부 진입 포함) + 데이터 로드 시 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovieId, allMovieEntries, filteredMovieEntries, shownExpanded])

  /* ── 펼칠 때 오늘 상영 없으면 가장 빠른 날로 자동 이동 ── */
  useEffect(() => {
    if (!shownExpanded || allMoviesLoading) return
    if (selectedIsoDate !== todayIso) return
    if (theaterAvailableDates.has(todayIso)) return
    const earliest = Array.from(theaterAvailableDates).sort()[0]
    if (earliest) setSelectedIsoDate(earliest)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownExpanded, allMoviesLoading, theaterAvailableDates])

  /* ── 선택된 상영 회차 ── */
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(initialShowtimeId ?? null)

  // 마운트 시점의 selectedMovieId 변경(initialShowtimeId 적용)은 회차 선택을 초기화하지 않는다.
  const skipShowtimeResetRef = useRef(true)
  useEffect(() => {
    if (skipShowtimeResetRef.current) {
      skipShowtimeResetRef.current = false
      return
    }
    setSelectedShowtimeId(null)
  }, [selectedMovieId])
  useEffect(() => { if (!shownExpanded) setSelectedShowtimeId(null) }, [shownExpanded])

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
  }

  const handleShowtimeSelect = (showtime: Showtime) => {
    setSelectedShowtimeId((prev) => {
      const next = prev === showtime.id ? null : showtime.id
      if (next) {
        trackEvent('showtime selected', {
          theater_id: theater.id,
          theater_name: theater.name,
          movie_id: showtime.movieId,
          movie_title: showtime.movieTitle,
          showtime_id: showtime.id,
          show_date: showtime.showDate,
          show_time: showtime.showTime,
          seat_available: showtime.seatAvailable,
          seat_total: showtime.seatTotal,
          has_booking_url: Boolean(showtime.bookingUrl),
          source: 'theater_sheet',
        })
      }
      return next
    })
  }

  /* ── 현재 시각 (1분마다 갱신, 오늘 탭에서 지난 회차 상태 표시) ── */
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── 상영시간 필터링 (오늘은 지난 상영도 포함, disabled로 표시) ── */
  const filteredShowtimes = showtimes.filter((s) => {
    if (s.movieId !== selectedMovieId) return false
    return true
  })

  const openWebsite = () => {
    if (!theater.website) return
    trackEvent('website clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      source: 'theater_sheet',
    })
    window.open(theater.website, '_blank', 'noopener')
  }

  const copyAddress = () => {
    shareAdapter.copyToClipboard(theater.address)
    setCopyCount(c => c + 1)
  }

  const openDirections = () => {
    trackEvent('directions clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      selected_movie_id: selectedMovieId || null,
      source: 'theater_sheet',
    })
    const url = `nmap://route/public?dlat=${theater.lat}&dlng=${theater.lng}&dname=${encodeURIComponent(theater.name)}&appname=kr.indi.movie`
    const fallback = `https://map.naver.com/v5/directions/-/-/-/transit?c=${theater.lng},${theater.lat},15,0,0,0,dh`
    const a = document.createElement('a')
    a.href = url
    a.click()
    setTimeout(() => window.open(fallback, '_blank', 'noopener'), 1500)
  }

  const shareTheater = () => {
    const selectedEntry = allMovieEntries.find((e) => e.movie.id === selectedMovieId)
    const selectedShowtime = filteredShowtimes.find((st) => st.id === selectedShowtimeId)

    trackEvent('share clicked', {
      theater_id: theater.id,
      theater_name: theater.name,
      selected_movie_id: selectedMovieId || null,
      selected_showtime_id: selectedShowtimeId || null,
      source: 'theater_sheet',
    })

    const url = new URL(window.location.origin)
    url.searchParams.set('theater', theater.id)
    let title = theater.name
    if (selectedEntry) {
      url.searchParams.set('movie', selectedEntry.movie.id)
      url.searchParams.set('date', selectedIsoDate)
      title += ` - ${selectedEntry.movie.title}`
      if (selectedShowtime) {
        url.searchParams.set('showtime', selectedShowtime.id)
        title += ` ${selectedShowtime.showTime.slice(0, 5)}`
      }
    }
    const shareUrl = url.toString()
    // text + url 동시에 넘기면 iOS Safari가 url을 무시하는 버그 있음 → title + url만 사용
    const payload = { title, url: shareUrl }

    const copyFallback = () => {
      shareAdapter.copyToClipboardAsync(shareUrl).then((ok) => {
        if (ok) setCopyCount(c => c + 1)
      })
    }

    if (shareAdapter.canShare(payload)) {
      shareAdapter.share(payload).then((result) => {
        if (result === 'error') copyFallback()
      })
      return
    }

    copyFallback()
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

  /* ── 공통 아이콘 버튼 스타일 ─────────────────────────────────── */
  const iconBtn: React.CSSProperties = {
    // flex: '0 0 36px' — 너비/높이 동시에 고정. flex 환경에서 찌그러짐 방지
    flex: '0 0 36px',
    width: 36, height: 36,
    padding: 0,
    boxSizing: 'border-box',
    border: 'none',
    background: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-body)',
  }

  const actionBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 30,
    padding: '0 10px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-surface-card)',
    color: 'var(--color-text-body)',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  }

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

  return (
    <>
    <Toast message="복사되었습니다" trigger={copyCount} />
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUp(e)}
      onPointerCancel={(e) => handlePointerUp(e)}
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
        backgroundColor: dockMode ? 'transparent' : panelMode ? 'var(--color-surface-card)' : 'var(--color-surface-raised)',
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
          padding: '0 20px 12px',
          position: 'relative',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 21, fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.12,
              letterSpacing: '-0.2px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              paddingRight: 84,
              paddingLeft: onBack ? 40 : 0,
            }}>
              <span style={{ minWidth: 0 }}>{theater.name}</span>
              {theater.website && (
                <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                  <IconExternal size={10} />
                </button>
              )}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--color-text-sub)',
              marginTop: 1,
              lineHeight: 1.25,
              display: 'flex',
              alignItems: 'baseline',
              gap: 2,
            }}>
              <span style={{ minWidth: 0 }}>{theater.address}</span>
              <button style={inlineIconBtn} onClick={copyAddress} aria-label="주소 복사">
                <IconCopy size={10} />
              </button>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 5,
            }}>
              <button style={actionBtn} onClick={openDirections}>
                <IconRoute size={13} />
                길찾기
              </button>
              <button style={actionBtn} onClick={shareTheater}>
                <IconShare size={13} />
                공유
              </button>
              {hasInstagram && (
                <button style={actionBtn} onClick={openInstagram}>
                  <IconInstagram size={13} />
                  인스타그램
                </button>
              )}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: -2,
            right: 20,
            display: 'flex',
            gap: 6,
          }}>
            <button style={iconBtn} onClick={onClose}>
              <IconClose />
            </button>
          </div>
          {onBack && (
            <div style={{ position: 'absolute', top: -2, left: 20 }}>
              <button style={iconBtn} onClick={onBack} aria-label="이전으로">
                <IconChevronLeft />
              </button>
            </div>
          )}
        </div>
      ) : panelMode ? (
        /* PC 패널 헤더 — 극장 정보 고정 */
        <div style={{
          flexShrink: 0,
          padding: '18px 18px 14px',
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
              <button style={{ ...iconBtn, flexShrink: 0 }} onClick={onBack} aria-label="이전으로">
                <IconChevronLeft />
              </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <h2 style={{
                  margin: 0,
                  minWidth: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.16,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.name}
                </h2>
                {theater.website && (
                  <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                    <IconExternal size={11} />
                  </button>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 3,
                marginTop: 5,
                minWidth: 0,
                color: 'var(--color-text-sub)',
                fontSize: 13,
                lineHeight: 1.35,
              }}>
                <span style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {theater.address}
                </span>
                <button style={inlineIconBtn} onClick={copyAddress} aria-label="주소 복사">
                  <IconCopy size={10} />
                </button>
              </div>
            </div>
            <button style={iconBtn} onClick={onClose} aria-label="닫기">
              <IconClose />
            </button>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
            marginTop: 14,
          }}>
            <button style={actionBtn} onClick={openDirections}>
              <IconRoute size={13} />
              길찾기
            </button>
            <button style={actionBtn} onClick={shareTheater}>
              <IconShare size={13} />
              공유
            </button>
            {hasInstagram && (
              <button style={actionBtn} onClick={openInstagram}>
                <IconInstagram size={13} />
                인스타그램
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Expanded 헤더 — nav row만 고정 (극장 정보는 스크롤 안으로) */
        <div style={{
          flexShrink: 0,
          padding: '0 12px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button style={iconBtn} onClick={onBack ?? onCollapse}>
            <IconChevronLeft />
          </button>
          <span style={{
            flex: 1, textAlign: 'center',
            fontSize: 15, fontWeight: 600,
            color: 'var(--color-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            padding: '0 6px',
            opacity: nameInNav ? 1 : 0,
            transition: 'opacity 180ms ease',
          }}>
            {theater.name}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* 즐겨찾기 — 계정 기능 구현 전 비활성화
            <button style={iconBtn} onClick={onFavorite}>
              <IconStar filled={favorited} />
            </button>
            */}
            <button style={iconBtn} onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </div>
      )}

      {/* ── 포스터 가로 스크롤 — collapsed 전용 ── */}
      {!shownExpanded && <div style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-bg)',
        flexShrink: 0,
        // 스크롤 비례 높이 축소 (228 → 90) — 상단 배지(8px) 여백 포함
        maxHeight: 228 - 138 * posterProgress,
        overflow: 'hidden',
        position: 'relative',  // 스크롤 버튼 절대 위치 기준
      }}>
        {/* 모바일 포스터 좌우 스크롤 버튼 */}
        {posterCanScrollLeft && (
          <button
            style={{
              position: 'absolute', top: '50%', left: 6,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', zIndex: 3,
              border: 'none', cursor: 'pointer',
              backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 72%, transparent)',
              backdropFilter: 'blur(8px)',
              color: 'var(--color-text-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              minHeight: 'auto',
            }}
            onClick={() => posterScrollRef.current?.scrollBy({ left: -(88 + 12) * 3, behavior: 'smooth' })}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        {posterCanScrollRight && (
          <button
            style={{
              position: 'absolute', top: '50%', right: 6,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', zIndex: 3,
              border: 'none', cursor: 'pointer',
              backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 72%, transparent)',
              backdropFilter: 'blur(8px)',
              color: 'var(--color-text-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              minHeight: 'auto',
            }}
            onClick={() => posterScrollRef.current?.scrollBy({ left: (88 + 12) * 3, behavior: 'smooth' })}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}
        <div
          ref={posterScrollRef}
          onScroll={updatePosterScrollEdge}
          style={{
            display: 'flex',
            gap: 12 - 4 * posterProgress,           // 12 → 8
            overflowX: 'auto',
            paddingTop: 22 - 6 * posterProgress,    // 22 → 16 (배지 8px 여백 포함)
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 14 - 6 * posterProgress, // 14 → 8
            scrollbarWidth: 'none',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'pan-y',
          }}
        >
          {allMoviesLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 88 }}>
                  <div style={{ width: 88, height: 132, borderRadius: 6, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                  <div style={{ width: 70, height: 11, borderRadius: 4, marginTop: 6, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                  <div style={{ width: 50, height: 10, borderRadius: 4, marginTop: 3, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                </div>
              ))
            : allMovieEntries.length === 0
              ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 0 12px',
                    gap: 8,
                    minWidth: '100%',
                  }}>
                    <img src="/closed.svg" alt="" style={{ width: 72, height: 92, opacity: 0.5 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>상영 예정 정보가 없습니다</span>
                  </div>
                )
              : (() => {
                  return sortedAllEntries.map((entry) => {
                    const { movie } = entry
                    const unavailable = false // showTodayFirst && !entry.availableDates.has(selectedIsoDate)
                    const soldout = !unavailable && soldoutMovieIds.has(movie.id)

                    return (
                      <div
                        key={movie.id}
                        style={{ flexShrink: 0, width: 88 - 44 * posterProgress, overflow: 'visible' }}
                      >
                        <div style={{
                          width: 88,
                          transformOrigin: 'top left',
                          transform: `scale(${1 - 0.5 * posterProgress})`,
                        }}>
                          <div style={{ position: 'relative' }}>
                            <PosterThumb
                              width={88}
                              height={132}
                              size="lg"
                              src={movie.posterUrl}
                              selected={shownExpanded && selectedMovieId === movie.id}
                              onClick={unavailable ? undefined : () => {
                                handleMovieSelect(movie.id, 'collapsed_poster_strip')
                                if (!shownExpanded) onExpand()
                              }}
                            />
                            {/* 매진 배지 */}
                            {soldout && (
                              <div style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                height: 20,
                                padding: '0 6px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#fff',
                                backgroundColor: 'var(--color-error)',
                                border: '1px solid color-mix(in srgb, var(--color-error) 60%, transparent)',
                                pointerEvents: 'none',
                                zIndex: 2,
                              }}>
                                매진
                              </div>
                            )}
                            {/* 이 날 상영 없는 영화 — 반투명 오버레이 */}
                            {unavailable && (
                              <div style={{
                                position: 'absolute', inset: 0,
                                borderRadius: 'var(--comp-poster-sheet-radius)',
                                background: 'rgba(10, 8, 6, 0.45)',
                                pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                          <div style={{
                            marginTop: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            fontFamily: 'var(--font-serif)',
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
                              marginTop: 3,
                              fontSize: 10,
                              fontFamily: 'var(--font-display)',
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
          }}
        >
          {/* 극장 정보 — 스크롤 시 위로 밀림 */}
          {!panelMode && <div ref={theaterNameRef} style={{ padding: '4px 20px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                fontSize: 23, fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.12, letterSpacing: '-0.3px', minWidth: 0,
              }}>
                {theater.name}
              </div>
              {theater.website && (
                <button style={inlineIconBtn} onClick={openWebsite} aria-label="사이트 보기">
                  <IconExternal size={10} />
                </button>
              )}
            </div>
            <div style={{
              fontSize: 13, color: 'var(--color-text-sub)',
              marginTop: 1, lineHeight: 1.25,
              display: 'flex', alignItems: 'baseline', gap: 2,
            }}>
              <span style={{ minWidth: 0 }}>{theater.address}</span>
              <button style={inlineIconBtn} onClick={copyAddress} aria-label="주소 복사">
                <IconCopy size={10} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <button style={actionBtn} onClick={openDirections}>
                <IconRoute size={13} />길찾기
              </button>
              <button style={actionBtn} onClick={shareTheater}>
                <IconShare size={13} />공유
              </button>
              {hasInstagram && (
                <button style={actionBtn} onClick={openInstagram}>
                  <IconInstagram size={13} />인스타그램
                </button>
              )}
            </div>
          </div>}

          {/* DateBar — sticky */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            backgroundColor: panelMode ? 'var(--color-surface-card)' : 'var(--color-surface-raised)',
            borderTop: panelMode ? 'none' : '1px solid var(--color-border)',
            borderBottom: panelMode ? '1px solid var(--color-border)' : undefined,
          }}>
            <DateBar
              days={days}
              selectedDate={selectedDate}
              hasPrev={dateWindowOffset > 0}
              hasNext={dateWindowOffset < 21}
              onPrev={() => setDateWindowOffset((o) => Math.max(0, o - 7))}
              onNext={() => setDateWindowOffset((o) => o + 7)}
              onSelectDate={(date) => {
                const day = days.find((d) => d.date === date)
                if (day) {
                  trackEvent('theater date changed', {
                    theater_id: theater.id,
                    theater_name: theater.name,
                    from_date: selectedIsoDate,
                    to_date: day.isoDate,
                    selected_movie_id: selectedMovieId || null,
                    source: 'theater_sheet',
                  })
                  classifySessionIntent('type_c', {
                    source: 'theater_sheet',
                    theater_id: theater.id,
                  })
                  setSelectedIsoDate(day.isoDate)
                }
              }}
            />
          </div>

          {/* ── 포스터 가로 스크롤 — expanded에서 스크롤과 함께 ── */}
          {(() => {
            const activeCount = sheetFilters.genres.length + sheetFilters.nations.length + (sheetFilters.bookable ? 1 : 0)
            const filtersOn = activeCount > 0
            const total = allMovieEntries.length
            const matched = filteredMovieEntries.length
            const matchedIds = filtersOn ? new Set(filteredMovieEntries.map(e => e.movie.id)) : null
            const nonMatchingEntries = filtersOn ? allMovieEntries.filter(e => !matchedIds!.has(e.movie.id)) : []
            return (
          <div style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-bg)',
          }}>
            {/* 필터 행 */}
            {(availableGenres.length > 0 || availableNations.length > 0) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 2,
              }}>
                {/* 왼쪽: 편수 + 활성 칩들 */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  <span style={{
                    flexShrink: 0, fontSize: 13, fontWeight: 600,
                    color: filtersOn ? 'var(--color-primary-base)' : 'var(--color-text-sub)',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}>
                    {filtersOn ? `${matched}/${total}편` : `${total}편 상영`}
                  </span>
                  {sheetFilters.genres.map(g => (
                    <button
                      key={`g:${g}`}
                      onClick={() => applySheetFilters({ ...sheetFilters, genres: sheetFilters.genres.filter(x => x !== g) })}
                      style={{
                        flexShrink: 0, height: 22, padding: '0 6px 0 8px',
                        borderRadius: 999,
                        border: '1px solid var(--color-primary-base)',
                        backgroundColor: 'var(--color-primary-subtle-l)',
                        color: 'var(--color-primary-base)',
                        fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3, minHeight: 'auto',
                      }}
                    >
                      {g}
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  ))}
                  {sheetFilters.nations.map(n => (
                    <button
                      key={`n:${n}`}
                      onClick={() => applySheetFilters({ ...sheetFilters, nations: sheetFilters.nations.filter(x => x !== n) })}
                      style={{
                        flexShrink: 0, height: 22, padding: '0 6px 0 8px',
                        borderRadius: 999,
                        border: '1px solid var(--color-primary-base)',
                        backgroundColor: 'var(--color-primary-subtle-l)',
                        color: 'var(--color-primary-base)',
                        fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3, minHeight: 'auto',
                      }}
                    >
                      {withFlag(n)}
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  ))}
                  {sheetFilters.bookable && (
                    <button
                      onClick={() => applySheetFilters({ ...sheetFilters, bookable: false })}
                      style={{
                        flexShrink: 0, height: 22, padding: '0 6px 0 8px',
                        borderRadius: 999,
                        border: '1px solid var(--color-primary-base)',
                        backgroundColor: 'var(--color-primary-subtle-l)',
                        color: 'var(--color-primary-base)',
                        fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3, minHeight: 'auto',
                      }}
                    >
                      예매가능
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  )}
                </div>
                {/* 오른쪽: 필터 버튼 */}
                <button
                  onClick={() => { setPendingFilters(sheetFilters); setFilterSheetOpen(true) }}
                  style={{
                    flexShrink: 0, height: 26, padding: '0 10px',
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: filtersOn ? 'var(--color-primary-base)' : 'var(--color-border)',
                    backgroundColor: filtersOn ? 'var(--color-primary-subtle-l)' : 'transparent',
                    color: filtersOn ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, minHeight: 'auto',
                  }}
                >
                  <IconFilter size={11} />
                  필터{activeCount > 0 ? ` ${activeCount}` : ''}
                </button>
              </div>
            )}

            {/* 이 날 상영 필터 체크박스 — 비활성화 (todo.md 참고) */}
            {/* <label style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 16px',
              cursor: 'pointer', fontSize: 11, userSelect: 'none',
              color: showTodayFirst ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              fontWeight: showTodayFirst ? 600 : 400,
            }}>
              <input type="checkbox" checked={showTodayFirst} onChange={e => setShowTodayFirst(e.target.checked)}
                style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--color-primary-base)', flexShrink: 0 }} />
              이 날 상영하는 영화만 보기
            </label> */}

            <div style={{ position: 'relative' }}>
              {/* 포스터 좌우 스크롤 버튼 — expanded 전체(모바일/PC 패널) */}
              {(() => {
                const scrollBy = (dir: 1 | -1) => {
                  posterScrollRef.current?.scrollBy({ left: dir * (88 + 12) * 3, behavior: 'smooth' })
                }
                const btnStyle: React.CSSProperties = {
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%', zIndex: panelMode ? 2 : 3,
                  border: 'none', cursor: 'pointer',
                  backgroundColor: `color-mix(in srgb, var(--color-surface-card) ${panelMode ? 55 : 72}%, transparent)`,
                  backdropFilter: 'blur(8px)',
                  color: 'var(--color-text-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: panelMode ? '0 1px 6px rgba(0,0,0,0.10)' : '0 1px 6px rgba(0,0,0,0.12)',
                  minHeight: 'auto',
                }
                return (
                  <>
                    {posterCanScrollLeft && (
                      <button style={{ ...btnStyle, left: 6 }} onClick={() => scrollBy(-1)}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                    )}
                    {posterCanScrollRight && (
                      <button style={{ ...btnStyle, right: 6 }} onClick={() => scrollBy(1)}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    )}
                  </>
                )
              })()}

            <div
              ref={posterScrollRef}
              onScroll={updatePosterScrollEdge}
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingTop: 14,
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 6,
                scrollbarWidth: 'none',
                cursor: 'grab',
                userSelect: 'none',
                touchAction: 'pan-y',
              }}
            >
              {allMoviesLoading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 88 }}>
                      <div style={{ width: 88, height: 132, borderRadius: 6, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                      <div style={{ width: 70, height: 11, borderRadius: 4, marginTop: 6, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                      <div style={{ width: 50, height: 10, borderRadius: 4, marginTop: 3, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 130}ms` }} />
                    </div>
                  ))
                : allMovieEntries.length === 0
                  ? (
                      <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '6px 0 12px', gap: 8, minWidth: '100%',
                      }}>
                        <img src="/closed.svg" alt="" style={{ width: 72, height: 92, opacity: 0.5 }} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>상영 예정 정보가 없습니다</span>
                      </div>
                    )
                  : <>
                      {/* 조건 일치 영화 */}
                      {sortedFilteredEntries.map((entry) => {
                        const { movie } = entry
                        const unavailable = !entry.availableDates.has(selectedIsoDate)
                        const soldout = !unavailable && soldoutMovieIds.has(movie.id)
                        return (
                          <div
                            key={movie.id}
                            style={{ flexShrink: 0, width: 88, overflow: 'visible' }}
                          >
                            <div style={{ width: 88 }}>
                              <div style={{ position: 'relative' }}>
                                <PosterThumb
                                  width={88} height={132} size="lg"
                                  src={movie.posterUrl}
                                  selected={selectedMovieId === movie.id}
                                  onClick={unavailable ? undefined : () => { handleMovieSelect(movie.id, 'poster_strip') }}
                                />
                                {soldout && (
                                  <div style={{
                                    position: 'absolute', bottom: 6, right: 6,
                                    height: 20, padding: '0 6px', borderRadius: 4,
                                    display: 'inline-flex', alignItems: 'center',
                                    fontSize: 10, fontWeight: 700, color: '#fff',
                                    backgroundColor: 'var(--color-error)',
                                    pointerEvents: 'none', zIndex: 2,
                                  }}>매진</div>
                                )}
                                {unavailable && (() => {
                                  const nextDates = [...entry.availableDates].filter(d => d > selectedIsoDate).sort()
                                  const nextLabel = nextDates.length > 0 ? (() => {
                                    const [y, m, d] = nextDates[0].split('-').map(Number)
                                    const dt = new Date(y, m - 1, d)
                                    return `${dt.getDate()}일(${'일월화수목금토'[dt.getDay()]})`
                                  })() : null
                                  return (
                                    <div
                                      onClick={() => handleMovieSelect(movie.id, 'unavailable_movie_card')}
                                      style={{
                                        position: 'absolute', inset: 0,
                                        borderRadius: 'var(--comp-poster-sheet-radius)',
                                        background: 'rgba(10, 8, 6, 0.72)',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        gap: 2,
                                      }}
                                    >
                                      <span style={{ fontSize: 8, fontWeight: 500, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
                                        다음 상영
                                      </span>
                                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.3 }}>
                                        {nextLabel ?? '일정 없음'}
                                      </span>
                                    </div>
                                  )
                                })()}
                              </div>
                              <div style={{
                                marginTop: 6, fontSize: 11, fontWeight: 600,
                                color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)',
                                lineHeight: 1.35, overflow: 'hidden',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                opacity: unavailable ? 0.4 : 1,
                                textDecoration: 'none', // (showTodayFirst && unavailable) ? 'line-through' : 'none',
                              }}>{movie.title}</div>
                              {movie.director && movie.director.length > 0 && (
                                <div style={{
                                  marginTop: 3, fontSize: 10, fontFamily: 'var(--font-display)',
                                  color: 'var(--color-text-caption)',
                                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                  opacity: unavailable ? 0.3 : 1,
                                }}>{movie.director[0]}</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {/* 조건 외 구분선 + 반투명 영화 */}
                      {filtersOn && nonMatchingEntries.length > 0 && (
                        <>
                          <div style={{
                            flexShrink: 0, width: 1, height: 132,
                            alignSelf: 'flex-start', marginTop: 0,
                            backgroundColor: 'var(--color-border)',
                            marginLeft: 4, marginRight: 4,
                          }} />
                          {nonMatchingEntries.map((entry) => {
                            const { movie } = entry
                            return (
                              <div key={movie.id} style={{ flexShrink: 0, width: 88, overflow: 'visible', opacity: 0.38 }}>
                                <div style={{ width: 88 }}>
                                  <div style={{ position: 'relative' }}>
                                    <PosterThumb width={88} height={132} size="lg" src={movie.posterUrl} />
                                    <div style={{
                                      position: 'absolute', inset: 0,
                                      borderRadius: 'var(--comp-poster-sheet-radius)',
                                      background: 'rgba(0,0,0,0.45)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 1.3 }}>
                                        조건 외
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{
                                    marginTop: 6, fontSize: 11, fontWeight: 600,
                                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)',
                                    lineHeight: 1.35, overflow: 'hidden',
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                  }}>{movie.title}</div>
                                  {movie.director && movie.director.length > 0 && (
                                    <div style={{
                                      marginTop: 3, fontSize: 10, fontFamily: 'var(--font-display)',
                                      color: 'var(--color-text-caption)',
                                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                    }}>{movie.director[0]}</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </>
              }
            </div>

            </div>{/* position:relative 래퍼 닫기 */}
          </div>
            )
          })()}

          {/* 선택된 영화 카드 */}
          {(() => {
            const entry = allMovieEntries.find(e => e.movie.id === selectedMovieId)
            if (!entry) return null
            const { movie } = entry
            return (
              <div style={{
                margin: '8px 20px',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: 'var(--color-surface-card)',
              }}>
                <div style={{ display: 'flex', gap: 12, padding: '12px 12px 10px' }}>
                  {/* 포스터 */}
                  <div style={{ flexShrink: 0, width: 60, height: 90, borderRadius: 6, overflow: 'hidden', backgroundColor: 'var(--color-neutral-700)' }}>
                    {movie.posterUrl && (
                      <img src={movie.posterUrl} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </div>
                  {/* 영화 정보 */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{
                      fontSize: 17, fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {movie.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {movie.nation && movie.nation.split(/[,，/·]+/).map(n => n.trim()).filter(Boolean).map(n => (
                        <span key={n} style={{
                          fontSize: 10, fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 999,
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-sub)',
                        }}>
                          {withFlag(n)}
                        </span>
                      ))}
                      {movie.runtimeMinutes && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
                          {movie.runtimeMinutes}분
                        </span>
                      )}
                    </div>
                    {movie.genre && movie.genre.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {movie.genre.map(g => (
                          <span key={g} style={{
                            fontSize: 10, fontWeight: 500,
                            padding: '1px 6px',
                            borderRadius: 999,
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-sub)',
                          }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* 감독 행 */}
                {movie.director && movie.director.length > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onDirectorOpen) onDirectorOpen(movie.director[0])
                      else router.push(`/director/${encodeURIComponent(movie.director[0])}`)
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'var(--color-surface-bg)',
                      border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-caption)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-body)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {movie.director[0]}
                    </span>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-caption)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                )}
                {/* 액션 버튼 */}
                <div style={{ borderTop: '1px solid var(--color-border)', display: 'flex' }}>
                  <button
                    onClick={() => onMovieDetailOpen ? onMovieDetailOpen(movie.id) : router.push(`/movie/${movie.id}?theater=${theater.id}`)}
                    style={{
                      flex: 1, padding: '10px 0',
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-body)',
                      background: 'none', border: 'none',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <IconChevronRight size={13} />
                    영화 상세 정보
                  </button>
                  <div style={{ width: 1, backgroundColor: 'var(--color-border)' }} />
                  <button
                    onClick={() => { onMovieSearch?.(movie.id, movie.title); onClose() }}
                    style={{
                      flex: 1, padding: '10px 0',
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-body)',
                      background: 'none', border: 'none',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <IconSearch size={13} />
                    지도에서 이 영화 검색
                  </button>
                </div>
              </div>
            )
          })()}

          {/* 상영시간표 */}
          <div ref={showtimeSectionRef} style={{ padding: `8px 20px ${selectedShowtimeId ? 88 : 40}px` }}>
            {showtimesLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={60} style={{ borderRadius: 8 }} />
                ))}
              </div>
            ) : filteredShowtimes.length === 0 ? (
              <div style={{
                paddingTop: 32,
                textAlign: 'center',
                color: 'var(--color-text-caption)',
                fontSize: 13,
              }}>
                선택한 날짜에 상영 정보가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {filteredShowtimes.map((st) => {
                  const [sh, sm] = st.showTime.split(':').map(Number)
                  const startMin = sh * 60 + sm
                  const endMin = st.endTime ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })() : startMin + 120
                  const isToday = selectedIsoDate === todayIso
                  const kind: import('./ShowtimeCell').ShowtimeKind = (() => {
                    if (isToday && endMin <= nowMinutes) return 'ended'
                    if (isToday && startMin < nowMinutes && endMin > nowMinutes) return 'nowplaying'
                    if (st.seatAvailable === 0) return 'soldout'
                    if (st.seatAvailable <= st.seatTotal * 0.1) return 'low'
                    if (sh >= 21) return 'late'
                    return 'normal'
                  })()
                  return (
                    <ShowtimeCell
                      key={st.id}
                      startTime={st.showTime.slice(0, 5)}
                      endTime={st.endTime ? st.endTime.slice(0, 5) : ''}
                      seatAvailable={st.seatAvailable}
                      seatTotal={st.seatTotal}
                      screenName={st.screenName}
                      kind={kind}
                      selected={st.id === selectedShowtimeId}
                      onClick={kind !== 'soldout' && kind !== 'nowplaying' && kind !== 'ended' ? () => handleShowtimeSelect(st) : undefined}
                    />
                  )
                })}
              </div>
            )}
            {!showtimesLoading && filteredShowtimes.length > 0 && (
              <div style={{
                marginTop: 10,
                fontSize: 11,
                color: 'var(--color-text-caption)',
                textAlign: 'center',
                lineHeight: 1.5,
                opacity: 0.7,
              }}>
                상영 정보는 실시간으로 불러오지 않으므로<br />실제 좌석 현황과 다를 수 있습니다.
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── 예매 바 — 회차 선택 시 하단에서 슬라이드 업 ── */}
      {shownExpanded && (() => {
        const selectedSt = filteredShowtimes.find((st) => st.id === selectedShowtimeId)
        return (
          <div style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            transform: (selectedShowtimeId && showtimeInView) ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
            backgroundColor: 'var(--color-surface-card)',
            borderTop: '1px solid var(--color-border)',
            padding: '12px 20px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            zIndex: 10,
          }}>
            <button
              disabled={!selectedSt?.bookingUrl}
              onClick={() => {
                if (selectedSt?.bookingUrl) {
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
                  window.open(selectedSt.bookingUrl.replace(/^http:\/\//i, 'https://'), '_blank', 'noopener')
                }
              }}
              style={{
                width: '100%',
                height: 50,
                borderRadius: 'var(--radius-full)',
                backgroundColor: selectedSt?.bookingUrl ? 'var(--color-primary-base)' : 'var(--color-neutral-600)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                border: 'none',
                cursor: selectedSt?.bookingUrl ? 'pointer' : 'default',
                letterSpacing: '-0.2px',
              }}
            >
              예매하러가기
            </button>
          </div>
        )
      })()}

      {/* ── 영화 필터 팝업 ── */}
      {filterSheetOpen && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
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
              padding: '18px 18px 12px',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>영화 필터</span>
              <button
                onClick={() => setPendingFilters({ genres: [], nations: [], bookable: false })}
                style={{ border: 'none', background: 'none', fontSize: 12, color: 'var(--color-text-caption)', cursor: 'pointer', padding: '4px 0' }}
              >
                모두 선택해제
              </button>
            </div>

            {/* 본문 (스크롤) */}
            <div style={{ padding: '0 18px', maxHeight: '50vh', overflowY: 'auto' }}>
              {/* 장르 */}
              {availableGenres.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 10 }}>장르</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {availableGenres.map(g => (
                      <button
                        key={g}
                        onClick={() => setPendingFilters(prev => ({
                          ...prev,
                          genres: prev.genres.includes(g) ? prev.genres.filter(x => x !== g) : [...prev.genres, g],
                        }))}
                        style={{
                          height: 34, padding: '0 14px', borderRadius: 999,
                          border: '1px solid',
                          borderColor: pendingFilters.genres.includes(g) ? 'var(--color-primary-base)' : 'var(--color-border)',
                          backgroundColor: pendingFilters.genres.includes(g) ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-bg)',
                          color: pendingFilters.genres.includes(g) ? 'var(--color-primary-base)' : 'var(--color-text-body)',
                          fontSize: 13, fontWeight: pendingFilters.genres.includes(g) ? 600 : 400,
                          cursor: 'pointer', minHeight: 'auto',
                        }}
                      >{g}</button>
                    ))}
                  </div>
                </>
              )}
              {/* 국가 */}
              {availableNations.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 10 }}>국가</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {availableNations.map(n => (
                      <button
                        key={n}
                        onClick={() => setPendingFilters(prev => ({
                          ...prev,
                          nations: prev.nations.includes(n) ? prev.nations.filter(x => x !== n) : [...prev.nations, n],
                        }))}
                        style={{
                          height: 34, padding: '0 14px', borderRadius: 999,
                          border: '1px solid',
                          borderColor: pendingFilters.nations.includes(n) ? 'var(--color-primary-base)' : 'var(--color-border)',
                          backgroundColor: pendingFilters.nations.includes(n) ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-bg)',
                          color: pendingFilters.nations.includes(n) ? 'var(--color-primary-base)' : 'var(--color-text-body)',
                          fontSize: 13, fontWeight: pendingFilters.nations.includes(n) ? 600 : 400,
                          cursor: 'pointer', minHeight: 'auto',
                        }}
                      >{withFlag(n)}</button>
                    ))}
                  </div>
                </>
              )}
              {/* 예매 가능한 영화만 토글 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 4, paddingBottom: 18,
                borderTop: '1px solid var(--color-border)',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>예매 가능한 영화만</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-caption)', marginTop: 3 }}>잔여석이 있는 상영회만 표시</div>
                </div>
                <div
                  onClick={() => setPendingFilters(prev => ({ ...prev, bookable: !prev.bookable }))}
                  style={{
                    flexShrink: 0,
                    width: 44, height: 26, borderRadius: 999,
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
                    borderRadius: '50%', backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transition: 'left 180ms',
                  }} />
                </div>
              </div>
            </div>

            {/* 적용하기 버튼 */}
            <div style={{ padding: '0 18px 18px' }}>
              <button
                onClick={() => { applySheetFilters(pendingFilters); setFilterSheetOpen(false) }}
                style={{
                  width: '100%', height: 50, borderRadius: 12,
                  border: 'none', backgroundColor: 'var(--color-primary-base)',
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
