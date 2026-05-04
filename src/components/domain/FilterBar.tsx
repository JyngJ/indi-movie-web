'use client'

import { useState, useRef, useCallback } from 'react'
import { Chip } from '@/components/primitives'

/* ── 마우스 드래그 스크롤 ── */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.pageX - (ref.current?.offsetLeft ?? 0)
    scrollLeft.current = ref.current?.scrollLeft ?? 0
    if (ref.current) ref.current.style.cursor = 'grabbing'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current)
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    if (ref.current) ref.current.style.cursor = ''
  }, [])

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp }
}

/* ── 상수 ── */
const GENRES = [
  '드라마', '멜로/로맨스', '스릴러', '코미디',
  'SF', '판타지', '공포/호러', '액션', '다큐멘터리',
] as const

const DATE_PRESETS = ['오늘', '내일', '이번 주말', '다음 주'] as const
type DatePreset = typeof DATE_PRESETS[number]

/* ── 유틸 ── */
function fmt(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/* ── 타입 ── */
type DateFilter =
  | { type: 'preset'; label: DatePreset }
  | { type: 'custom'; start: Date; end: Date }
  | null

export interface FilterState {
  date: DateFilter
  bookable: boolean
  indie: boolean
  genres: string[]
}

/* ───────────────────────────────────────────
   캘린더
─────────────────────────────────────────── */
function Calendar({ onConfirm, onCancel }: {
  onConfirm: (start: Date, end: Date) => void
  onCancel: () => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [start, setStart] = useState<Date | null>(null)
  const [end, setEnd]     = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()

  const inRange = (d: Date) => {
    const hi = end ?? hover
    if (!start || !hi) return false
    const lo  = start <= hi ? start : hi
    const hiD = start <= hi ? hi    : start
    return d > lo && d < hiD
  }

  const handleDay = (d: Date) => {
    if (!start || (start && end)) {
      setStart(d); setEnd(null)
    } else if (d < start) {
      setEnd(start); setStart(d)
    } else {
      setEnd(d)
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const canConfirm = start !== null && end !== null

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-card)',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      padding: 16,
      margin: '8px 16px 0',
    }}>
      {/* 월 네비 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-caption)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d       = new Date(year, month, i + 1)
          const isStart = start ? sameDay(d, start) : false
          const isEnd   = end   ? sameDay(d, end)   : false
          const rangeIn = inRange(d)
          const isPast  = d < today && !sameDay(d, today)
          const isEdge  = isStart || isEnd

          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => handleDay(d)}
              onMouseEnter={() => { if (!end) setHover(d) }}
              onMouseLeave={() => setHover(null)}
              style={{
                aspectRatio: '1',
                border: 'none',
                borderRadius: '50%',
                cursor: isPast ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: isEdge ? 700 : 400,
                backgroundColor: isEdge
                  ? 'var(--color-primary-base)'
                  : rangeIn ? 'var(--color-primary-subtle-l)' : 'transparent',
                color: isEdge ? '#fff' : isPast ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                minHeight: 'unset',
                padding: 0,
              }}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* 선택 범위 미리보기 */}
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-caption)', margin: '10px 0 4px', minHeight: 20 }}>
        {start ? `${fmt(start)} → ${end ? fmt(end) : '종료일 선택'}` : '시작일을 선택하세요'}
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={onCancel} style={cancelBtn}>취소</button>
        <button
          disabled={!canConfirm}
          onClick={() => start && end && onConfirm(start, end)}
          style={{
            ...confirmBtn,
            opacity: canConfirm ? 1 : 0.4,
            cursor: canConfirm ? 'pointer' : 'default',
          }}
        >
          확인
        </button>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 22, color: 'var(--color-text-body)', padding: '0 14px', minHeight: 'unset',
}
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: 10, borderRadius: 8,
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-raised)',
  cursor: 'pointer', fontSize: 14, color: 'var(--color-text-body)', minHeight: 'unset',
}
const confirmBtn: React.CSSProperties = {
  flex: 1, padding: 10, borderRadius: 8, border: 'none',
  backgroundColor: 'var(--color-primary-base)',
  color: '#fff', fontSize: 14, fontWeight: 600, minHeight: 'unset',
}

/* ───────────────────────────────────────────
   FilterBar
─────────────────────────────────────────── */
interface FilterBarProps {
  onChange?: (state: FilterState) => void
}

export function FilterBar({ onChange: _onChange }: FilterBarProps) {
  const [date,     setDate]     = useState<DateFilter>(null)
  const [bookable, setBookable] = useState(false)
  const [indie,    setIndie]    = useState(false)
  const [genres,   setGenres]   = useState<string[]>([])
  const [panel,    setPanel]    = useState<'date' | 'genre' | 'calendar' | null>(null)
  const mainDrag  = useDragScroll()
  const subDrag   = useDragScroll()

  /* 패널 토글 */
  const toggleDate  = () => setPanel(p => (p === 'date' || p === 'calendar') ? null : 'date')
  const toggleGenre = () => setPanel(p => p === 'genre' ? null : 'genre')

  /* 날짜 */
  const selectPreset = (preset: DatePreset) => {
    setDate({ type: 'preset', label: preset })
    setPanel(null)
  }
  const confirmCustom = (s: Date, e: Date) => {
    setDate({ type: 'custom', start: s, end: e })
    setPanel(null)
  }
  const clearDate = () => { setDate(null); setPanel(null) }

  const clearGenres = () => { setGenres([]); setPanel(null) }

  /* 장르 */
  const toggleGenreItem = (g: string) => {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  /* 라벨 계산 */
  const dateLabel = !date ? null
    : date.type === 'preset' ? date.label
    : `${fmt(date.start)}-${fmt(date.end)}`

  const genreLabel = genres.length === 0 ? null
    : genres.length === 1 ? genres[0]
    : `${genres[0]} 외 ${genres.length - 1}`

  const isDatePanelOpen = panel === 'date' || panel === 'calendar'

  return (
    <div>
      {/* ── 메인 필터 칩 row ── */}
      <div
        ref={mainDrag.ref}
        className="no-scrollbar"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', alignItems: 'center', cursor: 'grab' }}
        onMouseDown={mainDrag.onMouseDown}
        onMouseMove={mainDrag.onMouseMove}
        onMouseUp={mainDrag.onMouseUp}
        onMouseLeave={mainDrag.onMouseLeave}
      >
        {/* 상영 일정 */}
        {dateLabel ? (
          <Chip selected onDismiss={clearDate} onClick={clearDate} style={{ flexShrink: 0 }}>
            {dateLabel}
          </Chip>
        ) : (
          <Chip selected={isDatePanelOpen} onClick={toggleDate} style={{ flexShrink: 0 }}>
            상영 일정
          </Chip>
        )}

        {/* 예매 가능 */}
        <Chip
          selected={bookable}
          onDismiss={bookable ? () => setBookable(false) : undefined}
          onClick={() => setBookable(b => !b)}
          style={{ flexShrink: 0 }}
        >
          예매 가능
        </Chip>

        {/* 독립영화관 */}
        <Chip
          selected={indie}
          onDismiss={indie ? () => setIndie(false) : undefined}
          onClick={() => setIndie(b => !b)}
          style={{ flexShrink: 0 }}
        >
          독립영화관
        </Chip>

        {/* 장르 — TODO: Phase 3 실제 데이터 연결 후 활성화 */}
        {/* <Chip
          selected={genres.length > 0}
          onClick={toggleGenre}
          style={{ flexShrink: 0 }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transform: panel === 'genre' ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          {genreLabel ?? '장르'}
        </Chip> */}
      </div>

      {/* ── 날짜 서브 row ── */}
      {isDatePanelOpen && (
        <div
          ref={subDrag.ref}
          className="no-scrollbar"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 0', alignItems: 'center', cursor: 'grab' }}
          onMouseDown={subDrag.onMouseDown}
          onMouseMove={subDrag.onMouseMove}
          onMouseUp={subDrag.onMouseUp}
          onMouseLeave={subDrag.onMouseLeave}
        >
          {DATE_PRESETS.map(preset => (
            <Chip
              key={preset}
              selected={date?.type === 'preset' && date.label === preset}
              onClick={() => selectPreset(preset)}
              style={{ flexShrink: 0 }}
            >
              {preset}
            </Chip>
          ))}
          <Chip
            selected={panel === 'calendar' || date?.type === 'custom'}
            onClick={() => setPanel('calendar')}
            style={{ flexShrink: 0 }}
          >
            다른 일정
          </Chip>
        </div>
      )}

      {/* ── 장르 서브 row ── */}
      {/* 장르 서브 row — TODO: Phase 3 활성화 시 주석 해제
      {panel === 'genre' && (
        <div
          ref={subDrag.ref}
          className="no-scrollbar"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 0', alignItems: 'center', cursor: 'grab' }}
          onMouseDown={subDrag.onMouseDown}
          onMouseMove={subDrag.onMouseMove}
          onMouseUp={subDrag.onMouseUp}
          onMouseLeave={subDrag.onMouseLeave}
        >
          {GENRES.map(g => (
            <Chip
              key={g}
              selected={genres.includes(g)}
              onDismiss={genres.includes(g) ? () => toggleGenreItem(g) : undefined}
              onClick={() => toggleGenreItem(g)}
              style={{ flexShrink: 0 }}
            >
              {g}
            </Chip>
          ))}
        </div>
      )} */}

      {/* ── 캘린더 ── */}
      {panel === 'calendar' && (
        <Calendar
          onConfirm={confirmCustom}
          onCancel={() => setPanel('date')}
        />
      )}

    </div>
  )
}
