'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/* ── 날짜 헬퍼 ──────────────────────────────────────────────────── */
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

function buildDateOptions(t = today()) {
  const dow = t.getDay() // 0=Sun
  // 이번 주 토요일 (Sun-Sat 주 기준)
  const daysToSat = dow === 0 ? 6 : 6 - dow
  const sat0 = addDays(t, daysToSat)
  const sun0 = addDays(sat0, 1)
  const sat1 = addDays(sat0, 7)
  const sun1 = addDays(sat1, 1)
  // 이번 주 일요일 (주 끝)
  const weekEnd = dow === 0 ? addDays(t, 6) : addDays(t, 7 - dow)
  const monthEnd = new Date(t.getFullYear(), t.getMonth() + 1, 0)

  return [
    { id: 'today',        label: '오늘',       sub: fmtFull(t) },
    { id: 'tomorrow',     label: '내일',       sub: fmtFull(addDays(t, 1)) },
    { id: 'this-weekend', label: '이번 주말',  sub: `${fmtShortDow(sat0)} — ${fmtShortDow(sun0)}` },
    { id: 'next-weekend', label: '다음 주말',  sub: `${fmtShortDow(sat1)} — ${fmtShortDow(sun1)}` },
    { id: 'this-week',    label: '이번 주 전체', sub: `${fmtMD(t)} — ${fmtMD(weekEnd)}` },
    { id: 'this-month',   label: '이번 달',    sub: `${t.getMonth() + 1}월 전체` },
  ] as const
}

type DateId = 'today' | 'tomorrow' | 'this-weekend' | 'next-weekend' | 'this-week' | 'this-month' | null

/* ── 장르 ──────────────────────────────────────────────────────── */
const GENRES = ['드라마', '다큐멘터리', '애니메이션', '스릴러/호러', '코미디', '실험/예술', '단편', '로맨스'] as const

/* ── 타입 ──────────────────────────────────────────────────────── */
export interface FilterState {
  dateId: DateId
  genres: string[]
  bookable: boolean
  indie: boolean
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
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

/* ── DropdownRow ────────────────────────────────────────────────── */
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
      {/* indicator */}
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

      {/* text */}
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

/* ── DateDropdown ───────────────────────────────────────────────── */
function DateDropdown({ selectedId, onSelect, style }: {
  selectedId: DateId
  onSelect: (id: DateId) => void
  style?: React.CSSProperties
}) {
  const options = buildDateOptions()
  return (
    <div style={{
      position: 'absolute',
      width: 252,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      zIndex: 200,
      ...style,
    }}>
      {options.map((opt, i) => (
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

      {/* 날짜 직접 선택 */}
      <button
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

/* ── GenreDropdown ──────────────────────────────────────────────── */
function GenreDropdown({ initialSelected, onApply, style }: {
  initialSelected: string[]
  onApply: (genres: string[]) => void
  style?: React.CSSProperties
}) {
  const [draft, setDraft] = useState(initialSelected)

  const toggle = (g: string) =>
    setDraft(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  return (
    <div style={{
      position: 'absolute',
      width: 236,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      zIndex: 200,
      ...style,
    }}>
      {/* hint header */}
      <div style={{
        padding: '9px 14px',
        fontSize: 11, color: 'var(--color-text-caption)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        복수 선택 가능
      </div>

      {GENRES.map((g, i) => (
        <DropdownRow
          key={g}
          kind="checkbox"
          label={g}
          selected={draft.includes(g)}
          onClick={() => toggle(g)}
          isLast={i === GENRES.length - 1}
        />
      ))}

      {/* footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px 8px 14px',
        background: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
          {draft.length > 0 ? `${draft.length}개 선택됨` : ''}
        </span>
        <button
          onClick={() => onApply(draft)}
          style={{
            height: 28, padding: '0 14px', borderRadius: 999,
            background: 'var(--color-primary-base)',
            border: 'none', color: '#fff',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', minHeight: 'unset',
          }}
        >
          적용
        </button>
      </div>
    </div>
  )
}

/* ── FilterChip ─────────────────────────────────────────────────── */
interface FilterChipProps {
  label: string
  value?: string          // 선택된 값 텍스트 (드롭다운 칩만)
  open?: boolean          // 드롭다운 열림
  selected?: boolean      // 값 선택된 상태
  hasDropdown?: boolean
  onClick: () => void
  onClear?: () => void    // × 버튼 (드롭다운 칩 전용)
  chipRef?: React.Ref<HTMLButtonElement>
}

function FilterChip({ label, value, open, selected, hasDropdown, onClick, onClear, chipRef }: FilterChipProps) {
  let bg = 'transparent'
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
      {/* label / value */}
      {selected && value ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-sub)' }}>
            {label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>&nbsp;·&nbsp;</span>
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

      {/* 우측 버튼: × or 캐럿 */}
      {selected && onClear ? (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{
            width: 20, height: 20, borderRadius: '50%',
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

/* ── FilterBar ──────────────────────────────────────────────────── */
export interface FilterBarProps {
  onChange?: (state: FilterState) => void
}

export function FilterBar({ onChange }: FilterBarProps) {
  const [dateId,   setDateId]   = useState<DateId>(null)
  const [genres,   setGenres]   = useState<string[]>([])
  const [bookable, setBookable] = useState(false)
  const [indie,    setIndie]    = useState(false)
  const [openPanel, setOpenPanel] = useState<'date' | 'genre' | null>(null)
  const [dropdownLeft, setDropdownLeft] = useState(16)

  const wrapperRef   = useRef<HTMLDivElement>(null)
  const dateChipRef  = useRef<HTMLButtonElement>(null)
  const genreChipRef = useRef<HTMLButtonElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!openPanel) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpenPanel(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPanel])

  const openDropdown = useCallback((
    panel: 'date' | 'genre',
    chipRef: React.RefObject<HTMLButtonElement | null>,
  ) => {
    if (openPanel === panel) { setOpenPanel(null); return }
    const wrapper = wrapperRef.current
    const chip    = chipRef.current
    if (wrapper && chip) {
      const wRect = wrapper.getBoundingClientRect()
      const cRect = chip.getBoundingClientRect()
      setDropdownLeft(Math.max(8, cRect.left - wRect.left))
    }
    setOpenPanel(panel)
  }, [openPanel])

  const selectDate = (id: DateId) => { setDateId(id); setOpenPanel(null) }
  const clearDate  = () => { setDateId(null); setOpenPanel(null) }
  const applyGenres = (g: string[]) => { setGenres(g); setOpenPanel(null) }
  const clearGenres = () => { setGenres([]); setOpenPanel(null) }

  const dateOptions = buildDateOptions()
  const dateLabel   = dateOptions.find(o => o.id === dateId)?.label ?? undefined

  const genreLabel = genres.length === 0 ? undefined
    : genres.length === 1 ? genres[0]
    : `${genres[0]} 외 ${genres.length - 1}`

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* 칩 스크롤 행 — overflow-x:auto, 드롭다운은 여기 밖에 있어야 잘리지 않음 */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 8,
          padding: '8px 16px 10px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'var(--color-surface-bg)',
        }}
      >
        <FilterChip
          label="상영 일정"
          value={dateLabel}
          open={openPanel === 'date'}
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
        <FilterChip
          label="예매 가능"
          selected={bookable}
          onClick={() => setBookable(b => !b)}
        />
        <FilterChip
          label="독립영화관"
          selected={indie}
          onClick={() => setIndie(b => !b)}
        />
      </div>

      {/* 드롭다운 — position:absolute, 칩 행 바깥에 렌더 (overflow clipping 방지) */}
      {openPanel === 'date' && (
        <DateDropdown
          selectedId={dateId}
          onSelect={selectDate}
          style={{ top: 52, left: dropdownLeft }}
        />
      )}
      {openPanel === 'genre' && (
        <GenreDropdown
          initialSelected={genres}
          onApply={applyGenres}
          style={{ top: 52, left: dropdownLeft }}
        />
      )}
    </div>
  )
}
