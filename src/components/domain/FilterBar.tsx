'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import { GENRES } from '@/lib/genres'
import { withFlag } from '@/lib/nations'
import { REGIONS } from '@/lib/regions'

/* -- 날짜 헬퍼 ---------------------------------------------------- */
const DOW = ['일', '월', '화', '수', '목', '금', '토']

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function fmtFull(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`
}
function fmtShortDow(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} ${DOW[d.getDay()]}`
}
function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function buildDateOptions(t = today()) {
  const dow = t.getDay()
  const daysToSat = dow === 0 ? 6 : 6 - dow
  const sat0 = addDays(t, daysToSat)
  const sun0 = addDays(sat0, 1)
  const sat1 = addDays(sat0, 7)
  const sun1 = addDays(sat1, 1)
  const weekEnd = dow === 0 ? addDays(t, 6) : addDays(t, 7 - dow)

  return [
    { id: 'today', label: '오늘', sub: fmtFull(t) },
    { id: 'tomorrow', label: '내일', sub: fmtFull(addDays(t, 1)) },
    { id: 'this-weekend', label: '이번 주말', sub: `${fmtShortDow(sat0)} - ${fmtShortDow(sun0)}` },
    { id: 'next-weekend', label: '다음 주말', sub: `${fmtShortDow(sat1)} - ${fmtShortDow(sun1)}` },
    { id: 'this-week', label: '일주일간', sub: `${fmtMD(t)} - ${fmtMD(addDays(t, 6))}` },
    { id: 'this-month', label: '이번 달', sub: `${t.getMonth() + 1}월 전체` },
  ] as const
}

type DateId = 'today' | 'tomorrow' | 'this-weekend' | 'next-weekend' | 'this-week' | 'this-month' | 'custom' | null
type OpenPanel = 'date' | 'genre' | 'nation' | 'region' | 'calendar' | null

const EMPTY_NATION_OPTIONS: string[] = []

/* -- 타입 -------------------------------------------------------- */
export interface FilterState {
  dateId: DateId
  customStart: Date | null
  customEnd: Date | null
  genres: string[]
  nations: string[]
  bookable: boolean
  indie: boolean
  regionId: string | null
}

/* -- 아이콘 ------------------------------------------------------- */
const IcoCheck = () => (
  <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
    <polyline points="2,6.5 4.5,9 10,3" stroke="white" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IcoChevron = ({ open }: { open: boolean }) => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IcoClose = ({ color = 'var(--color-text-sub)' }: { color?: string }) => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.5} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const IcoCalendar = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

const IcoArrowRight = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const IcoNavPrev = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const IcoNavNext = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

/* -- DropdownRow -------------------------------------------------- */
interface DropdownRowProps {
  kind: 'radio' | 'checkbox'
  label: string
  sub?: string
  selected: boolean
  onClick: () => void
  isLast?: boolean
}

function DropdownRow({ kind, label, sub, selected, onClick, isLast }: DropdownRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: sub ? 'flex-start' : 'center',
        gap: 12,
        padding: '12px 14px',
        width: '100%',
        background: selected ? 'rgba(74,99,128,0.13)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 'unset',
      }}
    >
      <div style={{
        width: 22, height: 22, flexShrink: 0,
        borderRadius: kind === 'radio' ? '50%' : 5,
        background: selected ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
        border: selected ? 'none' : '1px solid var(--filter-indicator-bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: sub ? 1 : 0,
        transition: 'background 150ms',
      }}>
        {selected && <IcoCheck />}
      </div>
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: selected ? 600 : 500,
          color: selected ? 'var(--filter-row-label-sel)' : 'var(--color-text-body)',
          lineHeight: 1.3,
        }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--color-text-caption)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  )
}

/* -- CalendarPicker (범위 선택) ----------------------------------- */
function CalendarPicker({ startDate, endDate, onApply, onCancel, style }: {
  startDate: Date | null
  endDate: Date | null
  onApply: (start: Date, end: Date) => void
  onCancel: () => void
  style?: React.CSSProperties
}) {
  const todayDate = today()
  const [rangeStart, setRangeStart] = useState<Date | null>(startDate)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(endDate)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [viewMonth, setViewMonth] = useState(() => {
    const base = startDate ?? todayDate
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const previewEnd = rangeStart && !rangeEnd && hovered ? hovered : rangeEnd
  const lo = rangeStart && previewEnd ? (rangeStart <= previewEnd ? rangeStart : previewEnd) : rangeStart
  const hi = rangeStart && previewEnd ? (rangeStart <= previewEnd ? previewEnd : rangeStart) : null
  const canApply = !!rangeStart && !!rangeEnd
  const hint = !rangeStart ? '시작일을 선택하세요'
    : !rangeEnd ? '종료일을 선택하세요'
    : `${fmtMD(rangeStart)} (${DOW[rangeStart.getDay()]}) - ${fmtMD(rangeEnd)} (${DOW[rangeEnd.getDay()]})`

  function handleDayClick(d: Date) {
    if (d < todayDate) return
    if (!rangeStart || rangeEnd) {
      setRangeStart(d)
      setRangeEnd(null)
      return
    }
    const [s, e] = d >= rangeStart ? [rangeStart, d] : [d, rangeStart]
    setRangeStart(s)
    setRangeEnd(e)
  }

  const navBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    background: 'transparent', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--color-text-body)', minHeight: 'unset',
  }

  return (
    <div style={{
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      ...style,
    }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button style={navBtn} onClick={() => setViewMonth(new Date(year, month - 1, 1))}>
            <IcoNavPrev />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {year}년 {month + 1}월
          </span>
          <button style={navBtn} onClick={() => setViewMonth(new Date(year, month + 1, 1))}>
            <IcoNavNext />
          </button>
        </div>
        <div style={{
          textAlign: 'center', fontSize: 13,
          color: rangeStart && !rangeEnd ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
          marginBottom: 12, fontWeight: rangeStart && !rangeEnd ? 600 : 400,
          minHeight: 18,
        }}>
          {hint}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DOW.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 600,
              color: i === 0 ? '#E30613' : i === 6 ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              padding: '3px 0',
            }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} style={{ height: 38 }} />

            const cellDate = new Date(year, month, day)
            const isPast = cellDate < todayDate
            const isToday = isSameDay(cellDate, todayDate)
            const isStart = !!rangeStart && isSameDay(cellDate, rangeStart)
            const isEnd = !!rangeEnd && isSameDay(cellDate, rangeEnd)
            const isEndPreview = !rangeEnd && !!hovered && !!rangeStart
              && isSameDay(cellDate, hovered >= rangeStart ? hovered : rangeStart)
            const isStartPreview = !rangeEnd && !!hovered && !!rangeStart
              && hovered < rangeStart && isSameDay(cellDate, rangeStart)
            const inRange = !!lo && !!hi && cellDate > lo && cellDate < hi
            const colIdx = (firstDow + day - 1) % 7
            const isSun = colIdx === 0
            const isSat = colIdx === 6
            const barActive = isStart || isEnd || isStartPreview || isEndPreview || inRange
            const isRangeStart = isStart || isStartPreview
            const isRangeEnd = isEnd || isEndPreview
            const isDot = isStart || isEnd || isStartPreview || isEndPreview

            let textColor = 'var(--color-text-body)'
            if (isPast) textColor = 'var(--color-text-placeholder)'
            else if (isSun) textColor = '#E30613'
            else if (isSat) textColor = 'var(--color-primary-base)'
            if (isDot) textColor = '#fff'

            return (
              <div
                key={i}
                onMouseEnter={() => !isPast && setHovered(cellDate)}
                onMouseLeave={() => setHovered(null)}
                style={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {barActive && (
                  <div style={{
                    position: 'absolute', top: 4, bottom: 4,
                    left: isRangeStart ? '50%' : 0,
                    right: isRangeEnd ? '50%' : 0,
                    background: 'var(--color-primary-subtle-l)',
                    pointerEvents: 'none',
                  }} />
                )}
                <button
                  disabled={isPast}
                  onClick={() => handleDayClick(cellDate)}
                  style={{
                    position: 'relative', zIndex: 1,
                    width: 34, height: 34, borderRadius: '50%',
                    background: isDot ? 'var(--color-primary-base)' : 'transparent',
                    color: textColor,
                    fontWeight: isDot ? 700 : isToday ? 700 : 400,
                    fontSize: 14,
                    border: isToday && !isDot ? '1.5px solid var(--color-primary-base)' : 'none',
                    cursor: isPast ? 'default' : 'pointer',
                    minHeight: 'unset', flexShrink: 0,
                    transition: 'background 100ms',
                  }}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 8,
        padding: '12px 14px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-raised)',
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, height: 40, borderRadius: 999,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            fontSize: 14, fontWeight: 500,
            color: 'var(--color-text-body)',
            cursor: 'pointer', minHeight: 'unset',
          }}
        >
          취소
        </button>
        <button
          disabled={!canApply}
          onClick={() => canApply && onApply(rangeStart!, rangeEnd!)}
          style={{
            flex: 2, height: 40, borderRadius: 999,
            background: canApply ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
            border: canApply ? 'none' : '1px solid var(--color-border)',
            fontSize: 14, fontWeight: 600,
            color: canApply ? '#fff' : 'var(--color-text-placeholder)',
            cursor: canApply ? 'pointer' : 'default',
            transition: 'background 150ms, color 150ms',
            minHeight: 'unset',
          }}
        >
          적용
        </button>
      </div>
    </div>
  )
}

/* -- DateDropdown ------------------------------------------------- */
function DateDropdown({ selectedId, onSelect, onPickCustom, style }: {
  selectedId: DateId
  onSelect: (id: DateId) => void
  onPickCustom: () => void
  style?: React.CSSProperties
}) {
  const options = buildDateOptions()
  return (
    <div style={{
      width: 252,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      ...style,
    }}>
      {options.map((opt) => (
        <DropdownRow
          key={opt.id}
          kind="radio"
          label={opt.label}
          sub={opt.sub}
          selected={selectedId === opt.id}
          onClick={() => onSelect(opt.id as DateId)}
          isLast={false}
        />
      ))}
      <button
        onClick={onPickCustom}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 14px', width: '100%',
          background: 'var(--color-surface-raised)',
          border: 'none', borderTop: '1px solid var(--color-border)',
          cursor: 'pointer', minHeight: 'unset',
          color: 'var(--color-text-body)',
        }}
      >
        <IcoCalendar />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, textAlign: 'left' }}>
          날짜 직접 선택
        </span>
        <IcoArrowRight />
      </button>
    </div>
  )
}

/* -- MultiSelectDropdown ----------------------------------------- */
function MultiSelectDropdown({ options, selectedValues, setSelectedValues, style }: {
  options: readonly string[]
  selectedValues: string[]
  setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>
  style?: React.CSSProperties
}) {
  const toggle = (value: string) =>
    setSelectedValues(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])

  return (
    <div style={{
      width: 236,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 320,
      ...style,
    }}>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {options.map((option, i) => (
          <DropdownRow
            key={option}
            kind="checkbox"
            label={option}
            selected={selectedValues.includes(option)}
            onClick={() => toggle(option)}
            isLast={i === options.length - 1}
          />
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border)',
        minHeight: 40,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
          {selectedValues.length > 0 ? `${selectedValues.length}개 선택됨` : ''}
        </span>
        {selectedValues.length > 0 && (
          <button
            onClick={() => setSelectedValues([])}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 500, color: 'var(--color-primary-base)',
              cursor: 'pointer', minHeight: 'unset',
            }}
          >
            모두 선택 해제
          </button>
        )}
      </div>
    </div>
  )
}

/* -- RegionDropdown ----------------------------------------------- */
function RegionDropdown({ selectedId, onSelect, style }: {
  selectedId: string | null
  onSelect: (id: string | null) => void
  style?: React.CSSProperties
}) {
  const METRO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
  const PROVINCES = REGIONS.filter(r => !METRO.includes(r.id))
  const metros = REGIONS.filter(r => METRO.includes(r.id))

  return (
    <div style={{
      width: 220,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      maxHeight: 'min(420px, 70vh)',
      overflowY: 'auto',
      ...style,
    }}>
      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px' }}>
        광역시
      </div>
      {metros.map((r, i) => (
        <DropdownRow
          key={r.id}
          kind="radio"
          label={r.label}
          selected={selectedId === r.id}
          onClick={() => onSelect(selectedId === r.id ? null : r.id)}
          isLast={false}
        />
      ))}
      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px', borderTop: '1px solid var(--color-border)' }}>
        도·특별자치도
      </div>
      {PROVINCES.map((r, i) => (
        <DropdownRow
          key={r.id}
          kind="radio"
          label={r.label}
          selected={selectedId === r.id}
          onClick={() => onSelect(selectedId === r.id ? null : r.id)}
          isLast={i === PROVINCES.length - 1}
        />
      ))}
    </div>
  )
}

/* -- FilterChip --------------------------------------------------- */
interface FilterChipProps {
  label: string
  value?: string
  open?: boolean
  selected?: boolean
  hasDropdown?: boolean
  onClick: () => void
  onClear?: () => void
  chipRef?: React.Ref<HTMLButtonElement>
  separator?: string
}

function FilterChip({ label, value, open, selected, hasDropdown, onClick, onClear, chipRef, separator = '·' }: FilterChipProps) {
  let bg = 'var(--color-surface-card)'
  let border = '1px solid var(--color-border)'
  let pl = '14px'
  let pr = hasDropdown ? '10px' : '14px'

  if (open && !selected) {
    bg = 'var(--color-primary-subtle-l)'
    border = '1.5px solid var(--color-primary-hover-l)'
  } else if (selected) {
    bg = 'var(--color-primary-subtle-l)'
    border = '1.5px solid var(--color-primary-base)'
    if (onClear) pr = '6px'
  }

  return (
    <button
      ref={chipRef}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        height: 36, paddingLeft: pl, paddingRight: pr,
        borderRadius: 999, background: bg, border,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        gap: 4, minHeight: 'unset',
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      {selected && value ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-sub)' }}>
            {label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>&nbsp;{separator}&nbsp;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--filter-chip-value)' }}>
            {value}
          </span>
        </>
      ) : (
        <span style={{
          fontSize: 13,
          fontWeight: open ? 600 : 500,
          color: open ? 'var(--filter-chip-open-text)' : 'var(--color-text-body)',
        }}>
          {label}
        </span>
      )}
      {selected && onClear ? (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{
            width: 20, height: 20, minWidth: 20, minHeight: 20,
            borderRadius: '50%',
            background: 'var(--filter-dismiss-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginLeft: 4, flexShrink: 0,
          }}
        >
          <IcoClose />
        </span>
      ) : hasDropdown ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', marginLeft: 2, flexShrink: 0,
          color: open ? 'var(--filter-chip-open-caret)' : 'var(--color-text-caption)',
        }}>
          <IcoChevron open={!!open} />
        </span>
      ) : null}
    </button>
  )
}

/* -- FilterBar ---------------------------------------------------- */
export interface FilterBarProps {
  onChange?: (state: FilterState) => void
  /** 사용자가 칩을 직접 조작했을 때만 호출 — 초기 mount sync에는 호출 안 됨 */
  onChipChange?: (state: FilterState) => void
  nationOptions?: string[]
  movieFilter?: { id: string; title: string } | null
  directorFilter?: { name: string } | null
  onMovieFilterClear?: () => void
  onDirectorFilterClear?: () => void
  onMovieChipClick?: () => void
  onDirectorChipClick?: () => void
  desktop?: boolean
  defaultRegionId?: string | null
}

export function FilterBar({
  onChange,
  onChipChange,
  nationOptions = EMPTY_NATION_OPTIONS,
  movieFilter,
  directorFilter,
  onMovieFilterClear,
  onDirectorFilterClear,
  onMovieChipClick,
  onDirectorChipClick,
  desktop = false,
  defaultRegionId,
}: FilterBarProps) {
  const [dateId, setDateId] = useState<DateId>('this-week')
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [draftGenres, setDraftGenres] = useState<string[]>([])
  const [nations, setNations] = useState<string[]>([])
  const [draftNations, setDraftNations] = useState<string[]>([])
  const [bookable, setBookable] = useState(false)
  const [indie, setIndie] = useState(false)
  const [regionId, setRegionId] = useState<string | null>(null)
  const autoRegionSetRef = useRef(false)
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number }>({ left: 16, top: 0 })
  const [mounted, setMounted] = useState(false)
  const [regionHintDismissed, setRegionHintDismissed] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const portalDropdownRef = useRef<HTMLDivElement>(null)
  const chipRowRef = useRef<HTMLDivElement>(null)
  const dateChipRef = useRef<HTMLButtonElement>(null)
  const genreChipRef = useRef<HTMLButtonElement>(null)
  const nationChipRef = useRef<HTMLButtonElement>(null)
  const regionChipRef = useRef<HTMLButtonElement>(null)
  const openPanelRef = useRef(openPanel)
  const draftGenresRef = useRef(draftGenres)
  const draftNationsRef = useRef(draftNations)
  const scrollFrameRef = useRef<number | null>(null)
  const chipDragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 })
  const [chipRowDragging, setChipRowDragging] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (sessionStorage.getItem('yh_region_tip') === 'closed') setRegionHintDismissed(true)
  }, [])
  useEffect(() => { openPanelRef.current = openPanel }, [openPanel])
  useEffect(() => { draftGenresRef.current = draftGenres }, [draftGenres])
  useEffect(() => { draftNationsRef.current = draftNations }, [draftNations])
  useEffect(() => {
    if (nationOptions.length === 0) {
      setNations((current) => current.length === 0 ? current : [])
      setDraftNations((current) => current.length === 0 ? current : [])
      return
    }
    const optionSet = new Set(nationOptions)
    setNations((current) => {
      const next = current.filter((nation) => optionSet.has(nation))
      return next.length === current.length ? current : next
    })
    setDraftNations((current) => {
      const next = current.filter((nation) => optionSet.has(nation))
      return next.length === current.length ? current : next
    })
  }, [nationOptions])
  useEffect(() => {
    onChange?.({ dateId, customStart, customEnd, genres, nations, bookable, indie, regionId })
  }, [onChange, dateId, customStart, customEnd, genres, nations, bookable, indie, regionId])

  useEffect(() => {
    if (autoRegionSetRef.current) return
    if (!defaultRegionId) return
    autoRegionSetRef.current = true
    setRegionId(defaultRegionId)
  }, [defaultRegionId])

  useEffect(() => {
    if (!openPanel) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return
      if (portalDropdownRef.current?.contains(e.target as Node)) return
      if (openPanelRef.current === 'genre') { setGenres(draftGenresRef.current); chip({ genres: draftGenresRef.current }) }
      if (openPanelRef.current === 'nation') { setNations(draftNationsRef.current); chip({ nations: draftNationsRef.current }) }
      setOpenPanel(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPanel]) // eslint-disable-line react-hooks/exhaustive-deps

  const calcDropdownLeft = (
    chipRef: React.RefObject<HTMLButtonElement | null>,
    dropdownWidth: number,
  ) => {
    const chip = chipRef.current
    if (chip) {
      const cRect = chip.getBoundingClientRect()
      // 화면 오른쪽 넘치면 왼쪽으로 당김
      const left = Math.min(cRect.left, window.innerWidth - dropdownWidth - 8)
      const top = cRect.bottom + 8
      setDropdownPos({ left: Math.max(8, left), top })
    }
  }

  const syncOpenDropdownPosition = useCallback(() => {
    const panel = openPanelRef.current
    if (!panel || panel === 'calendar') return
    if (panel === 'date') calcDropdownLeft(dateChipRef, 252)
    else if (panel === 'genre') calcDropdownLeft(genreChipRef, 236)
    else if (panel === 'nation') calcDropdownLeft(nationChipRef, 236)
    else if (panel === 'region') calcDropdownLeft(regionChipRef, 220)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChipRowScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      syncOpenDropdownPosition()
    })
  }, [syncOpenDropdownPosition])

  const handleChipRowMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const row = chipRowRef.current
    if (!row || row.scrollWidth <= row.clientWidth) return
    chipDragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: row.scrollLeft,
    }
    setChipRowDragging(true)
  }, [])

  const handleChipRowMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const row = chipRowRef.current
    const drag = chipDragRef.current
    if (!row || !drag.active) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 4) drag.moved = true
    if (drag.moved) {
      row.scrollLeft = drag.scrollLeft - dx
      e.preventDefault()
    }
  }, [])

  const stopChipRowDrag = useCallback(() => {
    chipDragRef.current.active = false
    setChipRowDragging(false)
  }, [])

  const handleChipRowClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!chipDragRef.current.moved) return
    chipDragRef.current.moved = false
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleChipRowWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    const row = chipRowRef.current
    if (!row || row.scrollWidth <= row.clientWidth) return
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    row.scrollLeft += e.deltaY
    e.preventDefault()
  }, [])

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  const openDropdown = useCallback((
    panel: 'date' | 'genre' | 'nation' | 'region',
    chipRef: React.RefObject<HTMLButtonElement | null>,
  ) => {
    if (openPanel === panel || (panel === 'date' && (openPanel === 'date' || openPanel === 'calendar'))) {
      if (panel === 'genre') { setGenres(draftGenresRef.current); chip({ genres: draftGenresRef.current }) }
      if (panel === 'nation') { setNations(draftNationsRef.current); chip({ nations: draftNationsRef.current }) }
      setOpenPanel(null)
      return
    }
    if (panel === 'genre') setDraftGenres(genres)
    if (panel === 'nation') setDraftNations(nations)
    const widthMap = { date: 252, genre: 236, nation: 236, region: 220 }
    calcDropdownLeft(chipRef, widthMap[panel])
    setOpenPanel(panel)
  }, [openPanel, genres, nations])

  const chip = (overrides: Partial<FilterState>) =>
    onChipChange?.({ dateId, customStart, customEnd, genres, nations, bookable, indie, regionId, ...overrides })

  const selectDate = (id: DateId) => { setDateId(id); setOpenPanel(null); chip({ dateId: id }) }
  const clearDate = () => {
    setDateId(null); setCustomStart(null); setCustomEnd(null); setOpenPanel(null)
    chip({ dateId: null, customStart: null, customEnd: null })
  }
  const openCalendar = () => setOpenPanel('calendar')
  const selectCustomRange = (start: Date, end: Date) => {
    setDateId('custom'); setCustomStart(start); setCustomEnd(end); setOpenPanel(null)
    chip({ dateId: 'custom', customStart: start, customEnd: end })
  }
  const clearGenres = () => {
    setGenres([]); setDraftGenres([]); setOpenPanel(null)
    chip({ genres: [] })
  }
  const clearNations = () => {
    setNations([]); setDraftNations([]); setOpenPanel(null)
    chip({ nations: [] })
  }

  const dateOptions = buildDateOptions()
  const dateLabel = (() => {
    if (dateId === 'custom') {
      if (customStart && customEnd) {
        return isSameDay(customStart, customEnd)
          ? fmtFull(customStart)
          : `${fmtMD(customStart)} - ${fmtMD(customEnd)}`
      }
      return customStart ? `${fmtMD(customStart)}~` : undefined
    }
    return dateOptions.find(o => o.id === dateId)?.label
  })()

  const genreLabel = genres.length === 0 ? undefined
    : genres.length === 1 ? genres[0]
    : `${genres[0]} 외 ${genres.length - 1}`
  const nationLabel = nations.length === 0 ? undefined
    : nations.length === 1 ? withFlag(nations[0])
    : `${withFlag(nations[0])} 외 ${nations.length - 1}`
  const isDateOpen = openPanel === 'date' || openPanel === 'calendar'

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'visible',
      }}
    >
      <div
        ref={chipRowRef}
        className="no-scrollbar"
        onScroll={handleChipRowScroll}
        onMouseDown={handleChipRowMouseDown}
        onMouseMove={handleChipRowMouseMove}
        onMouseUp={stopChipRowDrag}
        onMouseLeave={stopChipRowDrag}
        onClickCapture={handleChipRowClickCapture}
        onWheel={handleChipRowWheel}
        style={{
          display: 'flex', gap: 8,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: desktop ? '0 2px 2px 16px' : '8px 16px 10px',
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          background: 'transparent',
          cursor: chipRowDragging ? 'grabbing' : 'grab',
        }}
      >
        {movieFilter && (
          <FilterChip
            label="영화"
            value={movieFilter.title.length > 10 ? movieFilter.title.slice(0, 10) + '…' : movieFilter.title}
            selected
            onClick={() => {}}
            onClear={onMovieFilterClear}
          />
        )}
        {directorFilter && (
          <FilterChip
            label="감독"
            value={directorFilter.name.length > 10 ? directorFilter.name.slice(0, 10) + '…' : directorFilter.name}
            selected
            onClick={() => {}}
            onClear={onDirectorFilterClear}
            separator="-"
          />
        )}
        <FilterChip
          label="검색 지역"
          value={regionId ?? undefined}
          open={openPanel === 'region'}
          selected={!!regionId}
          hasDropdown
          chipRef={regionChipRef}
          onClick={() => openDropdown('region', regionChipRef)}
          onClear={regionId ? () => { setRegionId(null); setOpenPanel(null); chip({ regionId: null }) } : undefined}
        />
        <FilterChip
          label="상영 일정"
          value={dateLabel}
          open={isDateOpen}
          selected={!!dateId}
          hasDropdown
          chipRef={dateChipRef}
          onClick={() => openDropdown('date', dateChipRef)}
          onClear={dateId ? clearDate : undefined}
        />
        <FilterChip
          label="장르"
          value={genreLabel}
          open={openPanel === 'genre'}
          selected={genres.length > 0}
          hasDropdown
          chipRef={genreChipRef}
          onClick={() => openDropdown('genre', genreChipRef)}
          onClear={genres.length > 0 ? clearGenres : undefined}
        />
        {nationOptions.length > 0 && (
          <FilterChip
            label="국가"
            value={nationLabel}
            open={openPanel === 'nation'}
            selected={nations.length > 0}
            hasDropdown
            chipRef={nationChipRef}
            onClick={() => openDropdown('nation', nationChipRef)}
            onClear={nations.length > 0 ? clearNations : undefined}
          />
        )}
        <FilterChip
          label="예매 가능"
          selected={bookable}
          onClick={() => { setBookable(b => !b); chip({ bookable: !bookable }) }}
        />
        {/* 독립영화관 필터 — 미구현, 비활성화
        <FilterChip
          label="독립영화관"
          selected={indie}
          onClick={() => setIndie(b => !b)}
        />
        */}
      </div>

      {mounted && !regionId && !regionHintDismissed && (
        <>
          <style>{`@keyframes tipIn{from{opacity:0;transform:translateY(-6px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
          <div style={{
            position: 'absolute',
            top: 44,
            left: 4,
            zIndex: 60,
            width: 236,
            animation: 'tipIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* 꼬리 */}
            <div style={{
              position: 'absolute',
              top: -5,
              left: 24,
              width: 11,
              height: 11,
              background: 'var(--color-primary-base)',
              transform: 'rotate(45deg)',
              borderRadius: 2,
            }} />
            {/* 본체 */}
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
              {/* 핀 아이콘 */}
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {/* 문구 */}
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
              {/* 닫기 버튼 */}
              <button
                onClick={() => {
                  sessionStorage.setItem('yh_region_tip', 'closed')
                  setRegionHintDismissed(true)
                }}
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
        </>
      )}

      {mounted && openPanel && createPortal(
        <div ref={portalDropdownRef}>
          {openPanel === 'date' && (
            <DateDropdown
              selectedId={dateId}
              onSelect={selectDate}
              onPickCustom={openCalendar}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
            />
          )}
          {openPanel === 'genre' && (
            <MultiSelectDropdown
              options={GENRES}
              selectedValues={draftGenres}
              setSelectedValues={setDraftGenres}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
            />
          )}
          {openPanel === 'nation' && (
            <MultiSelectDropdown
              options={nationOptions}
              selectedValues={draftNations}
              setSelectedValues={setDraftNations}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
            />
          )}
          {openPanel === 'region' && (
            <RegionDropdown
              selectedId={regionId}
              onSelect={(id) => { setRegionId(id); if (id) setOpenPanel(null); chip({ regionId: id }) }}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
            />
          )}
          {openPanel === 'calendar' && (
            <CalendarPicker
              startDate={customStart}
              endDate={customEnd}
              onApply={selectCustomRange}
              onCancel={() => setOpenPanel(null)}
              style={{ position: 'fixed', top: dropdownPos.top, left: 8, right: 8, zIndex: 99999 }}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
