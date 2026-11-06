'use client'

import type { ReactNode } from 'react'
import { Icon, Skeleton, ShowtimeCellSkeleton } from '@/components/primitives'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { ShowtimeCell } from '@/components/domain/ShowtimeCell'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlagsRaw } from '@/lib/nations'
import { showtimeKind, type ScheduleClock, type ShowtimeKind } from '@/lib/theater/schedule'
import type { Movie, Showtime } from '@/types/api'

const POSTER = { md: { w: 68, h: 102 }, lg: { w: 80, h: 120 } } as const

/** 극장 시간표의 영화 한 편 — 포스터·제목·정보 줄 + 그날 회차 3열.
 *  지도 극장 시트와 상영작 탭 극장 페이지가 같은 카드를 쓴다. */
export function TheaterMovieCard({
  movie,
  showtimes,
  clock,
  posterSize = 'md',
  selectedShowtimeId,
  onMovieOpen,
  onShowtimeClick,
  onShowtimeUnavailable,
  footer,
}: {
  movie: Movie
  showtimes: Showtime[]
  clock: ScheduleClock
  posterSize?: keyof typeof POSTER
  selectedShowtimeId?: string | null
  onMovieOpen: (movieId: string) => void
  onShowtimeClick: (st: Showtime) => void
  onShowtimeUnavailable?: (st: Showtime, kind: ShowtimeKind) => void
  /** 카드 아래 덧붙이는 행동 — 지도 시트의 "지도에서 이 영화 검색" 등 */
  footer?: ReactNode
}) {
  const poster = POSTER[posterSize]
  const meta = [
    movie.director[0],
    movie.nation ? withFlagsRaw(movie.nation) : undefined,
    movie.year,
    movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      borderRadius: 'var(--radius-popover)',
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => onMovieOpen(movie.id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 'var(--gutter)',
          padding: 'var(--gutter)', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', minHeight: 'auto',
        }}
      >
        <PosterThumb width={poster.w} height={poster.h} size="sm" radius="var(--radius-button)" alt={movie.title} src={movie.posterUrl} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <span style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {normalizeTitle(movie.title)}
          </span>
          {meta && (
            <span style={{ marginTop: 4, display: 'block', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
              {meta}
            </span>
          )}
          {movie.genre.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {movie.genre.slice(0, 2).map((g) => (
                <span key={g} style={{ fontSize: 'var(--text-badge)', padding: '4px 8px', borderRadius: 'var(--radius-pill)', lineHeight: 1, border: '1px solid var(--color-border)', color: 'var(--color-text-caption)', backgroundColor: 'var(--color-surface-raised)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <Icon name="chevron-right" size={16} />
      </button>

      {/* 회차 — 눌린 트레이 위 흰 셀 반전 (피그마 ShowtimeGroupCard) */}
      <div style={{ padding: '12px var(--gutter) var(--gutter)', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, backgroundColor: 'var(--color-neutral-100)' }}>
        {showtimes.map((st) => {
          const kind = showtimeKind(st, clock)
          return (
            <ShowtimeCell
              key={st.id}
              startTime={st.showTime.slice(0, 5)}
              endTime={st.endTime ? st.endTime.slice(0, 5) : ''}
              seatAvailable={st.seatAvailable}
              seatTotal={st.seatTotal}
              promo={/GV/i.test(st.screenName ?? '') ? 'GV' : undefined}
              kind={kind}
              selected={selectedShowtimeId === st.id}
              onClick={() => onShowtimeClick(st)}
              onUnavailableClick={onShowtimeUnavailable ? () => onShowtimeUnavailable(st, kind) : undefined}
            />
          )
        })}
      </div>
      {footer && <div style={{ borderTop: '1px solid var(--color-border)' }}>{footer}</div>}
    </div>
  )
}

/** 카드 로딩 자리표시 — 실제 카드와 같은 레이아웃으로 시프트 방지 */
export function TheaterMovieCardSkeleton({ posterSize = 'md' }: { posterSize?: keyof typeof POSTER }) {
  const poster = POSTER[posterSize]
  return (
    <div style={{ borderRadius: 'var(--radius-popover)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--gutter)', padding: 'var(--gutter)' }}>
        <Skeleton width={poster.w} height={poster.h} style={{ borderRadius: 'var(--radius-button)' }} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="45%" height={12} />
          <Skeleton width={88} height={18} rounded="full" />
        </div>
      </div>
      <div style={{ padding: '0 var(--gutter) var(--gutter)', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <ShowtimeCellSkeleton />
        <ShowtimeCellSkeleton />
        <ShowtimeCellSkeleton />
      </div>
    </div>
  )
}
