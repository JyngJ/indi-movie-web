'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { PosterThumb } from './PosterThumb'
import { DateBar, type Day, type DayType, type TimeFilter } from './DateBar'
import { ShowtimeCell } from './ShowtimeCell'
import { MOCK_MOVIES } from '@/mocks/movies'
import { MOCK_SHOWTIMES } from '@/mocks/showtimes'
import type { MockTheater } from '@/mocks/theaters'

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

/* ── 시놉시스 카드 ──────────────────────────────────────────────── */
function SynopsisCard({ synopsis }: { synopsis: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      margin: '0',
      padding: '16px 20px',
      backgroundColor: 'var(--color-neutral-800)',   /* #2E2A25 */
      flexShrink: 0,
    }}>
      <p style={{
        margin: 0,
        fontSize: 13,
        lineHeight: 1.65,
        color: 'var(--color-neutral-200)',            /* #DDD9CF */
        overflow: open ? 'visible' : 'hidden',
        display: open ? 'block' : '-webkit-box',
        WebkitLineClamp: open ? undefined : 3,
        WebkitBoxOrient: 'vertical' as const,
      }}>
        {synopsis}
      </p>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          marginTop: 8,
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-neutral-400)',          /* #A9A39A */
          letterSpacing: '0.2px',
        }}
      >
        {open ? '접기' : '자세히'}
      </button>
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

    return { dow, date, type, disabled }
  })
}

/* ── Props ──────────────────────────────────────────────────────── */
interface TheaterSheetProps {
  theater: MockTheater
  expanded: boolean
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
  selectedMovieId,
  onMovieSelect,
  onExpand,
  onCollapse,
  onClose,
  favorited = false,
  onFavorite,
}: TheaterSheetProps) {

  /* ── 날짜 / 필터 상태 ── */
  // 선택된 영화의 상영 날짜 Set 계산 (목업: movieId의 홀짝으로 날짜 분배)
  // 실제 데이터 연결 시 API 응답의 show_date Set으로 교체
  const availableDates = useMemo<Set<string>>(() => {
    const today = new Date()
    const set = new Set<string>()
    // 목업: m1/m3/m5(홀수) → 오늘·내일·3일후·5일후 / m2/m4/m6(짝수) → 오늘·2일후·4일후·6일후
    const movieIndex = MOCK_MOVIES.findIndex((m) => m.id === selectedMovieId)
    const offsets = movieIndex % 2 === 0 ? [0, 1, 3, 5] : [0, 2, 4, 6]
    offsets.forEach((n) => {
      const d = new Date(today)
      d.setDate(today.getDate() + n)
      set.add(d.toISOString().slice(0, 10))
    })
    return set
  }, [selectedMovieId])

  const days = buildDays(7, availableDates)

  const [selectedDate, setSelectedDate] = useState(days[0].date)

  // 영화 바뀌면: 현재 선택일이 available이면 유지, disabled면 가장 가까운 날로 이동
  useEffect(() => {
    const currentIdx = days.findIndex((d) => d.date === selectedDate)
    if (currentIdx !== -1 && !days[currentIdx].disabled) return  // 그대로 유지

    // 현재 선택일이 disabled → 가장 가까운 available 날짜 탐색 (양방향)
    const availableIndices = days
      .map((d, i) => ({ i, disabled: d.disabled }))
      .filter((x) => !x.disabled)
      .map((x) => x.i)

    if (availableIndices.length === 0) return

    // 현재 인덱스 기준으로 거리 가장 짧은 것 선택
    const base = currentIdx === -1 ? 0 : currentIdx
    const nearest = availableIndices.reduce((best, idx) =>
      Math.abs(idx - base) < Math.abs(best - base) ? idx : best
    )
    setSelectedDate(days[nearest].date)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovieId])

  const [selectedTime, setSelectedTime] = useState<TimeFilter>('전체')

  /* ── 드래그 상태 ── */
  const containerRef    = useRef<HTMLDivElement>(null)
  const dragActive      = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartOffset = useRef(0)   // 드래그 시작 시점의 translateY
  const [dragOffset, setDragOffset] = useState(0)   // 현재 드래그 delta
  const [dragging, setDragging]     = useState(false)

  // 속도 계산용 — 최근 이벤트 (timestamp, y) 를 최대 5개 보관
  const velocityBuffer = useRef<Array<{ t: number; y: number }>>([])
  const VELOCITY_THRESHOLD = 500   // px/s 이상이면 flick으로 간주
  const POSITION_THRESHOLD = 0.25  // 전체 이동 거리의 25% 이상이면 snap

  /* ── 포스터 스크롤 드래그 ── */
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const posterDrag      = useRef({ active: false, startX: 0, scrollLeft: 0 })

  /* Leaflet 이벤트 차단 — 시트 영역에서 map 이벤트가 발동되지 않게 */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    // pointerdown은 제외 — 포함하면 React의 onPointerDown(드래그 핸들)까지 차단됨
    el.addEventListener('wheel',      stop, { passive: false })
    el.addEventListener('mousedown',  stop)
    el.addEventListener('touchstart', stop, { passive: false })
    return () => {
      el.removeEventListener('wheel',      stop)
      el.removeEventListener('mousedown',  stop)
      el.removeEventListener('touchstart', stop)
    }
  }, [])

  /* 포스터 가로 드래그 — native 이벤트 (preventDefault 필요) */
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el) return

    const onDown = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      posterDrag.current = { active: true, startX: x, scrollLeft: el.scrollLeft }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!posterDrag.current.active) return
      e.preventDefault()
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      el.scrollLeft = posterDrag.current.scrollLeft - (x - posterDrag.current.startX)
    }
    const onUp = () => { posterDrag.current.active = false; el.style.cursor = 'grab' }
    const onWheel = (e: WheelEvent) => { e.preventDefault() }

    el.addEventListener('mousedown',  onDown)
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseup',    onUp)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('touchstart', onDown, { passive: false })
    el.addEventListener('touchmove',  onMove, { passive: false })
    el.addEventListener('touchend',   onUp)
    el.addEventListener('wheel',      onWheel, { passive: false })
    return () => {
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
    return Math.max(0, window.innerHeight - COLLAPSED_H)
  }, [])

  const baseTranslate = expanded ? 0 : getMaxOffset()

  const effectiveTranslate = Math.max(
    0,
    Math.min(getMaxOffset(), baseTranslate + dragOffset),
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragActive.current      = true
    dragStartY.current      = e.clientY
    dragStartOffset.current = effectiveTranslate
    velocityBuffer.current  = [{ t: e.timeStamp, y: e.clientY }]
    setDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    const delta    = e.clientY - dragStartY.current
    const newTrans = Math.max(0, Math.min(getMaxOffset(), dragStartOffset.current + delta))
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

    setDragOffset(0)
    velocityBuffer.current = []
  }

  /* ── 선택 영화 정보 ─────────────────────────────────────────── */
  const selectedMovie = MOCK_MOVIES.find((m) => m.id === selectedMovieId)

  /* ── 상영시간 필터링 ─────────────────────────────────────────── */
  const showtimes = MOCK_SHOWTIMES.filter((s) => s.movieId === selectedMovieId)

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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: '100dvh',
        transform: `translateY(${effectiveTranslate}px)`,
        transition: dragging
          ? 'none'
          : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-raised)',
        // expanded(= translateY 0)이면 화면 꽉 채움 → 상단 radius 제거
        borderRadius: effectiveTranslate === 0
          ? '0'
          : 'var(--comp-sheet-radius) var(--comp-sheet-radius) 0 0',
        boxShadow: 'var(--shadow-sheet)',
        overflow: 'hidden',
      }}
    >
      {/* ── 드래그 핸들 — expanded(화면 꽉 참)이면 핸들 바 숨김 ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e)}
        onPointerCancel={(e) => handlePointerUp(e)}
        style={{
          padding: expanded ? '4px 0' : '8px 0 6px',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
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
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              letterSpacing: '-0.2px',
            }}>
              {theater.name}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--color-text-sub)',
              marginTop: 4,
            }}>
              {theater.address}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
          {/* 2행: 극장 정보 */}
          <div style={{ padding: '7px 20px 12px' }}>
            <div style={{
              fontSize: 22, fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              letterSpacing: '-0.3px',
            }}>
              {theater.name}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--color-text-sub)',
              marginTop: 5,
            }}>
              {theater.address}
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
          onSelectDate={setSelectedDate}
          onSelectTime={setSelectedTime}
        />
      )}

      {/* ── 포스터 가로 스크롤 — 항상 표시 (collapsed에서 핵심) ── */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-bg)',
        flexShrink: 0,
      }}>
        <div
          ref={posterScrollRef}
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingTop: 14,
            paddingLeft: 20,
            paddingRight: 20,
            // collapsed 상태에서 포스터 하단이 홈 인디케이터 위에 오도록
            paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
            scrollbarWidth: 'none',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {MOCK_MOVIES.map((movie) => (
            <div
              key={movie.id}
              style={{ flexShrink: 0, width: 88 }}
            >
              <PosterThumb
                width={88}
                height={132}
                size="lg"
                selected={expanded && selectedMovieId === movie.id}
                onClick={() => {
                  onMovieSelect(movie.id)
                  if (!expanded) onExpand()
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
              }}>
                {movie.title}
              </div>
              {movie.director && (
                <div style={{
                  marginTop: 3,
                  fontSize: 10,
                  color: 'var(--color-text-caption)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {movie.director}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 시놉시스 — expanded에서만 ───────────────────────────── */}
      {expanded && selectedMovie?.synopsis && (
        <SynopsisCard
          synopsis={selectedMovie.synopsis}
          key={selectedMovieId}   // 영화 바뀌면 접힘 상태 초기화
        />
      )}

      {/* ── 상영시간표 — expanded에서만, 스크롤 가능 ──────────── */}
      {expanded && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
          {showtimes.length === 0 ? (
            <div style={{
              paddingTop: 32,
              textAlign: 'center',
              color: 'var(--color-text-caption)',
              fontSize: 13,
            }}>
              선택한 날짜에 상영 정보가 없습니다.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              {showtimes.map((st) => (
                <ShowtimeCell
                  key={st.id}
                  startTime={st.startTime}
                  endTime={st.endTime}
                  seatAvailable={st.seatAvailable}
                  seatTotal={st.seatTotal}
                  screenName={st.screenName}
                  kind={st.kind}
                  promo={st.promo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
