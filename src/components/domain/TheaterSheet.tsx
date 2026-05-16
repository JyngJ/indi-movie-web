'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
function buildDays(count = 7, availableDates?: Set<string>): Day[] {
  const today = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dow  = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
    const date = String(d.getDate())
    const type: DayType =
      i === 0            ? 'today'
      : d.getDay() === 0 ? 'sunday'
      : d.getDay() === 6 ? 'saturday'
      : 'weekday'

    // availableDates가 주어지면 없는 날짜는 disabled
    const isoDate = d.toISOString().slice(0, 10)   // 'YYYY-MM-DD'
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
  presentation?: 'sheet' | 'panel'
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
}: TheaterSheetProps) {

  const router = useRouter()
  const panelMode = presentation === 'panel'
  const shownExpanded = panelMode || expanded

  /* ── Sheet filter state ─────────────────────────────────────── */
  const [showTodayFirst, setShowTodayFirst] = useState(false)
  const [sheetFilters, setSheetFilters] = useState<SheetFilterState>({ genres: [], nations: [], bookable: false })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<SheetFilterState>({ genres: [], nations: [], bookable: false })

  const applySheetFilters = (next: SheetFilterState) => {
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
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedIsoDate, setSelectedIsoDate] = useState(todayIso)

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

  const days = buildDays(7, theaterAvailableDates)
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
  const dragActive      = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartOffset = useRef(0)   // 드래그 시작 시점의 translateY
  const [dragOffset, setDragOffset] = useState(0)   // 현재 드래그 delta
  const [dragging, setDragging]     = useState(false)
  const [copyCount, setCopyCount] = useState(0)

  // 속도 계산용 — 최근 이벤트 (timestamp, y) 를 최대 5개 보관
  const velocityBuffer = useRef<Array<{ t: number; y: number }>>([])
  const VELOCITY_THRESHOLD = 500   // px/s 이상이면 flick으로 간주
  const POSITION_THRESHOLD = 0.25  // 전체 이동 거리의 25% 이상이면 snap

  /* ── 포스터 스크롤 드래그 ── */
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const posterDrag      = useRef({ active: false, startX: 0, scrollLeft: 0 })
  const posterTouching  = useRef(false)  // 포스터 영역 터치 중 (방향 미확정 포함)

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

  /* 확장 시 스크롤 최상단에서 아래로 드래그 → 시트 접기 */
  useEffect(() => {
    if (panelMode) return
    const el = scrollAreaRef.current
    if (!el) return
    let startY = 0
    let startScrollTop = 0
    let collapsing = false

    const onDown = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startScrollTop = el.scrollTop
      collapsing = false
    }
    const onMove = (e: TouchEvent) => {
      if (collapsing) { e.preventDefault(); return }
      if (startScrollTop > 2) return          // 스크롤 중이면 무시
      const dy = e.touches[0].clientY - startY
      if (dy > 20) {                          // 20px 아래로 드래그 → 접기
        collapsing = true
        onCollapse()
        e.preventDefault()
      }
    }
    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove',  onMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove',  onMove)
    }
  }, [onCollapse, panelMode, shownExpanded])   // expanded 전환 시 ref가 새 DOM을 가리키므로 재등록 필요

  /* 포스터 가로 드래그 + momentum — native 이벤트 (preventDefault 필요) */
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el) return

    // null = 아직 미결정, 'h' = 가로 고정, 'v' = 세로 고정
    let dirLock: 'h' | 'v' | null = null
    let momentumId = 0
    const velBuf: Array<{ t: number; x: number }> = []

    const cancelMomentum = () => {
      if (momentumId) { cancelAnimationFrame(momentumId); momentumId = 0 }
    }

    let startY = 0
    const onDown = (e: MouseEvent | TouchEvent) => {
      cancelMomentum()
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      posterDrag.current = { active: false, startX: x, scrollLeft: el.scrollLeft }
      posterTouching.current = true
      dirLock = null
      el.style.cursor = 'grabbing'
      velBuf.length = 0
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!posterTouching.current) return
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      const dx = Math.abs(x - posterDrag.current.startX)
      const dy = Math.abs(y - startY)

      // 방향 미결정: 8px 이상 움직이면 방향 고정. 그 전까진 버블링 차단해서 시트 collapse 방지
      if (dirLock === null) {
        if (dx < 8 && dy < 8) { e.stopPropagation(); return }
        dirLock = dx >= dy ? 'h' : 'v'
      }

      if (dirLock === 'v') {
        // 세로 확정 → 포스터 포기, 이벤트 올려보내서 시트/스크롤이 처리하게
        posterTouching.current = false
        return
      }

      // 가로 확정 → 시트 핸들러까지 버블링 차단
      posterDrag.current.active = true
      e.preventDefault()
      e.stopPropagation()
      el.scrollLeft = posterDrag.current.scrollLeft - (x - posterDrag.current.startX)

      // 속도 계산용 버퍼
      velBuf.push({ t: Date.now(), x })
      if (velBuf.length > 6) velBuf.shift()
    }
    const onUp = () => {
      const wasActive = posterDrag.current.active
      posterDrag.current.active = false
      posterTouching.current = false
      dirLock = null
      el.style.cursor = 'grab'

      if (!wasActive) { velBuf.length = 0; return }

      // momentum — 마지막 200ms 이내 이벤트로 속도 계산
      if (velBuf.length >= 2) {
        const first = velBuf[0]
        const last  = velBuf[velBuf.length - 1]
        const dt    = last.t - first.t
        if (dt > 0 && dt < 200) {
          let vel = -(last.x - first.x) / dt * 16  // px per 16ms frame
          const run = () => {
            if (Math.abs(vel) < 0.5) { momentumId = 0; return }
            el.scrollLeft += vel
            vel *= 0.93
            momentumId = requestAnimationFrame(run)
          }
          momentumId = requestAnimationFrame(run)
        }
      }
      velBuf.length = 0
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelMomentum()
      el.scrollLeft += e.deltaX || e.deltaY
    }
    const onPointerDown = (e: PointerEvent) => { e.stopPropagation() }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('mousedown',   onDown)
    el.addEventListener('mousemove',   onMove)
    el.addEventListener('mouseup',     onUp)
    el.addEventListener('mouseleave',  onUp)
    el.addEventListener('touchstart',  onDown, { passive: false })
    el.addEventListener('touchmove',   onMove, { passive: false })
    el.addEventListener('touchend',    onUp)
    el.addEventListener('touchcancel', onUp)
    el.addEventListener('wheel',       onWheel, { passive: false })
    return () => {
      cancelMomentum()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('mousedown',   onDown)
      el.removeEventListener('mousemove',   onMove)
      el.removeEventListener('mouseup',     onUp)
      el.removeEventListener('mouseleave',  onUp)
      el.removeEventListener('touchstart',  onDown)
      el.removeEventListener('touchmove',   onMove)
      el.removeEventListener('touchend',    onUp)
      el.removeEventListener('touchcancel', onUp)
      el.removeEventListener('wheel',       onWheel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownExpanded])  // expanded 전환 시 ref가 새 DOM을 가리키므로 재등록 필요

  /* ── 수직 드래그 (핸들) ─────────────────────────────────────────── */
  // containerRef.clientHeight는 마운트 전 0이라 잘못된 값이 나옴.
  // window.innerHeight * 0.85 = height: 85dvh 와 동일한 값을 직접 계산.
  const getMaxOffset = useCallback(() => {
    return Math.max(0, viewportHeight - COLLAPSED_H)
  }, [viewportHeight])

  const baseTranslate = shownExpanded ? 0 : getMaxOffset()

  const effectiveTranslate = Math.max(
    0,
    Math.min(getMaxOffset(), baseTranslate + dragOffset),
  )

  // 진입: enterDone 전엔 화면 아래 / 퇴장: exiting이면 화면 아래
  const finalTranslate = panelMode
    ? 0
    : (!enterDone.current || exiting)
    ? viewportHeight
    : effectiveTranslate

  const handlePointerDown = (e: React.PointerEvent) => {
    if (panelMode) return
    // 버튼, 링크, 입력 요소 클릭은 드래그로 처리하지 않음
    if ((e.target as Element).closest('button, a, input, select, textarea')) return
    // expanded 모드: 스크롤 영역 내부 터치는 네이티브 스크롤에 맡김
    // collapsed 모드: 어디서든 드래그 가능
    if (shownExpanded) {
      const scrollEl = scrollAreaRef.current
      if (scrollEl?.contains(e.target as Element)) return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    dragActive.current      = true
    dragStartY.current      = e.clientY
    dragStartOffset.current = effectiveTranslate
    velocityBuffer.current  = [{ t: e.timeStamp, y: e.clientY }]
    setDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    // 포스터 영역 터치 중(방향 미확정 포함)이면 시트 수직 이동 무시
    if (posterTouching.current) return
    const delta    = e.clientY - dragStartY.current
    // collapsed 상태: 아래로 더 내려가는 것 허용 (닫기 제스처)
    const maxTrans = shownExpanded ? getMaxOffset() : getMaxOffset() + 120
    const newTrans = Math.max(0, Math.min(maxTrans, dragStartOffset.current + delta))
    setDragOffset(newTrans - baseTranslate)

    // 최근 5프레임만 유지
    const buf = velocityBuffer.current
    buf.push({ t: e.timeStamp, y: e.clientY })
    if (buf.length > 5) buf.shift()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    dragActive.current = false
    setDragging(false)
    // posterTouching은 항상 리셋 (cancel 시 touchend 없이 stuck되는 케이스 방어)
    posterTouching.current = false
    posterDrag.current.active = false

    // 이동 거리가 8px 미만이면 tap으로 간주 — snap 없이 원위치
    if (Math.abs(e.clientY - dragStartY.current) < 8) {
      setDragOffset(0)
      velocityBuffer.current = []
      return
    }

    const max = getMaxOffset()

    // ── 속도 계산 (px/ms → px/s) ──
    const buf = velocityBuffer.current
    let velocityPxPerSec = 0
    if (buf.length >= 2) {
      const first = buf[0]
      const last  = buf[buf.length - 1]
      const dt    = last.t - first.t
      if (dt > 0) velocityPxPerSec = ((last.y - first.y) / dt) * 1000
    }

    // ── snap 판단: velocity 우선, position 보조 ──
    // velocityPxPerSec > 0 → 아래로 flick (접기), < 0 → 위로 flick (펼치기)
    const isFlickUp   = velocityPxPerSec < -VELOCITY_THRESHOLD
    const isFlickDown = velocityPxPerSec >  VELOCITY_THRESHOLD
    const posRatio    = effectiveTranslate / max   // 0 = 완전 펼침, 1 = 완전 접힘

    if (shownExpanded) {
      if (isFlickDown) {
        // 빠른 아래 플릭 → 바로 닫기
        onClose()
      } else if (posRatio >= POSITION_THRESHOLD) {
        // 25% 이상 내렸으면 → 접기 (collapsed 상태로)
        onCollapse()
      }
      // 그 외 → 원위치 (expanded 유지)
    } else {
      // 현재 접힌 상태
      if (isFlickUp || posRatio < (1 - POSITION_THRESHOLD)) {
        // 위로 flick 또는 충분히 올렸으면 → 펼치기
        onExpand()
      } else if (isFlickDown || posRatio > (1 - POSITION_THRESHOLD + 0.2)) {
        // 아래로 flick 또는 충분히 내렸으면 → 닫기
        onClose()
      }
      // 그 외 → 원위치 (collapsed 유지)
    }

    setDragOffset(0)
    velocityBuffer.current = []
  }

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

  /* ── 이 날 상영 영화 우선 정렬 ── */
  const sortedAllEntries = useMemo(() => {
    if (!showTodayFirst) return allMovieEntries
    const playing = allMovieEntries.filter(e => e.availableDates.has(selectedIsoDate))
    const notPlaying = allMovieEntries.filter(e => !e.availableDates.has(selectedIsoDate))
    return [...playing, ...notPlaying]
  }, [allMovieEntries, selectedIsoDate, showTodayFirst])

  const sortedFilteredEntries = useMemo(() => {
    if (!showTodayFirst) return filteredMovieEntries
    const playing = filteredMovieEntries.filter(e => e.availableDates.has(selectedIsoDate))
    const notPlaying = filteredMovieEntries.filter(e => !e.availableDates.has(selectedIsoDate))
    return [...playing, ...notPlaying]
  }, [filteredMovieEntries, selectedIsoDate, showTodayFirst])

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
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null)

  useEffect(() => { setSelectedShowtimeId(null) }, [selectedMovieId])
  useEffect(() => { if (!shownExpanded) setSelectedShowtimeId(null) }, [shownExpanded])

  /* ── 상영시간 필터링 ─────────────────────────────────────────── */
  const filteredShowtimes = showtimes.filter((s) => s.movieId === selectedMovieId)

  const openWebsite = () => {
    if (!theater.website) return
    window.open(theater.website, '_blank', 'noopener')
  }

  const copyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(theater.address)
    } else {
      const el = document.createElement('textarea')
      el.value = theater.address
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopyCount(c => c + 1)
  }

  const openDirections = () => {
    const url = `nmap://route/public?dlat=${theater.lat}&dlng=${theater.lng}&dname=${encodeURIComponent(theater.name)}&appname=kr.indi.movie`
    const fallback = `https://map.naver.com/v5/directions/-/-/-/transit?c=${theater.lng},${theater.lat},15,0,0,0,dh`
    const a = document.createElement('a')
    a.href = url
    a.click()
    setTimeout(() => window.open(fallback, '_blank', 'noopener'), 1500)
  }

  const shareTheater = () => {
    const shareUrl = `${window.location.origin}/?theater=${encodeURIComponent(theater.id)}`
    // text + url 동시에 넘기면 iOS Safari가 url을 무시하는 버그 있음 → title + url만 사용
    const payload = { title: theater.name, url: shareUrl }

    const copyFallback = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => setCopyCount(c => c + 1))
      }
    }

    const canUseShare = typeof navigator.share === 'function'
      && (typeof navigator.canShare !== 'function' || navigator.canShare(payload))

    if (canUseShare) {
      navigator.share(payload).catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        copyFallback()
      })
      return
    }

    copyFallback()
  }

  const openInstagram = () => {
    const username = theater.instagramUrl?.match(/instagram\.com\/([^/?#]+)/)?.[1]

    if (!username) {
      const webUrl = theater.instagramUrl || `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(theater.name)}`
      window.open(webUrl, '_blank', 'noopener')
      return
    }

    // 앱 딥링크 시도 — 앱이 열리면 window blur 발생 → fallback 취소
    const webUrl = `https://www.instagram.com/${username}/`
    const fallback = setTimeout(() => window.open(webUrl, '_blank', 'noopener'), 1500)
    window.addEventListener('blur', () => clearTimeout(fallback), { once: true })
    window.location.href = `instagram://user?username=${username}`
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
        position: 'absolute',
        left: panelMode ? 'auto' : 0,
        right: panelMode ? 16 : 0,
        top: panelMode ? 16 : 'auto',
        bottom: panelMode ? 16 : 0,
        width: panelMode ? 440 : 'auto',
        maxWidth: panelMode ? 'calc(100vw - 32px)' : undefined,
        height: panelMode ? 'auto' : '100dvh',
        transform: panelMode
          ? (exiting ? 'translateX(calc(100% + 24px))' : 'translateX(0)')
          : `translateY(${finalTranslate}px)`,
        opacity: panelMode && exiting ? 0 : 1,
        // 드래그 중엔 transition 없음, 진입/퇴장/snap엔 항상 transition
        transition: panelMode
          ? 'transform 0.24s ease, opacity 0.2s ease'
          : (dragging && enterDone.current && !exiting)
          ? 'none'
          : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: panelMode ? 'var(--color-surface-card)' : 'var(--color-surface-raised)',
        border: panelMode ? '1px solid var(--color-border)' : undefined,
        borderRadius: panelMode
          ? 18
          : effectiveTranslate === 0
          ? '0'
          : 'var(--comp-sheet-radius)',
        boxShadow: panelMode
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
              <button style={actionBtn} onClick={openInstagram}>
                <IconInstagram size={13} />
                인스타그램
              </button>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: -2,
            right: 20,
            display: 'flex',
            gap: 6,
          }}>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <h2 style={{
                  margin: 0,
                  minWidth: 0,
                  fontSize: 22,
                  fontWeight: 800,
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
            <button style={actionBtn} onClick={openInstagram}>
              <IconInstagram size={13} />
              인스타그램
            </button>
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
          <button style={iconBtn} onClick={onCollapse}>
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
      }}>
        {/* 이 날 상영 필터 체크박스 */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 20px 0',
          cursor: 'pointer', fontSize: 11, userSelect: 'none',
          color: showTodayFirst ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
          fontWeight: showTodayFirst ? 600 : 400,
        }}>
          <input type="checkbox" checked={showTodayFirst} onChange={e => setShowTodayFirst(e.target.checked)}
            style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--color-primary-base)', flexShrink: 0 }} />
          이 날 상영하는 영화만 보기
        </label>
        <div
          ref={posterScrollRef}
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
            touchAction: 'none',
          }}
        >
          {allMoviesLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 88 }}>
                  <Skeleton width={88} height={132} style={{ borderRadius: 6 }} />
                  <Skeleton width={70} height={11} style={{ marginTop: 6, borderRadius: 4 }} />
                  <Skeleton width={50} height={10} style={{ marginTop: 3, borderRadius: 4 }} />
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
                    const unavailable = showTodayFirst && !entry.availableDates.has(selectedIsoDate)
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
                                onMovieSelect(movie.id)
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
              <button style={actionBtn} onClick={openInstagram}>
                <IconInstagram size={13} />인스타그램
              </button>
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
              onSelectDate={(date) => {
                const day = days.find((d) => d.date === date)
                if (day) setSelectedIsoDate(day.isoDate)
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

            {/* 이 날 상영 필터 체크박스 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 16px',
              cursor: 'pointer', fontSize: 11, userSelect: 'none',
              color: showTodayFirst ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              fontWeight: showTodayFirst ? 600 : 400,
            }}>
              <input type="checkbox" checked={showTodayFirst} onChange={e => setShowTodayFirst(e.target.checked)}
                style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--color-primary-base)', flexShrink: 0 }} />
              이 날 상영하는 영화만 보기
            </label>

            <div style={{ position: 'relative' }}>
              {/* PC 패널 전용 포스터 좌우 스크롤 버튼 */}
              {panelMode && (() => {
                const scrollBy = (dir: 1 | -1) => {
                  const el = posterScrollRef.current
                  if (!el) return
                  const posterW = 88 + 12  // 포스터 width + gap
                  el.scrollBy({ left: dir * posterW * 3, behavior: 'smooth' })
                }
                const btnStyle: React.CSSProperties = {
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%', zIndex: 2,
                  border: 'none', cursor: 'pointer',
                  backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 55%, transparent)',
                  backdropFilter: 'blur(8px)',
                  color: 'var(--color-text-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.10)',
                  minHeight: 'auto',
                }
                return (
                  <>
                    <button style={{ ...btnStyle, left: 6 }} onClick={() => scrollBy(-1)}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button style={{ ...btnStyle, right: 6 }} onClick={() => scrollBy(1)}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </>
                )
              })()}

            <div
              ref={posterScrollRef}
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
                touchAction: 'none',
              }}
            >
              {allMoviesLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 88 }}>
                      <Skeleton width={88} height={132} style={{ borderRadius: 6 }} />
                      <Skeleton width={70} height={11} style={{ marginTop: 6, borderRadius: 4 }} />
                      <Skeleton width={50} height={10} style={{ marginTop: 3, borderRadius: 4 }} />
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
                          <div key={movie.id} style={{ flexShrink: 0, width: 88, overflow: 'visible' }}>
                            <div style={{ width: 88 }}>
                              <div style={{ position: 'relative' }}>
                                <PosterThumb
                                  width={88} height={132} size="lg"
                                  src={movie.posterUrl}
                                  selected={selectedMovieId === movie.id}
                                  onClick={unavailable ? undefined : () => { onMovieSelect(movie.id) }}
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
                                      onClick={() => onMovieSelect(movie.id)}
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
                                textDecoration: (showTodayFirst && unavailable) ? 'line-through' : 'none',
                              }}>{movie.title}</div>
                              {movie.director && movie.director.length > 0 && (
                                <div style={{
                                  marginTop: 3, fontSize: 10, color: 'var(--color-text-caption)',
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
                                      marginTop: 3, fontSize: 10, color: 'var(--color-text-caption)',
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
                margin: '8px 8px',
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
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {movie.title}
                    </div>
                    {movie.director && movie.director.length > 0 && (
                      onDirectorOpen ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDirectorOpen(movie.director[0]) }}
                          style={{ fontSize: 12, color: 'var(--color-primary-base)', fontWeight: 500, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' }}
                        >
                          {movie.director[0]}
                        </button>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
                          {movie.director[0]}
                        </div>
                      )
                    )}
                    {movie.runtimeMinutes && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
                        {movie.runtimeMinutes}분
                      </div>
                    )}
                    {movie.genre && movie.genre.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {movie.genre.map(g => (
                          <span key={g} style={{
                            fontSize: 10, fontWeight: 500,
                            padding: '2px 8px',
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width={90} height={60} style={{ borderRadius: 8 }} />
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filteredShowtimes.map((st) => {
                  const hour = parseInt(st.showTime.slice(0, 2), 10)
                  const kind: import('./ShowtimeCell').ShowtimeKind =
                    st.seatAvailable === 0 ? 'soldout'
                    : st.seatAvailable <= st.seatTotal * 0.1 ? 'low'
                    : hour >= 21 ? 'late'
                    : 'normal'
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
                      onClick={kind !== 'soldout' ? () => setSelectedShowtimeId((prev) => prev === st.id ? null : st.id) : undefined}
                    />
                  )
                })}
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
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <button
              onClick={() => setSelectedShowtimeId(null)}
              style={{
                flexShrink: 0,
                width: 44, height: 50,
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-bg)',
                color: 'var(--color-text-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IconClose />
            </button>
            <button
              disabled={!selectedSt?.bookingUrl}
              onClick={() => {
                if (selectedSt?.bookingUrl) window.open(selectedSt.bookingUrl, '_blank', 'noopener')
              }}
              style={{
                flex: 1,
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
