'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Chip, Icon, ScrollNavButton, SectionHeader, Tabs } from '@/components/primitives'
import { DetailDateTabs } from '@/components/domain/DetailDateTabs'
import { FavoriteToggle } from '@/components/domain/favorites/FavoriteToggle'
import { BookingCtaButton, CloseRoundButton, type BookingCtaLabels } from '@/components/domain/booking/BookingActions'
import { useFavorites } from '@/hooks/useFavorites'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { trackEvent } from '@/lib/analytics/client'
import { scrollRailBy } from '@/lib/ui/railScroll'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { festivalVenueName } from '@/lib/festival/venueMap'
import {
  buildFestivalDays,
  countScreeningsByDate,
  defaultFestivalDay,
  festivalDayLabel,
  listScreeningVenues,
  normalizeTime,
  screeningEndTime,
  selectDayScreenings,
} from '@/lib/festival/timetable'
import type { FestivalScreening, FestivalTheaterLink } from '@/types/festival'

/**
 * 영화제 상영 시간표 — 극장별로 테두리를 두른 관(스크린) 바둑판.
 *
 * 세로축은 시각(분당 1px), 가로축은 관. 모든 극장이 같은 시각 축을 써서 같은 가로줄이 같은 시각이다.
 * PC는 모든 극장을 한 줄로 늘어놓고 가로로 스크롤(‹ › 버튼 · 트랙패드), 모바일은 극장 탭으로
 * 한 극장만 보고 그 안의 관이 넘치면 가로로 스와이프(버튼도 뜬다)한다.
 * 회차를 누르면 선택 카드(PC 우하단 · 모바일 하단 바)가 뜨고, 버튼은 영화제 작품 페이지로 간다.
 *
 * 회차가 아직 0개면 "공개 전" 자리를 세운다 — 영화제는 라인업이 먼저 나오고 시간표가 몇 주 뒤에
 * 나오는데, 그 사이 섹션을 감추면 "여긴 시간표가 없는 서비스"로 읽힌다.
 */

interface Props {
  screenings: FestivalScreening[]
  theaters: FestivalTheaterLink[]
  /** ISO date "YYYY-MM-DD" */
  startDate: string
  endDate: string
  today: string
  isDesktop: boolean
  officialUrl?: string | null
  /** 지도 카드의 "시간표 보기" — 바뀔 때마다 그 극장으로 맞춘다 */
  focusRequest?: { venue: string; at: number } | null
}

const FAVORITES_TAB = '__favorites__'
const TIME_GUTTER_W = 48
const SCREEN_W = 164
const CARD_W = SCREEN_W - 16
const CARD_H = 116
const CARD_GAP = 8
const VENUE_HEAD_H = 52
const SCREEN_HEAD_H = 36
const HEAD_H = VENUE_HEAD_H + SCREEN_HEAD_H
const PX_PER_MIN = 1
const BODY_PAD = 12
const DEFAULT_RUNTIME = 120
/* ScrollNavButton은 캐러셀 양옆에 겹쳐 뜨는 부품이다 — 툴바 안에 나란히 둘 때만 흐름 배치로 되돌린다 */
const NAV_INLINE: React.CSSProperties = { position: 'static', transform: 'none', boxShadow: 'none' }

/* 예매가 아니라 작품 정보로 보내는 자리 — 영화제 작품 페이지에 예매 버튼이 있다 */
const PROGRAM_LABELS: BookingCtaLabels = {
  idle: '작품 정보 보기',
  opening: '작품 정보 여는 중…',
  returned: '작품 정보 다시 열기',
}

const toMinutes = (time: string) => {
  const [h, m] = normalizeTime(time).split(':').map(Number)
  return h * 60 + m
}
const formatMinutes = (minutes: number) => {
  const n = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}
const screenOf = (row: FestivalScreening) => row.screenLabel ?? row.venueLabel

export function FestivalTimetable({ screenings, theaters, startDate, endDate, today, isDesktop, officialUrl, focusRequest }: Props) {
  const days = useMemo(() => buildFestivalDays(startDate, endDate), [startDate, endDate])
  const countByDate = useMemo(() => countScreeningsByDate(screenings), [screenings])
  const activeDates = useMemo(() => new Set(Object.keys(countByDate)), [countByDate])
  const dayLabels = useMemo(() => ({ [startDate]: '개막', [endDate]: '폐막' }), [startDate, endDate])

  // 극장 순서 = 영화제가 정한 순서(festival_theaters.sort_order), 거기 없는 극장은 회차 등장 순으로 뒤에
  const venues = useMemo(() => {
    const available = new Set(listScreeningVenues(screenings))
    const ordered = [...theaters].sort((a, b) => a.sortOrder - b.sortOrder)
      .map(festivalVenueName)
      .filter((name): name is string => Boolean(name && available.has(name)))
    const seen = new Set(ordered)
    return [...ordered, ...listScreeningVenues(screenings).filter((name) => !seen.has(name))]
  }, [screenings, theaters])

  const theaterIdByVenue = useMemo(() => {
    const out = new Map<string, string>()
    for (const link of theaters) {
      const name = festivalVenueName(link)
      if (name && link.theaterId) out.set(name, link.theaterId)
    }
    return out
  }, [theaters])

  const { isFavorite } = useFavorites()
  const favoriteVenues = useMemo(
    () => new Set(venues.filter((v) => { const id = theaterIdByVenue.get(v); return id ? isFavorite('theater', id) : false })),
    [isFavorite, theaterIdByVenue, venues],
  )

  const [day, setDay] = useState<string | null>(() => {
    const first = defaultFestivalDay(days, today)
    // 오늘이 회기 밖이거나 그날 회차가 없으면 회차 있는 첫날로
    return first && countByDate[first] ? first : days.find((d) => countByDate[d]) ?? first
  })
  // 모바일 극장 탭 — 관심 극장이 있으면 관심부터 연다(탭 순서도 관심 → 나머지)
  const [mobileTab, setMobileTab] = useState<string | null>(null)
  const effectiveTab = mobileTab ?? (favoriteVenues.size > 0 ? FAVORITES_TAB : venues[0] ?? FAVORITES_TAB)
  // PC "관심 표시한 것만 보기"
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sectionRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canL, setCanL] = useState(false)
  const [canR, setCanR] = useState(false)
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setCanL(el.scrollLeft > 4)
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  const dayRows = useMemo(() => (day ? selectDayScreenings(screenings, day) : []), [day, screenings])
  const shownVenues = useMemo(() => {
    const present = new Set(dayRows.map((r) => r.venueLabel))
    const list = venues.filter((v) => present.has(v))
    if (isDesktop) return favoritesOnly ? list.filter((v) => favoriteVenues.has(v)) : list
    return effectiveTab === FAVORITES_TAB ? list.filter((v) => favoriteVenues.has(v)) : list.filter((v) => v === effectiveTab)
  }, [dayRows, effectiveTab, favoriteVenues, favoritesOnly, isDesktop, venues])

  // 모든 극장이 같은 시각 축을 쓴다 — 극장을 넘나들어도 같은 가로줄이 같은 시각
  const axis = useMemo(() => {
    if (dayRows.length === 0) return null
    const starts = dayRows.map((r) => toMinutes(r.startTime))
    const ends = dayRows.map((r) => toMinutes(r.startTime) + (r.runtimeMin ?? DEFAULT_RUNTIME))
    return { start: Math.floor(Math.min(...starts) / 60) * 60, end: Math.ceil(Math.max(...ends) / 60) * 60 }
  }, [dayRows])

  const hasRuntime = dayRows.some((r) => r.runtimeMin)
  const selected = dayRows.find((r) => r.id === selectedId) ?? null

  useEffect(() => { setSelectedId(null) }, [day, effectiveTab, favoritesOnly])
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollLeft = 0
    updateEdges()
  }, [shownVenues, updateEdges])

  // 지도에서 "시간표 보기" — 모바일은 그 극장 탭, PC는 그 극장 블록까지 가로 스크롤
  useEffect(() => {
    if (!focusRequest) return
    setMobileTab(focusRequest.venue)
    setFavoritesOnly(false)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current
      const block = scroller?.querySelector<HTMLElement>(`[data-venue="${CSS.escape(focusRequest.venue)}"]`)
      if (scroller && block) scroller.scrollTo({ left: block.offsetLeft - TIME_GUTTER_W, behavior: 'smooth' })
    })
  }, [focusRequest])

  const tabItems = useMemo(
    () => [{ value: FAVORITES_TAB, label: '관심' }, ...venues.map((v) => ({ value: v, label: v }))],
    [venues],
  )
  const scrollBoard = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (el) scrollRailBy(el, dir * Math.max(SCREEN_W * 2, el.clientWidth * 0.8))
  }
  const favoritesView = isDesktop ? favoritesOnly : effectiveTab === FAVORITES_TAB

  return (
    <section ref={sectionRef} style={{ paddingTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)', scrollMarginTop: 60 }}>
      <SectionHeader
        title="상영 시간표"
        description={screenings.length > 0 ? '영화제 공식 발표 기준' : undefined}
        isDesktop={isDesktop}
      />

      {screenings.length === 0 ? (
        <UnpublishedNotice officialUrl={officialUrl} />
      ) : (
        <>
          <div style={{ padding: '0 var(--gutter)' }}>
            <DetailDateTabs
              dates={days}
              selectedDate={day ?? ''}
              activeDates={activeDates}
              onSelect={setDay}
              labels={dayLabels}
              firstIsToday={false}
            />
          </div>

          {!isDesktop && (
            <Tabs
              label="극장"
              items={tabItems}
              value={effectiveTab}
              onChange={(v) => setMobileTab(v)}
              scrollable
              style={{ marginTop: 'var(--spacing-2)' }}
            />
          )}

          {/* 툴바 — (PC) 관심 필터 · 옅은 안내 · 가로 이동 버튼. 버튼은 바둑판이 길어 세로 가운데에 두면 안 보인다 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', padding: 'var(--spacing-3) var(--gutter) 0' }}>
            {isDesktop && (
              <Chip selected={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)} aria-pressed={favoritesOnly} style={{ flexShrink: 0 }}>
                <Icon name="heart" size={14} strokeWidth={1.75} color="currentColor" />
                관심 표시한 것만 보기
              </Chip>
            )}
            <p style={{ margin: 0, flex: 1, minWidth: 0, color: 'var(--color-text-placeholder)', fontSize: 'var(--text-meta)', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              {hasRuntime ? '종료 시각은 작품 러닝타임으로 계산해 실제와 다를 수 있어요' : ''}
            </p>
            {(canL || canR) && (
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexShrink: 0 }}>
                <ScrollNavButton direction="left" disabled={!canL} onClick={() => scrollBoard(-1)} style={{ ...NAV_INLINE, opacity: canL ? 1 : 0.35 }} />
                <ScrollNavButton direction="right" disabled={!canR} onClick={() => scrollBoard(1)} style={{ ...NAV_INLINE, opacity: canR ? 1 : 0.35 }} />
              </div>
            )}
          </div>

          {shownVenues.length === 0 || !axis ? (
            <p style={{ margin: 0, padding: 'var(--spacing-8) var(--gutter)', textAlign: 'center', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', wordBreak: 'keep-all' }}>
              {favoritesView
                ? '이날 관심 극장의 상영이 없어요 — 극장 이름 옆 하트로 관심 표시해 보세요'
                : day ? `${festivalDayLabel(day)}에 상영이 없어요` : '상영이 없어요'}
            </p>
          ) : (
            <div style={{ position: 'relative', marginTop: 'var(--spacing-3)' }}>
              <div
                ref={scrollerRef}
                className="no-scrollbar"
                onScroll={updateEdges}
                style={{ overflowX: 'auto', padding: '0 var(--gutter) var(--spacing-2)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', width: 'max-content' }}>
                  <TimeGutter axis={axis} />
                  <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                    {shownVenues.map((venue) => (
                      <VenueBoard
                        key={venue}
                        venue={venue}
                        rows={dayRows.filter((r) => r.venueLabel === venue)}
                        axis={axis}
                        theaterId={theaterIdByVenue.get(venue) ?? null}
                        selectedId={selectedId}
                        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selected && day && (
            <SelectedScreening row={selected} day={day} isDesktop={isDesktop} onClose={() => setSelectedId(null)} />
          )}
        </>
      )}
    </section>
  )
}

/* ── 시각 열 — 가로로 스크롤해도 왼쪽에 붙어 있다 ─────────────────── */
function TimeGutter({ axis }: { axis: { start: number; end: number } }) {
  const hours: number[] = []
  for (let m = axis.start; m <= axis.end; m += 60) hours.push(m)
  return (
    <div style={{
      position: 'sticky', left: 0, zIndex: 2, flexShrink: 0, width: TIME_GUTTER_W,
      height: HEAD_H + (axis.end - axis.start) * PX_PER_MIN + BODY_PAD * 2,
      backgroundColor: 'var(--color-surface-bg)',
    }}>
      {hours.map((m) => (
        <span key={m} style={{
          position: 'absolute', left: 0, top: HEAD_H + BODY_PAD + (m - axis.start) * PX_PER_MIN - 8,
          fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"',
        }}>
          {formatMinutes(m)}
        </span>
      ))}
    </div>
  )
}

/* ── 극장 한 곳 — 테두리 안에 극장 이름 줄 · 관 이름 줄 · 관별 세로 열 ───────── */
function VenueBoard({ venue, rows, axis, theaterId, selectedId, onSelect }: {
  venue: string
  rows: FestivalScreening[]
  axis: { start: number; end: number }
  theaterId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const screens = [...new Set(rows.map(screenOf))]
  const bodyH = (axis.end - axis.start) * PX_PER_MIN + BODY_PAD * 2
  const hours: number[] = []
  for (let m = axis.start; m <= axis.end; m += 60) hours.push(m)

  return (
    <section
      data-venue={venue}
      aria-label={venue}
      style={{
        flexShrink: 0, width: screens.length * SCREEN_W,
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-popover)',
        backgroundColor: 'var(--color-surface-card)', overflow: 'hidden',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', height: VENUE_HEAD_H, padding: '0 var(--spacing-2) 0 var(--gutter-md)', borderBottom: '1px solid var(--color-border)' }}>
        <h3 style={{ margin: 0, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {venue}
          <span style={{ marginLeft: 'var(--spacing-2)', fontSize: 'var(--text-meta)', fontWeight: 400, color: 'var(--color-text-caption)' }}>{rows.length}회차</span>
        </h3>
        {theaterId && <FavoriteToggle type="theater" id={theaterId} label={venue} size={32} />}
      </header>

      <div style={{ display: 'flex', height: SCREEN_HEAD_H, borderBottom: '1px solid var(--color-border)' }}>
        {screens.map((screen, i) => (
          <div key={screen} style={{
            width: SCREEN_W, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 var(--spacing-2)',
            borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
            fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {screen}
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', height: bodyH, backgroundColor: 'var(--color-surface-bg)' }}>
        {hours.map((m) => (
          <div key={m} style={{ position: 'absolute', left: 0, right: 0, top: BODY_PAD + (m - axis.start) * PX_PER_MIN, borderTop: '1px solid var(--color-border)' }} />
        ))}
        {screens.map((screen, i) => {
          const list = rows.filter((r) => screenOf(r) === screen).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
          let bottom = -Infinity
          return (
            <div key={screen} style={{ position: 'absolute', top: 0, bottom: 0, left: i * SCREEN_W, width: SCREEN_W, borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
              {list.map((row) => {
                // 시작 시각 자리에 놓되, 앞 카드와 겹치면 아래로 민다(짧은 단편 연속 상영)
                const top = Math.max(BODY_PAD + (toMinutes(row.startTime) - axis.start) * PX_PER_MIN, bottom + CARD_GAP)
                bottom = top + CARD_H
                return <ScreeningCard key={row.id} row={row} top={top} selected={row.id === selectedId} onSelect={() => onSelect(row.id)} />
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── 회차 카드 — 코드가 위, 제목이 주인공, 그다음 시각 ─────────────────── */
function ScreeningCard({ row, top, selected, onSelect }: { row: FestivalScreening; top: number; selected: boolean; onSelect: () => void }) {
  const end = screeningEndTime(row.startTime, row.runtimeMin)
  const title = normalizeTitle(row.movieTitleSnapshot)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${title} ${normalizeTime(row.startTime)}${row.screeningCode ? ` 상영코드 ${row.screeningCode}` : ''}`}
      style={{
        position: 'absolute', top, left: (SCREEN_W - CARD_W) / 2, width: CARD_W, height: CARD_H, minHeight: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-1)',
        padding: 'var(--spacing-2) var(--spacing-3)', overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
        borderRadius: 'var(--radius-control)', backgroundColor: 'var(--color-surface-card)',
        border: selected ? '2px solid var(--color-primary-base)' : '1px solid var(--color-border)',
        boxShadow: selected ? 'var(--shadow-md)' : 'none',
      }}
    >
      {row.screeningCode && (
        <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-primary-base)', fontFeatureSettings: '"tnum"' }}>{row.screeningCode}</span>
      )}
      <span style={{ width: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 'var(--text-body)', fontWeight: 700, lineHeight: 1.35, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
        {title}
      </span>
      <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', fontFeatureSettings: '"tnum"' }}>
        {normalizeTime(row.startTime)}{end ? ` → ${end}` : ''}
      </span>
      {(row.hasGv || row.section) && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', width: '100%', minWidth: 0 }}>
          {row.hasGv && <GvBadge />}
          {row.section && (
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>{row.section}</span>
          )}
        </span>
      )}
    </button>
  )
}

/* GV 배지 — Badge 프리미티브엔 보라(gv) 변형이 없다. 지도 핀·포스터 칩과 같은 --color-gv를 쓴다 */
function GvBadge() {
  return (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '0 var(--spacing-1)', borderRadius: 'var(--radius-badge)', backgroundColor: 'var(--color-gv)', color: 'var(--color-on-accent)', fontSize: 'var(--text-badge)', fontWeight: 700, lineHeight: 1.6 }}>
      GV
    </span>
  )
}

/* ── 선택한 회차 — PC 우하단 카드 · 모바일 하단 바 (극장 상세와 같은 자리·같은 부품) ───── */
function SelectedScreening({ row, day, isDesktop, onClose }: { row: FestivalScreening; day: string; isDesktop: boolean; onClose: () => void }) {
  const end = screeningEndTime(row.startTime, row.runtimeMin)
  const title = normalizeTitle(row.movieTitleSnapshot)
  const when = `${festivalDayLabel(day)} ${normalizeTime(row.startTime)}${end ? ` → ${end}` : ''}`
  const where = row.screenLabel ? `${row.venueLabel} ${row.screenLabel}` : row.venueLabel
  const track = () => trackEvent('booking clicked', {
    movie_title: title, theater_name: row.venueLabel, show_date: day, show_time: row.startTime,
    screening_code: row.screeningCode, source: 'festival_timetable',
  })

  if (typeof document === 'undefined') return null

  const body = isDesktop ? (
    <div style={{
      position: 'fixed', right: 'var(--spacing-8)', bottom: 'var(--spacing-8)', width: 320, zIndex: 'var(--z-navigation)',
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)',
      borderRadius: 'var(--radius-popover)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-text-caption)' }}>
          회차 선택됨{row.screeningCode ? ` · ${row.screeningCode}` : ''}
        </span>
        <CloseRoundButton variant="card" onClick={onClose} />
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35, wordBreak: 'keep-all' }}>{title}</div>
        <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', fontFeatureSettings: '"tnum"' }}>{when}</div>
        <div style={{ marginTop: 'var(--spacing-1)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)' }}>
          {where}{row.section ? ` · ${row.section}` : ''}{row.hasGv && <GvBadge />}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <BookingCtaButton variant="card" bookingUrl={row.bookingUrl} labels={PROGRAM_LABELS} onClick={track} />
      </div>
    </div>
  ) : (
    <div style={{
      // DetailShell이 모바일 하단 탭바를 띄운다 — 극장 상세처럼 그 위에 붙인다
      position: 'fixed', left: 0, right: 0, bottom: `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`, zIndex: 'var(--z-navigation)',
      padding: 'var(--spacing-3) var(--gutter) var(--spacing-4)',
      backgroundColor: 'var(--color-surface-card)', borderTop: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sheet)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.screeningCode && <span style={{ marginRight: 'var(--spacing-1)', color: 'var(--color-primary-base)', fontFeatureSettings: '"tnum"' }}>{row.screeningCode}</span>}
            {title}
          </div>
          <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
            {when} · {where}
          </div>
        </div>
        <CloseRoundButton variant="bar" onClick={onClose} />
      </div>
      <div style={{ display: 'flex' }}>
        <BookingCtaButton variant="bar" bookingUrl={row.bookingUrl} labels={PROGRAM_LABELS} onClick={track} />
      </div>
    </div>
  )
  return createPortal(body, document.body)
}

function UnpublishedNotice({ officialUrl }: { officialUrl?: string | null }) {
  return (
    <div style={{ padding: 'var(--spacing-3) var(--gutter)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)', padding: 'var(--spacing-8) var(--gutter)', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-control)' }}>
        <Icon name="calendar" size={22} strokeWidth={1.75} color="var(--color-text-caption)" />
        <p style={{ margin: 0, fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>상영 시간표는 공개 전이에요</p>
        <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-caption)', wordBreak: 'keep-all' }}>
          영화제가 회차를 발표하면 날짜·극장별로 정리해 올려요. 공식 사이트에서 먼저 확인할 수도 있어요.
        </p>
        {officialUrl && (
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)', marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-primary-text)', textDecoration: 'none' }}>
            공식 사이트에서 보기 <Icon name="external-link" size={14} strokeWidth={1.75} color="currentColor" />
          </a>
        )}
      </div>
    </div>
  )
}
