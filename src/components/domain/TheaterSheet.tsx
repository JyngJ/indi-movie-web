'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { PosterThumb } from './PosterThumb'
import { DateBar, type Day, type DayType, type TimeFilter } from './DateBar'
import { ShowtimeCell } from './ShowtimeCell'
import { Button } from '@/components/primitives/Button'
import { Chip } from '@/components/primitives/Chip'
import { Toast } from '@/components/primitives/Toast'
import { useTheaterShowtimes } from '@/lib/supabase/queries'
import type { Theater, Movie, Showtime } from '@/types/api'
import { Skeleton } from '@/components/primitives/Skeleton'

/* ── 상수 ──────────────────────────────────────────────────────── */
// 접힌 상태에서 보이는 높이 = 핸들(20) + 헤더(54) + 포스터스트립(196)
// 접힌 상태에서 보이는 높이 = 핸들(20) + 헤더(56) + 포스터스트립(224, safe area 포함)
const COLLAPSED_H = 300

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

/* ── Props ──────────────────────────────────────────────────────── */
interface TheaterSheetProps {
  theater: Theater
  expanded: boolean
  exiting?: boolean           // true이면 아래로 퇴장 애니메이션
  selectedMovieId: string
  onMovieSelect: (id: string) => void
  onExpand: () => void
  onCollapse: () => void
  onClose: () => void
  favorited?: boolean
  onFavorite?: () => void
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export function TheaterSheet({
  theater,
  expanded,
  exiting = false,
  selectedMovieId,
  onMovieSelect,
  onExpand,
  onCollapse,
  onClose,
  favorited = false,
  onFavorite,
}: TheaterSheetProps) {

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
  // displayedSynopsisId: 현재 화면에 표시 중인 영화 ID (전환 중엔 이전 값 유지)
  const [displayedSynopsisId, setDisplayedSynopsisId] = useState(selectedMovieId)
  const [synopsisVisible, setSynopsisVisible] = useState(false)
  const [synopsisTextOpen] = useState(false)   // reserved for future use
  const synopsisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // expanded 상태 변화: 펼쳐지면 시놉시스 열기, 접히면 닫기
  useEffect(() => {
    if (synopsisTimerRef.current) clearTimeout(synopsisTimerRef.current)
    if (expanded) {
      setDisplayedSynopsisId(selectedMovieId)
      // 약간의 딜레이 후 열기 (시트 펼침 애니메이션과 겹치지 않게)
      synopsisTimerRef.current = setTimeout(() => setSynopsisVisible(true), 180)
    } else {
      setSynopsisVisible(false)
      void synopsisTextOpen   // reserved
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // 영화 전환: 닫기 → 교체 → 열기
  useEffect(() => {
    if (!expanded) {
      setDisplayedSynopsisId(selectedMovieId)
      return
    }
    if (synopsisTimerRef.current) clearTimeout(synopsisTimerRef.current)
    setSynopsisVisible(false)
    synopsisTimerRef.current = setTimeout(() => {
      setDisplayedSynopsisId(selectedMovieId)
      setSynopsisVisible(true)
    }, 340)   // 닫힘 애니메이션(320ms) 끝난 뒤 열기
    return () => {
      if (synopsisTimerRef.current) clearTimeout(synopsisTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovieId])

  /* ── 포스터 축소 진행도 (0 = 풀사이즈, 1 = 미니) — 스크롤에 비례 ── */
  const [posterProgress, setPosterProgress] = useState(0)
  const postersCollapsed = posterProgress > 0.5  // 클릭 판단용 threshold

  // 시트가 접힐 때 포스터 복원
  useEffect(() => {
    if (!expanded) setPosterProgress(0)
  }, [expanded])

  /* ── 날짜 선택 상태 (ISO date 기준) ── */
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedIsoDate, setSelectedIsoDate] = useState(todayIso)

  /* ── Supabase 상영 데이터 ── */
  const { data: showtimeData, isLoading: showtimesLoading } = useTheaterShowtimes(
    theater.id,
    selectedIsoDate,
  )
  const movies: Movie[] = showtimeData?.movies ?? []
  const showtimes: Showtime[] = showtimeData?.showtimes ?? []

  /* ── 영화 바뀌면 selectedMovieId 초기화 ── */
  useEffect(() => {
    if (movies.length > 0 && !movies.find((m) => m.id === selectedMovieId)) {
      onMovieSelect(movies[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies])

  /* ── 날짜 바 — 7일, 상영 있는 날만 활성 ── */
  // 실제로는 해당 영화관의 전체 날짜 범위를 별도 쿼리로 가져오는 게 이상적이나,
  // 현재는 모든 날짜 활성화 (선택 날짜로 쿼리 → 없으면 빈 상태)
  const days = buildDays(7)
  const selectedDate = days.find((d) => d.isoDate === selectedIsoDate)?.date ?? days[0].date

  const [selectedTime, setSelectedTime] = useState<TimeFilter>('전체')

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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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

  /* 확장 시 스크롤 최상단에서 아래로 드래그 → 시트 접기 */
  useEffect(() => {
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
  }, [onCollapse, expanded])   // expanded 바뀔 때 ref 재등록

  /* 포스터 가로 드래그 — native 이벤트 (preventDefault 필요) */
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el) return

    let startY = 0

    const onDown = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      posterDrag.current = { active: false, startX: x, scrollLeft: el.scrollLeft }
      posterTouching.current = true
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!posterTouching.current) return
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      const dx = Math.abs(x - posterDrag.current.startX)
      const dy = y - startY

      // 방향 미확정 상태: 가로/세로 판단
      if (!posterDrag.current.active) {
        if (dx < 6 && Math.abs(dy) < 6) return  // 아직 판단 불가
        if (Math.abs(dy) > dx) {
          // 세로 방향 — 포스터 스크롤 포기, 시트에 맡김
          posterTouching.current = false
          return
        }
        // 가로 방향 확정
        posterDrag.current.active = true
      }

      e.preventDefault()
      el.scrollLeft = posterDrag.current.scrollLeft - (x - posterDrag.current.startX)
    }
    const onUp = () => {
      posterDrag.current.active = false
      posterTouching.current = false
      el.style.cursor = 'grab'
    }
    const onWheel = (e: WheelEvent) => { e.preventDefault() }
    // 시트 컨테이너의 pointerdown → setPointerCapture 를 차단해 mouse 이벤트가 포스터에 유지되게 함
    const onPointerDown = (e: PointerEvent) => { e.stopPropagation() }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('mousedown',  onDown)
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseup',    onUp)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('touchstart', onDown, { passive: false })
    el.addEventListener('touchmove',  onMove, { passive: false })
    el.addEventListener('touchend',   onUp)
    el.addEventListener('wheel',      onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('mousedown',  onDown)
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseup',    onUp)
      el.removeEventListener('mouseleave', onUp)
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onUp)
      el.removeEventListener('wheel',      onWheel)
    }
  }, [])

  /* ── 수직 드래그 (핸들) ─────────────────────────────────────────── */
  // containerRef.clientHeight는 마운트 전 0이라 잘못된 값이 나옴.
  // window.innerHeight * 0.85 = height: 85dvh 와 동일한 값을 직접 계산.
  const getMaxOffset = useCallback(() => {
    return Math.max(0, viewportHeight - COLLAPSED_H)
  }, [viewportHeight])

  const baseTranslate = expanded ? 0 : getMaxOffset()

  const effectiveTranslate = Math.max(
    0,
    Math.min(getMaxOffset(), baseTranslate + dragOffset),
  )

  // 진입: enterDone 전엔 화면 아래 / 퇴장: exiting이면 화면 아래
  const finalTranslate = (!enterDone.current || exiting)
    ? viewportHeight
    : effectiveTranslate

  const handlePointerDown = (e: React.PointerEvent) => {
    // 버튼, 링크, 입력 요소 클릭은 드래그로 처리하지 않음
    if ((e.target as Element).closest('button, a, input, select, textarea')) return
    // expanded 모드: 스크롤 영역 내부 터치는 네이티브 스크롤에 맡김
    // collapsed 모드: 어디서든 드래그 가능
    if (expanded) {
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
    const maxTrans = expanded ? getMaxOffset() : getMaxOffset() + 120
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

    // 포스터 영역 터치 중이었으면 snap 로직 없이 그냥 종료
    if (posterTouching.current) {
      setDragOffset(0)
      velocityBuffer.current = []
      return
    }

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

    let shouldExpand: boolean
    if (expanded) {
      // 현재 펼쳐진 상태: 위로 flick이거나 포지션이 THRESHOLD 미만이면 유지
      shouldExpand = !isFlickDown && posRatio < POSITION_THRESHOLD
    } else {
      // 현재 접힌 상태: 위로 flick이거나 충분히 올렸으면 펼치기
      shouldExpand = isFlickUp || posRatio < (1 - POSITION_THRESHOLD)
    }

    if (shouldExpand && !expanded) onExpand()
    else if (!shouldExpand && expanded) onCollapse()
    else if (!shouldExpand && !expanded) {
      // collapsed 상태에서 아래로 flick하거나 충분히 내리면 닫기
      if (isFlickDown || posRatio > POSITION_THRESHOLD) onClose()
    }

    setDragOffset(0)
    velocityBuffer.current = []
  }

  /* ── 선택 영화 정보 ─────────────────────────────────────────── */
  const selectedMovie = movies.find((m) => m.id === selectedMovieId)

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

  const shareTheater = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?theater=${encodeURIComponent(theater.id)}`
      : ''
    const payload = {
      title: theater.name,
      text: `${theater.name} · ${theater.address}`,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(payload)
        return
      } catch {
        return
      }
    }

    if (navigator.clipboard && shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopyCount(c => c + 1)
    }
  }

  const openInstagram = () => {
    const instagramUrl = (theater as Theater & { instagramUrl?: string }).instagramUrl
    const url = instagramUrl || `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(theater.name)}`
    window.open(url, '_blank', 'noopener')
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
        left: 0, right: 0, bottom: 0,
        height: '100dvh',
        transform: `translateY(${finalTranslate}px)`,
        // 드래그 중엔 transition 없음, 진입/퇴장/snap엔 항상 transition
        transition: (dragging && enterDone.current && !exiting)
          ? 'none'
          : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: effectiveTranslate === 0
          ? '0'
          : 'var(--comp-sheet-radius)',
        boxShadow: 'var(--shadow-sheet)',
        overflow: 'hidden',
        // collapsed 모드: 컨테이너 전체가 드래그 대상이므로 native scroll 차단
        touchAction: expanded ? 'auto' : 'none',
        cursor: dragging ? 'grabbing' : (expanded ? 'auto' : 'grab'),
        userSelect: 'none',
      }}
    >
      {/* ── 드래그 핸들 바 — expanded이면 숨김 ── */}
      <div
        style={{
          padding: expanded ? '4px 0' : '8px 0 6px',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          pointerEvents: 'none',   // 컨테이너가 드래그 처리
        }}
      >
        {!expanded && (
          <div style={{
            width: 'var(--comp-sheet-handle-width)',
            height: 'var(--comp-sheet-handle-height)',
            borderRadius: 'var(--comp-sheet-handle-radius)',
            backgroundColor: 'var(--color-border)',
          }} />
        )}
      </div>

      {/* ── 헤더 — collapsed: 이름+주소+버튼 / expanded: 메뉴바 ── */}
      {!expanded ? (
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
              alignItems: 'flex-start',
              gap: 2,
              paddingRight: 84,
            }}>
              <span style={{ minWidth: 0 }}>{theater.name}</span>
              {theater.website && (
                <button style={{ ...inlineIconBtn, marginTop: 1 }} onClick={openWebsite} aria-label="사이트 보기">
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
            <button style={iconBtn} onClick={onFavorite}>
              <IconStar filled={favorited} />
            </button>
            <button style={iconBtn} onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded 헤더 — 2행: 버튼 행 + 극장 정보 행 */
        <div style={{ flexShrink: 0 }}>
          {/* 1행: < 버튼 / ★ X 버튼 */}
          <div style={{
            padding: '0 12px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <button style={iconBtn} onClick={onCollapse}>
              <IconChevronLeft />
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={iconBtn} onClick={onFavorite}>
                <IconStar filled={favorited} />
              </button>
              <button style={iconBtn} onClick={onClose}>
                <IconClose />
              </button>
            </div>
          </div>
          {/* 2행: 극장 정보 + 액션 버튼 */}
          <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <div style={{
                  fontSize: 23, fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.3px',
                  minWidth: 0,
                }}>
                  {theater.name}
                </div>
                {theater.website && (
                  <button style={{ ...inlineIconBtn, marginTop: 2 }} onClick={openWebsite} aria-label="사이트 보기">
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
          </div>
        </div>
      )}

      {/* ── DateBar — expanded에서만 표시 ─────────────────────── */}
      {expanded && (
        <DateBar
          days={days}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectDate={(date) => {
            const day = days.find((d) => d.date === date)
            if (day) setSelectedIsoDate(day.isoDate)
          }}
          onSelectTime={setSelectedTime}
        />
      )}

      {/* ── 포스터 가로 스크롤 — 항상 표시 (collapsed에서 핵심) ── */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-bg)',
        flexShrink: 0,
        // 스크롤 비례 높이 축소 (228 → 90) — 상단 배지(8px) 여백 포함
        maxHeight: 228 - 138 * posterProgress,
        overflow: 'hidden',
      }}>
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
            cursor: postersCollapsed ? 'pointer' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {showtimesLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 88 }}>
                  <Skeleton width={88} height={132} style={{ borderRadius: 6 }} />
                  <Skeleton width={70} height={11} style={{ marginTop: 6, borderRadius: 4 }} />
                  <Skeleton width={50} height={10} style={{ marginTop: 3, borderRadius: 4 }} />
                </div>
              ))
            : movies.length === 0
              ? (
                  <div style={{ padding: '20px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
                    오늘 상영 정보가 없습니다
                  </div>
                )
              : movies.map((movie) => (
                  <div
                    key={movie.id}
                    style={{
                      flexShrink: 0,
                      width: 88 - 44 * posterProgress,
                      overflow: 'visible',
                    }}
                  >
                    <div style={{
                      width: 88,
                      transformOrigin: 'top left',
                      transform: `scale(${1 - 0.5 * posterProgress})`,
                    }}>
                      <PosterThumb
                        width={88}
                        height={132}
                        size="lg"
                        src={movie.posterUrl}
                        selected={expanded && selectedMovieId === movie.id}
                        onClick={() => {
                          onMovieSelect(movie.id)
                          if (!expanded) onExpand()
                          if (postersCollapsed) {
                            scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                      />
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
                        opacity: Math.max(0, 1 - posterProgress * 2.5),
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
                          opacity: Math.max(0, 1 - posterProgress * 2.5),
                        }}>
                          {movie.director[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))
          }
        </div>
      </div>

      {/* ── 시놉시스 + 상영시간표 — expanded에서 함께 스크롤 ──── */}
      {expanded && (
        <div
          ref={scrollAreaRef}
          style={{ flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch' as never, overscrollBehavior: 'none' }}
          onScroll={(e) => {
            const top = e.currentTarget.scrollTop
            // 스크롤 0→120px 구간에서 0→1로 선형 매핑
            setPosterProgress(Math.min(1, Math.max(0, top / 120)))
          }}
        >
          {/* 시놉시스 아코디언 */}
          {(() => {
            const displayedMovie = movies.find((m) => m.id === displayedSynopsisId)
            return displayedMovie?.synopsis ? (
              <SynopsisCard
                synopsis={displayedMovie.synopsis}
                tags={displayedMovie.genre}
                visible={synopsisVisible}
                onSearchTheaters={() => { /* Phase 3: 영화별 상영관 검색 */ }}
              />
            ) : null
          })()}

          {/* 상영시간표 */}
          <div style={{ padding: '20px 20px 40px' }}>
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
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
