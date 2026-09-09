'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chip, Icon, SectionHeader } from '@/components/primitives'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import {
  buildFestivalDays,
  countScreeningsByDate,
  defaultFestivalDay,
  festivalDayLabel,
  festivalDayShortLabel,
  formatScreeningTail,
  formatScreeningTime,
  listScreeningVenues,
  selectDayScreenings,
  venueDisplayName,
} from '@/lib/festival/timetable'
import type { FestivalScreening } from '@/types/festival'

/**
 * 영화제 상영 시간표 — 구조화된 회차(festival_screenings)를 표로 그린다.
 *
 * 회차가 아직 0개면 "공개 전" 자리를 세운다. 영화제는 라인업이 먼저 나오고 시간표가
 * 몇 주 뒤에 나오는데, 그 사이 섹션을 통째로 감추면 관객이 "여긴 시간표가 없는 서비스"로
 * 읽고 떠난다 — 자리를 남겨 두고 언제 채워질지 알린다.
 *
 * 모바일은 시간순 리스트, 데스크톱은 표. 상영관 × 시간 그리드는 모바일 폭에서 못 읽는다.
 */

interface Props {
  screenings: FestivalScreening[]
  /** ISO date "YYYY-MM-DD" */
  startDate: string
  endDate: string
  today: string
  isDesktop: boolean
  /** 영화제 공식 시간표 주소 — 공개 전 안내에서 링크로 건다 */
  officialUrl?: string | null
}

const ALL_VENUES = '__all__'

export function FestivalTimetable({ screenings, startDate, endDate, today, isDesktop, officialUrl }: Props) {
  const days = useMemo(() => buildFestivalDays(startDate, endDate), [startDate, endDate])
  const [day, setDay] = useState<string | null>(() => defaultFestivalDay(days, today))
  const [venue, setVenue] = useState<string>(ALL_VENUES)

  const venues = useMemo(() => listScreeningVenues(screenings), [screenings])
  const countByDate = useMemo(() => countScreeningsByDate(screenings), [screenings])
  const rows = useMemo(
    () => (day ? selectDayScreenings(screenings, day, venue === ALL_VENUES ? null : venue) : []),
    [screenings, day, venue],
  )

  const description = screenings.length > 0
    ? '영화제 공식 발표 기준 — 예매·잔여석은 공식 예매처에서 확인해 주세요'
    : undefined

  return (
    <section style={{ paddingTop: isDesktop ? 48 : 32 }}>
      <SectionHeader title="상영 시간표" description={description} isDesktop={isDesktop} />

      {screenings.length === 0 ? (
        <UnpublishedNotice officialUrl={officialUrl} />
      ) : (
        <>
          {/* 날짜 탭 — 회기 전체를 세운다. 회차가 없는 날도 탭은 남아 "그날은 상영이 없다"를 보여준다 */}
          <div
            className="no-scrollbar"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px var(--gutter)' }}
            role="tablist"
            aria-label="상영 날짜"
          >
            {days.map((d) => (
              <Chip
                key={d}
                role="tab"
                aria-selected={d === day}
                selected={d === day}
                onClick={() => setDay(d)}
                style={{ flexShrink: 0, opacity: countByDate[d] ? 1 : 0.5 }}
              >
                {festivalDayShortLabel(d)}
              </Chip>
            ))}
          </div>

          {/* 상영관 필터 — 극장이 하나뿐이면 필터가 할 일이 없다 */}
          {venues.length > 1 && (
            <div
              className="no-scrollbar"
              style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 var(--gutter) 12px' }}
            >
              <Chip selected={venue === ALL_VENUES} onClick={() => setVenue(ALL_VENUES)} style={{ flexShrink: 0 }}>
                전체
              </Chip>
              {venues.map((v) => (
                <Chip key={v} selected={venue === v} onClick={() => setVenue(v)} style={{ flexShrink: 0 }}>
                  {v}
                </Chip>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <p style={{
              padding: '32px var(--gutter)', textAlign: 'center',
              fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)',
            }}>
              {day ? `${festivalDayLabel(day)}에 상영이 없어요` : '상영이 없어요'}
            </p>
          ) : isDesktop ? (
            <ScreeningTable rows={rows} />
          ) : (
            <ScreeningList rows={rows} />
          )}
        </>
      )}
    </section>
  )
}

/* ── 공개 전 자리 ──────────────────────────────────────────────── */

function UnpublishedNotice({ officialUrl }: { officialUrl?: string | null }) {
  return (
    <div style={{ padding: '12px var(--gutter)' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '32px var(--gutter)', textAlign: 'center',
        border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-control)',
      }}>
        <Icon name="calendar" size={22} strokeWidth={1.75} color="var(--color-text-caption)" />
        <p style={{ margin: 0, fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          상영 시간표는 공개 전이에요
        </p>
        <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-caption)', wordBreak: 'keep-all' }}>
          영화제가 회차를 발표하면 날짜·상영관별 표로 정리해 올려요. 공식 사이트에서 먼저 확인할 수도 있어요.
        </p>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
              fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-primary-text)', textDecoration: 'none',
            }}
          >
            공식 사이트에서 보기 <Icon name="external-link" size={14} strokeWidth={1.75} color="currentColor" />
          </a>
        )}
      </div>
    </div>
  )
}

/* ── 회차 표기 조각 ────────────────────────────────────────────── */

function ScreeningTitle({ row }: { row: FestivalScreening }) {
  return (
    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
      {normalizeTitle(row.movieTitleSnapshot)}
    </span>
  )
}

/* GV 배지 — Badge 프리미티브엔 보라(gv) 변형이 없다. GV는 지도 핀·포스터 칩과 같은
   --color-gv 브랜드 색을 쓰는 자리라, 다른 상태 배지 색으로 대체하면 의미가 흐려진다. */
function GvBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0 var(--spacing-1)',
      borderRadius: 'var(--radius-badge)', backgroundColor: 'var(--color-gv)',
      color: 'var(--color-on-accent)', fontSize: 'var(--text-badge)', fontWeight: 700, lineHeight: 1.6,
    }}>
      GV
    </span>
  )
}

/* ── 모바일: 시간순 리스트 ─────────────────────────────────────── */

function ScreeningList({ rows }: { rows: FestivalScreening[] }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 var(--gutter) 4px' }}>
      {rows.map((row) => (
        <div
          key={row.id}
          onClick={row.movieId ? () => router.push(`/films/movie/${row.movieId}`) : undefined}
          style={{
            display: 'flex', gap: 12, padding: 'var(--gutter-md)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--color-surface-card)',
            cursor: row.movieId ? 'pointer' : 'default',
          }}
        >
          <div style={{ flexShrink: 0, width: 52 }}>
            <div style={{ fontSize: 'var(--text-time)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
              {row.startTime.slice(0, 5)}
            </div>
            {row.screeningCode && (
              <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-text-caption)' }}>
                {row.screeningCode}
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 'var(--text-body)' }}>
              <ScreeningTitle row={row} />
              {row.hasGv && <GvBadge />}
            </div>
            <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              {venueDisplayName(row)}
              {row.section ? ` · ${row.section}` : ''}
            </div>
            {formatScreeningTail(row.startTime, row.runtimeMin) && (
              <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>
                {formatScreeningTail(row.startTime, row.runtimeMin)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── 데스크톱: 표 ──────────────────────────────────────────────── */

const TH: React.CSSProperties = {
  padding: 'var(--gutter-sm) var(--gutter-md)', textAlign: 'left', whiteSpace: 'nowrap',
  fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-caption)',
  borderBottom: '1px solid var(--color-border)',
}
const TD: React.CSSProperties = {
  padding: 'var(--gutter-md)', fontSize: 'var(--text-body)', color: 'var(--color-text-body)',
  borderBottom: '1px solid var(--color-border)', verticalAlign: 'top',
}

function ScreeningTable({ rows }: { rows: FestivalScreening[] }) {
  const router = useRouter()
  return (
    // 표는 컬럼이 다섯이라 좁은 창에서 넘친다 — 페이지가 아니라 이 컨테이너가 가로로 스크롤한다
    <div style={{ overflowX: 'auto', padding: '0 var(--gutter) 4px' }}>
      <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 132 }}>시간</th>
            <th style={TH}>상영작</th>
            <th style={{ ...TH, width: 200 }}>상영관</th>
            <th style={{ ...TH, width: 140 }}>섹션</th>
            <th style={{ ...TH, width: 72 }}>코드</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={row.movieId ? () => router.push(`/films/movie/${row.movieId}`) : undefined}
              style={{ cursor: row.movieId ? 'pointer' : 'default' }}
            >
              <td style={{ ...TD, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {formatScreeningTime(row.startTime, row.runtimeMin)}
              </td>
              <td style={TD}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <ScreeningTitle row={row} />
                  {row.hasGv && <GvBadge />}
                </span>
              </td>
              <td style={{ ...TD, color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)' }}>{venueDisplayName(row)}</td>
              <td style={{ ...TD, color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)' }}>{row.section ?? '—'}</td>
              <td style={{ ...TD, color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', fontFeatureSettings: '"tnum"' }}>{row.screeningCode ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
