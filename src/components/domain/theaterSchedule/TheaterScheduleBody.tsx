'use client'

import type { ReactNode } from 'react'
import { Button, EmptyState, Icon } from '@/components/primitives'
import { TheaterMovieCard, TheaterMovieCardSkeleton } from './TheaterMovieCard'
import type { TheaterSchedule } from '@/hooks/useTheaterSchedule'
import type { MovieShowtimeGroup, ShowtimeKind } from '@/lib/theater/schedule'
import type { Movie, Showtime } from '@/types/api'

function QueryFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        message={message}
        paddingY={32}
        style={{ gap: 16 }}
        action={
          <Button variant="secondary" size="md" onClick={onRetry}>
            <Icon name="rotate-cw" size="md" />
            다시 불러오기
          </Button>
        }
      />
    </div>
  )
}

/**
 * 극장 하루치 시간표 본문 — 제목 줄 + 영화 카드 목록.
 * 지도 극장 시트와 상영작 탭 극장 페이지가 같은 본문을 쓰고, 그릇(시트·페이지)만 다르다.
 * 날짜 탭은 그릇마다 붙는 자리(sticky 기준)가 달라 밖에 둔다.
 */
export function TheaterScheduleBody({
  schedule,
  groups = schedule.groups,
  columns = 1,
  headingTrailing,
  countLabel,
  onMovieOpen,
  onShowtimeSelected,
  onShowtimeUnavailable,
  renderCardFooter,
}: {
  schedule: TheaterSchedule
  /** 필터를 건 결과 — 없으면 그날 전체 */
  groups?: MovieShowtimeGroup<Movie, Showtime>[]
  columns?: 1 | 2
  /** 제목 줄 오른쪽 — 지도 시트의 필터 등 */
  headingTrailing?: ReactNode
  /** 편수 표기를 바꿀 때 — 필터 적용 중 "3/6편" */
  countLabel?: string
  onMovieOpen: (movieId: string) => void
  /** 회차를 새로 골랐을 때 (선택 해제는 부르지 않는다) */
  onShowtimeSelected?: (st: Showtime) => void
  onShowtimeUnavailable?: (st: Showtime, kind: ShowtimeKind) => void
  renderCardFooter?: (movie: Movie) => ReactNode
}) {
  const posterSize = columns === 2 ? 'lg' : 'md'
  const grid = columns === 2
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--gutter)' } as const
    : { display: 'flex', flexDirection: 'column', gap: 12 } as const

  return (
    <div>
      {schedule.moviesError && (
        <QueryFailure message="상영작을 불러오지 못했어요" onRetry={() => { void schedule.retryMovies() }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--gutter)' }}>
        <span style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
          {/* 미래 날짜에 "현재 상영 중"은 거짓말 — 오늘만 현재고, 나머지는 그날의 목록이다 */}
          {schedule.isToday ? '현재 상영 중' : '이 날의 상영작'}
          <span style={{ fontSize: 'var(--text-title)', color: 'var(--color-primary-base)' }}>
            {countLabel ?? `${groups.length}편`}
          </span>
        </span>
        {headingTrailing}
      </div>

      {schedule.showtimesLoading ? (
        <div style={grid}>
          {[0, 1, 2].map((i) => <TheaterMovieCardSkeleton key={i} posterSize={posterSize} />)}
        </div>
      ) : schedule.showtimesError ? (
        <QueryFailure message="상영 시간표를 불러오지 못했어요" onRetry={() => { void schedule.retryShowtimes() }} />
      ) : groups.length === 0 ? (
        <EmptyState message="선택한 날짜에 상영 정보가 없어요" paddingY={40} />
      ) : (
        <>
          <div className="reveal-rise" style={grid}>
            {groups.map(({ movie, showtimes }) => (
              <div key={movie.id} data-movie-anchor={movie.id} style={{ minWidth: 0 }}>
                <TheaterMovieCard
                  movie={movie}
                  showtimes={showtimes}
                  clock={schedule.clock}
                  posterSize={posterSize}
                  selectedShowtimeId={schedule.selectedShowtimeId}
                  onMovieOpen={onMovieOpen}
                  onShowtimeClick={(st) => {
                    const picked = schedule.toggleShowtime(st)
                    if (picked) onShowtimeSelected?.(picked)
                  }}
                  onShowtimeUnavailable={onShowtimeUnavailable}
                  footer={renderCardFooter?.(movie)}
                />
              </div>
            ))}
          </div>
          <p style={{ margin: 'var(--gutter) 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', textAlign: 'center', lineHeight: 1.5 }}>
            좌석 정보는 실시간이 아니라서<br />실제 현황과 다를 수 있어요
          </p>
        </>
      )}
    </div>
  )
}
