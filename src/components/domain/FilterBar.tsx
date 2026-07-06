'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import { GENRES } from '@/lib/genres'
import { withFlag } from '@/lib/nations'
import { getStoredRegion, setStoredRegion, subscribeStoredRegion } from '@/lib/regionStorage'
import { type DateId, buildDateOptions, fmtFull, fmtMD, isSameDay } from './filterBar/dateHelpers'
import { CalendarPicker } from './filterBar/CalendarPicker'
import { DateDropdown } from './filterBar/DateDropdown'
import { MultiSelectDropdown } from './filterBar/MultiSelectDropdown'
import { RegionDropdown } from './filterBar/RegionDropdown'
import { FilterChip } from './filterBar/FilterChip'

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
  // 사용자가 직접 지역을 선택했으면 GPS auto-set 막기 (clear하면 다시 허용)
  const userPickedRegionRef = useRef(false)
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
    // 사용자가 직접 선택한 경우 GPS 값으로 덮어쓰지 않음
    if (userPickedRegionRef.current) return
    // sessionStorage 저장값 > GPS 기본값
    const stored = getStoredRegion()
    if (stored) { userPickedRegionRef.current = true; setRegionId(stored); return }
    setRegionId(defaultRegionId ?? null)
  }, [defaultRegionId])

  // 다른 화면(상영작 탭 등)에서 지역이 바뀌면 필터바 라벨도 즉시 동기화
  useEffect(() => subscribeStoredRegion((id) => {
    userPickedRegionRef.current = !!id
    setRegionId(id)
  }), [])

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
          onClear={regionId ? () => { setRegionId(null); setOpenPanel(null); userPickedRegionRef.current = false; setStoredRegion(null); chip({ regionId: null }) } : undefined}
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
          <div style={{
            position: 'absolute',
            top: 52,
            left: 16,
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
              onSelect={(id) => { userPickedRegionRef.current = !!id; setRegionId(id); setStoredRegion(id); if (id) setOpenPanel(null); chip({ regionId: id }) }}
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
