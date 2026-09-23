'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip, Icon, SectionHeader } from '@/components/primitives'
import { FavoriteToggle } from '@/components/domain/favorites/FavoriteToggle'
import { useFavorites } from '@/hooks/useFavorites'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import {
  buildFestivalDays,
  countScreeningsByDate,
  defaultFestivalDay,
  festivalDayLabel,
  festivalDayShortLabel,
  formatScreeningTime,
  listScreeningVenues,
  normalizeTime,
  screeningEndTime,
  selectDayScreenings,
} from '@/lib/festival/timetable'
import type { FestivalScreening, FestivalTheaterLink } from '@/types/festival'

interface Props {
  screenings: FestivalScreening[]
  theaters: FestivalTheaterLink[]
  startDate: string
  endDate: string
  today: string
  isDesktop: boolean
  officialUrl?: string | null
}

const FAVORITES_TAB = '__favorites__'
const TIME_GUTTER_WIDTH = 48
const SCREEN_WIDTH = 168
const SCREEN_HEADER_HEIGHT = 40
const MINUTES_PER_PIXEL = 1

function venueName(link: FestivalTheaterLink): string | null {
  return link.theater?.name ?? link.venueText
}

function toMinutes(time: string): number {
  const [hours, minutes] = normalizeTime(time).split(':').map(Number)
  return hours * 60 + minutes
}

function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

export function FestivalTimetable({ screenings, theaters, startDate, endDate, today, isDesktop, officialUrl }: Props) {
  const days = useMemo(() => buildFestivalDays(startDate, endDate), [startDate, endDate])
  const venues = useMemo(() => {
    const screeningVenues = listScreeningVenues(screenings)
    const available = new Set(screeningVenues)
    const festivalOrder = theaters
      .map(venueName)
      .filter((name): name is string => Boolean(name && available.has(name)))
    const ordered = new Set(festivalOrder)
    return [...festivalOrder, ...screeningVenues.filter((name) => !ordered.has(name))]
  }, [screenings, theaters])
  const [day, setDay] = useState<string | null>(() => defaultFestivalDay(days, today))
  const [mobileVenue, setMobileVenue] = useState<string>(() => venues[0] ?? FAVORITES_TAB)
  const { isFavorite } = useFavorites()

  useEffect(() => {
    if (mobileVenue !== FAVORITES_TAB && !venues.includes(mobileVenue)) {
      setMobileVenue(venues[0] ?? FAVORITES_TAB)
    }
  }, [mobileVenue, venues])

  const theaterByVenue = useMemo(() => {
    const out = new Map<string, FestivalTheaterLink>()
    for (const theater of theaters) {
      const name = venueName(theater)
      if (name) out.set(name, theater)
    }
    return out
  }, [theaters])

  const favoriteVenues = useMemo(() => new Set(
    venues.filter((venue) => {
      const theaterId = theaterByVenue.get(venue)?.theaterId
      return theaterId ? isFavorite('theater', theaterId) : false
    }),
  ), [isFavorite, theaterByVenue, venues])

  const countByDate = useMemo(() => countScreeningsByDate(screenings), [screenings])
  const dayRows = useMemo(() => (day ? selectDayScreenings(screenings, day) : []), [day, screenings])
  const visibleRows = useMemo(() => {
    if (isDesktop) return dayRows
    if (mobileVenue === FAVORITES_TAB) return dayRows.filter((row) => favoriteVenues.has(row.venueLabel))
    return dayRows.filter((row) => row.venueLabel === mobileVenue)
  }, [dayRows, favoriteVenues, isDesktop, mobileVenue])

  return (
    <section style={{ paddingTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)' }}>
      <SectionHeader
        title="상영 시간표"
        description={screenings.length > 0 ? '영화제 공식 발표 기준 — 예매·잔여석은 공식 예매처에서 확인해 주세요' : undefined}
        isDesktop={isDesktop}
      />

      {screenings.length === 0 ? (
        <UnpublishedNotice officialUrl={officialUrl} />
      ) : (
        <>
          <div
            className="no-scrollbar"
            style={{ display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', padding: 'var(--spacing-3) var(--gutter)' }}
            role="tablist"
            aria-label="상영 날짜"
          >
            {days.map((date) => (
              <Chip
                key={date}
                role="tab"
                aria-selected={date === day}
                selected={date === day}
                onClick={() => setDay(date)}
                style={{ flexShrink: 0, opacity: countByDate[date] ? 1 : 0.5 }}
              >
                {festivalDayShortLabel(date)}
              </Chip>
            ))}
          </div>

          {!isDesktop && venues.length > 0 && (
            <VenueTabs venues={venues} selected={mobileVenue} onSelect={setMobileVenue} />
          )}

          <p style={{
            margin: 0,
            padding: isDesktop ? 'var(--spacing-1) var(--gutter) var(--spacing-3)' : 'var(--spacing-3) var(--gutter)',
            color: 'var(--color-text-caption)',
            fontSize: 'var(--text-meta)',
            lineHeight: 1.5,
            textWrap: 'pretty',
          }}>
            종료 시각은 작품 러닝타임으로 계산해 실제와 다를 수 있어요
          </p>

          {visibleRows.length === 0 ? (
            <p style={{ margin: 0, padding: 'var(--spacing-8) var(--gutter)', textAlign: 'center', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              {mobileVenue === FAVORITES_TAB
                ? '관심 극장의 상영이 없어요'
                : day ? `${festivalDayLabel(day)}에 상영이 없어요` : '상영이 없어요'}
            </p>
          ) : (
            <Timeline rows={visibleRows} venueOrder={venues} theaterByVenue={theaterByVenue} isDesktop={isDesktop} />
          )}
        </>
      )}
    </section>
  )
}

function VenueTabs({ venues, selected, onSelect }: { venues: string[]; selected: string; onSelect: (venue: string) => void }) {
  return (
    <div
      className="no-scrollbar"
      role="tablist"
      aria-label="상영관"
      style={{ display: 'flex', overflowX: 'auto', padding: '0 var(--gutter)', borderBottom: '1px solid var(--color-border)' }}
    >
      {[FAVORITES_TAB, ...venues].map((tab) => {
        const active = tab === selected
        return (
          <Button
            key={tab}
            variant="text"
            size="sm"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab)}
            style={{
              flexShrink: 0,
              minHeight: 44,
              padding: '0 var(--spacing-5)',
              borderBottom: active ? '3px solid var(--color-primary-base)' : '3px solid transparent',
              background: 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-caption)',
              fontSize: 'var(--text-subtitle)',
              fontWeight: active ? 700 : 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab === FAVORITES_TAB ? '관심' : tab}
          </Button>
        )
      })}
    </div>
  )
}

function Timeline({ rows, venueOrder, theaterByVenue, isDesktop }: { rows: FestivalScreening[]; venueOrder: string[]; theaterByVenue: Map<string, FestivalTheaterLink>; isDesktop: boolean }) {
  const presentVenues = new Set(rows.map((row) => row.venueLabel))
  const venues = venueOrder.filter((venue) => presentVenues.has(venue))
  const starts = rows.map((row) => toMinutes(row.startTime))
  const ends = rows.map((row) => toMinutes(row.startTime) + (row.runtimeMin ?? 120))
  const gridStart = Math.floor(Math.min(...starts) / 60) * 60
  const gridEnd = Math.ceil(Math.max(...ends) / 60) * 60

  return (
    <div
      className={isDesktop ? 'no-scrollbar' : undefined}
      style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: 'var(--spacing-4)', overflowX: isDesktop ? 'auto' : undefined, padding: '0 var(--gutter) var(--spacing-1)' }}
    >
      {venues.map((venue) => {
        const venueRows = rows.filter((row) => row.venueLabel === venue)
        const screenCount = new Set(venueRows.map((row) => row.screenLabel ?? '상영관')).size
        return (
          <div key={venue} style={isDesktop ? { flex: `0 0 ${TIME_GUTTER_WIDTH + screenCount * SCREEN_WIDTH}px` } : undefined}>
            <VenueTimeline
              venue={venue}
              rows={venueRows}
              theater={theaterByVenue.get(venue)}
              gridStart={gridStart}
              gridEnd={gridEnd}
              innerScroll={!isDesktop}
            />
          </div>
        )
      })}
    </div>
  )
}

function VenueTimeline({ venue, rows, theater, gridStart, gridEnd, innerScroll }: {
  venue: string
  rows: FestivalScreening[]
  theater?: FestivalTheaterLink
  gridStart: number
  gridEnd: number
  innerScroll: boolean
}) {
  const screens = [...new Set(rows.map((row) => row.screenLabel ?? '상영관'))]
  const bodyHeight = (gridEnd - gridStart) * MINUTES_PER_PIXEL + 24
  const fullWidth = TIME_GUTTER_WIDTH + screens.length * SCREEN_WIDTH

  return (
    <section style={{ overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-popover)', backgroundColor: 'var(--color-surface-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-2)', minHeight: 48, padding: '0 var(--gutter-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-title)', color: 'var(--color-text-primary)', textWrap: 'balance' }}>{venue}</h3>
          <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{screens.length}개 관 · {rows.length}회차</span>
        </div>
        {theater?.theaterId && <FavoriteToggle type="theater" id={theater.theaterId} label={venue} size={44} />}
      </div>

      <div className={innerScroll ? 'no-scrollbar' : undefined} style={{ overflowX: innerScroll ? 'auto' : 'visible' }}>
        <div style={{ position: 'relative', width: fullWidth, minWidth: '100%', height: SCREEN_HEADER_HEIGHT + bodyHeight, backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ position: 'absolute', left: TIME_GUTTER_WIDTH, top: 0, display: 'flex', height: SCREEN_HEADER_HEIGHT }}>
            {screens.map((screen) => (
              <div key={screen} style={{ width: SCREEN_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 var(--spacing-2)', borderLeft: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', fontSize: 'var(--text-meta)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {screen}
              </div>
            ))}
          </div>

          {Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, index) => gridStart + index * 60).map((minute) => {
            const top = SCREEN_HEADER_HEIGHT + (minute - gridStart) * MINUTES_PER_PIXEL
            return (
              <div key={minute} style={{ position: 'absolute', left: 0, right: 0, top }}>
                <div style={{ position: 'absolute', left: TIME_GUTTER_WIDTH, right: 0, borderTop: '1px solid var(--color-border)' }} />
                <span style={{ position: 'absolute', left: 8, top: -8, color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMinutes(minute)}
                </span>
              </div>
            )
          })}

          {screens.map((screen, screenIndex) => {
            const screenRows = rows
              .filter((row) => (row.screenLabel ?? '상영관') === screen)
              .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
            let previousBottom = -Infinity
            return screenRows.map((row) => {
              const naturalTop = SCREEN_HEADER_HEIGHT + (toMinutes(row.startTime) - gridStart) * MINUTES_PER_PIXEL + 8
              const top = Math.max(naturalTop, previousBottom + 8)
              const height = Math.max(80, Math.min((row.runtimeMin ?? 104) - 8, 120))
              previousBottom = top + height
              return <ScreeningCard key={row.id} row={row} top={top} left={TIME_GUTTER_WIDTH + screenIndex * SCREEN_WIDTH + 8} height={height} />
            })
          })}

          <div style={{ position: 'sticky', left: 0, top: 0, width: TIME_GUTTER_WIDTH, height: '100%', borderRight: '1px solid var(--color-border)', pointerEvents: 'none' }} />
        </div>
      </div>
    </section>
  )
}

function ScreeningCard({ row, top, left, height }: { row: FestivalScreening; top: number; left: number; height: number }) {
  const router = useRouter()
  const interactive = Boolean(row.movieId || row.bookingUrl)
  const endTime = screeningEndTime(row.startTime, row.runtimeMin)
  const open = () => {
    if (row.movieId) router.push(`/films/movie/${row.movieId}`)
    else if (row.bookingUrl) window.open(row.bookingUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      type="button"
      variant="text"
      size="sm"
      onClick={interactive ? open : undefined}
      style={{ position: 'absolute', top, left, width: SCREEN_WIDTH - 16, height, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-1)', padding: 'var(--spacing-2)', border: '1px solid color-mix(in srgb, var(--color-primary-base) 32%, var(--color-border))', borderRadius: 'var(--radius-control)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-primary)', textAlign: 'left', cursor: interactive ? 'pointer' : 'default' }}
    >
      <span style={{ color: 'var(--color-primary-base)', fontSize: 'var(--text-badge)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.screeningCode ?? '회차'}</span>
      <span style={{ width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, color: 'var(--color-text-primary)', fontSize: 'var(--text-meta)', fontWeight: 700, lineHeight: 1.35 }}>
        {normalizeTitle(row.movieTitleSnapshot)}
      </span>
      <span style={{ color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}>
        {endTime ? formatScreeningTime(row.startTime, row.runtimeMin).replace(' ~ ', ' → ') : normalizeTime(row.startTime)}
      </span>
      {(row.hasGv || row.section) && (
        <span style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-caption)', fontSize: 'var(--text-badge)' }}>
          {row.hasGv ? 'GV' : row.section}{row.hasGv && row.section ? ` · ${row.section}` : ''}
        </span>
      )}
    </Button>
  )
}

function UnpublishedNotice({ officialUrl }: { officialUrl?: string | null }) {
  return (
    <div style={{ padding: 'var(--spacing-3) var(--gutter)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)', padding: 'var(--spacing-8) var(--gutter)', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-control)' }}>
        <Icon name="calendar" size={22} strokeWidth={1.75} color="var(--color-text-caption)" />
        <p style={{ margin: 0, fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>상영 시간표는 공개 전이에요</p>
        <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-caption)', wordBreak: 'keep-all' }}>
          영화제가 회차를 발표하면 날짜·상영관별 표로 정리해 올려요. 공식 사이트에서 먼저 확인할 수도 있어요.
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
