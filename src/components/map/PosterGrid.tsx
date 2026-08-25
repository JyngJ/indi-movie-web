'use client'

import { PosterThumb } from '@/components/domain'
import { BubbleTail } from '@/components/primitives'
import { finiteNumber } from '@/lib/map/searchUtils'
import { toSecureImageUrl } from '@/lib/media/imageUrl'
import { withFlag } from '@/lib/nations'
import { dayOfWeek } from '@/lib/map/posterLogic'
import type { TheaterPosterMovie, PosterSlot, ScreeningDay } from '@/lib/map/posterLogic'

/** 포스터 슬롯 간격 — 피그마 2.0/PosterPin 확정(카드 패딩 8 · 간격 8) */
const SLOT_GAP = 8

function dayLabelColor(day: ScreeningDay): string {
  if (day.label === '오늘') return 'var(--color-primary-base)'
  const dow = dayOfWeek(day.date)
  if (dow === 6) return 'var(--color-primary-500)'  /* 2.0: 토요일 — info 폐지, DateBar와 통일 */
  if (dow === 0) return 'var(--color-error)'
  return 'var(--color-text-caption)'
}

/** 관심 표시 하트 — 목록에서 이름 앞에 붙는다 */
function HeartGlyph() {
  return (
    <svg width={8} height={8} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

export function MovieListCard({ movies, favoriteMovieIds, favoriteDirectors }: {
  movies: TheaterPosterMovie[]
  /** 관심으로 걸린 쪽(제목·감독)에 옅은 빨강 배경을 깔아 왜 목록에 있는지 보여준다 (2026-08-18) */
  favoriteMovieIds?: ReadonlySet<string>
  favoriteDirectors?: ReadonlySet<string>
}) {
  return (
    <div className="po-list">
      <div className="po-list-tail" />
      {movies.slice(0, 10).map((m) => {
        const titleHit = favoriteMovieIds?.has(m.id) ?? false
        const director = m.director?.[0]
        const directorHit = !!director && (favoriteDirectors?.has(director) ?? false)
        return (
        <div key={m.id} className="po-list-item">
          <span className={`po-list-title${titleHit ? ' po-list-hit' : ''}`}>
            {titleHit && <HeartGlyph />}{m.title}
          </span>
          {director && (
            <span className="po-list-director"> — <span className={directorHit ? 'po-list-hit' : undefined}>
              {directorHit && <HeartGlyph />}{director}
            </span></span>
          )}
        </div>
        )
      })}
      {movies.length > 10 && (
        <div className="po-list-more">+{movies.length - 10}편 더</div>
      )}
    </div>
  )
}

/** 카드 우상단 코너 칩 — "N편 일치" / "+N" 공용 문법 */
function CornerChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)',
      borderRadius: 9999, padding: '4px 8px',
      fontSize: 'var(--text-badge)', fontWeight: 700, lineHeight: 1,
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      border: '1.5px solid var(--color-surface-bg)',
    }}>
      {children}
    </span>
  )
}

export function ScheduleRows({ days, showTimes = true }: {
  days: ScreeningDay[]
  showTimes?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SLOT_GAP }}>
      {days.map((day) => (
        <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: SLOT_GAP }}>
          <span style={{
            minWidth: 28, fontSize: 'var(--text-badge)', fontWeight: 500, whiteSpace: 'nowrap',
            color: dayLabelColor(day),
          }}>{day.label}</span>
          {showTimes && (
            <span style={{ display: 'flex', gap: 4 }}>
              {day.times.slice(0, 3).map((t) => (
                <span key={t} style={{
                  fontSize: 'var(--text-meta)',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-text-primary)',
                }}>{t}</span>
              ))}
              {day.times.length > 3 && (
                <span style={{ fontSize: 'var(--text-badge)', fontWeight: 500, color: 'var(--color-text-caption)', alignSelf: 'center' }}>
                  +{day.times.length - 3}
                </span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function PosterGrid({ slots, overflowCount = 0, tailDir, tailOffset = 0, matchCount, filtersActive = false, selected = false, posterW = 44, posterH = 66, allMovies, schedule, scheduleShowTimes = true, occurrenceCount, hideMatchChip = false, favoriteMovieIds, favoriteDirectors, favoriteCount = 0, hideOverflowChip = false }: {
  slots: PosterSlot[]
  /** 슬롯에 못 담은 편수 — 우상단 "+N" 칩 */
  overflowCount?: number
  tailDir?: 'up' | 'right'
  tailOffset?: number
  matchCount?: number
  filtersActive?: boolean
  selected?: boolean
  posterW?: number
  posterH?: number
  allMovies?: TheaterPosterMovie[]
  schedule?: ScreeningDay[]
  scheduleShowTimes?: boolean
  occurrenceCount?: number
  hideMatchChip?: boolean
  /** 관심 영화 id — 해당 포스터에 빨간 테두리 (P2, 핀 뱃지 대신) */
  favoriteMovieIds?: ReadonlySet<string>
  /** 관심 감독 이름 — 그 감독 작품도 같은 테두리 */
  favoriteDirectors?: ReadonlySet<string>
  /** 이 극장에서 상영 중인 관심 작품 수 — 카드 우상단 하트 캡슐 */
  favoriteCount?: number
  /** 관심 필터 모드 — '+N' 칩을 숨기고 하트 수만 (2026-08-18) */
  hideOverflowChip?: boolean
}) {
  const isFavMovie = (m?: { id: string; director?: string[] }) => !!m && ((favoriteMovieIds?.has(m.id) ?? false) || (m.director ?? []).some((d) => favoriteDirectors?.has(d)))
  /** 하트 칩 호버 목록 — 이 극장에서 상영 중인 관심 작품. allMovies가 없으면 보이는 슬롯에서 추린다 */
  const favoriteMovies = (allMovies ?? slots.map((s) => s.movie).filter((m): m is TheaterPosterMovie => !!m)).filter(isFavMovie)
  const count = slots.length
  const scheduleMode = !!schedule && schedule.length > 0 && count === 1
  const showMatchChip = !hideMatchChip && filtersActive && matchCount != null && matchCount > 0
  const perRow = count > 3 ? 3 : count
  const cardWidth = perRow * posterW + Math.max(0, perRow - 1) * SLOT_GAP + 16
  const tailInset = 14
  const safeTailOffset = finiteNumber(tailOffset)
  const tailX = scheduleMode
    ? cardWidth / 2
    : Math.max(tailInset, Math.min(cardWidth - tailInset, cardWidth / 2 - safeTailOffset))

  const tailBg = selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)'
  const tailBorder = selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)'

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      {tailDir && (
        <BubbleTail
          dir={tailDir}
          offset={scheduleMode ? '50%' : tailX}
          background={tailBg}
          border={tailBorder}
        />
      )}
      <div style={{
        backgroundColor: selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
        border: selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 8px 8px',
        boxShadow: selected ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        display: 'inline-block',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* 코너 칩 — 필터 일치수 · 넘친 편수 · 관심 수. 세로로 쌓고 관심은 맨 아래 (2026-08-18) */}
        {(showMatchChip || (overflowCount > 0 && !hideOverflowChip) || favoriteCount > 0) && (
          <div className="pm-chip-stack">
            {showMatchChip && <CornerChip>{matchCount}편 일치</CornerChip>}
            {overflowCount > 0 && !hideOverflowChip && (
              <span className="po-wrap" style={{ display: 'inline-flex' }}>
                <CornerChip>+{overflowCount}</CornerChip>
                {allMovies && allMovies.length > 0 && (
                  <MovieListCard movies={allMovies} favoriteMovieIds={favoriteMovieIds} favoriteDirectors={favoriteDirectors} />
                )}
              </span>
            )}
            {/* 관심 수 — 항상 표시. +N 아래에 고정해 +N 위치가 흔들리지 않게 (2026-08-18).
                호버 시 어떤 작품이 관심 대상인지 목록으로 보여준다 (+N 칩과 같은 문법) */}
            {favoriteCount > 0 && (
              <span className="po-wrap" style={{ display: 'inline-flex' }}>
              <span className="pm-heart-cap">
                <svg width={8} height={8} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }} aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, lineHeight: 1 }}>{favoriteCount}</span>
              </span>
              {favoriteMovies.length > 0 && (
                <MovieListCard movies={favoriteMovies} favoriteMovieIds={favoriteMovieIds} favoriteDirectors={favoriteDirectors} />
              )}
              </span>
            )}
          </div>
        )}
        {scheduleMode ? (
          <div data-movie-id={slots[0].movie?.id} style={{ display: 'flex', alignItems: 'stretch', gap: SLOT_GAP, position: 'relative', zIndex: 1 }}>
            {/* 포스터가 카드 세로를 꽉 채운다 — 폭은 2:3 비율에서 나온다 (피그마 2.0/PosterPinSchedule) */}
            <div style={{
              position: 'relative', flexShrink: 0,
              aspectRatio: '2 / 3', minHeight: posterH,
              borderRadius: 4, overflow: 'hidden',
              backgroundColor: 'var(--color-neutral-800)',
              boxShadow: isFavMovie(slots[0].movie)
                ? 'inset 0 0 0 2px var(--color-error-mid)'
                : 'inset 0 0 0 1px var(--comp-poster-border)',
            }}>
              {slots[0].movie?.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toSecureImageUrl(slots[0].movie.posterUrl)}
                  alt={slots[0].movie.title ?? '영화 포스터'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
              {occurrenceCount != null && occurrenceCount > 0 && (
                <div style={{
                  position: 'absolute', top: -8, right: -8,
                  backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)',
                  borderRadius: 9999, padding: '4px 8px', fontSize: 'var(--text-badge)', fontWeight: 700,
                  zIndex: 10, whiteSpace: 'nowrap',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  border: '1.5px solid var(--color-surface-bg)',
                }}>
                  {occurrenceCount}회
                </div>
              )}
            </div>
            {/* 실선 디바이더 — 점선에서 변경 (피그마 확정) */}
            <div style={{ width: 1, alignSelf: 'stretch', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: SLOT_GAP }}>
              <div style={{
                fontSize: 'var(--text-badge)', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap',
                color: 'var(--color-primary-base)', backgroundColor: 'var(--color-primary-subtle-l)',
                borderRadius: 9999, padding: '4px 8px',
              }}>
                상영 일정
              </div>
              <ScheduleRows days={schedule!} showTimes={scheduleShowTimes} />
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SLOT_GAP, position: 'relative', zIndex: 1 }}>
          {Array.from({ length: count > 3 ? 2 : 1 }).map((_, row) => (
            <div key={row} style={{ display: 'flex', gap: SLOT_GAP }}>
              {Array.from({ length: perRow }).map((_, col) => {
                const idx = row * perRow + col
                const slot = slots[idx]
                if (!slot) return null
                return (
                    <div key={idx} data-movie-id={slot.movie?.id} className="pm-wrap" style={{ position: 'relative', width: posterW, height: posterH }}>
                      <PosterThumb
                        src={slot.movie?.posterUrl}
                        alt={slot.movie?.title ?? '영화 포스터'}
                        width={posterW}
                        height={posterH}
                        size="sm"
                        radius={4} /* 지도 포스터 예외 — 최소 라운딩(--radius-badge 값) */
                        /* 이 트리는 renderToStaticMarkup으로 divIcon HTML이 된다 —
                           onLoad가 안 붙으니 페이드를 켜면 opacity:0으로 굳는다 */
                        fade={false}
                        /* 관심 빨간 링이 붙으면 필터 하이라이트(파란 테두리)는 뺀다 — 테두리 두 겹 방지 (2026-08-18) */
                        highlighted={filtersActive && !!slot.movie?.matchesFilter && !isFavMovie(slot.movie)}
                      />
                      {/* 관심 영화·감독 — 포스터 빨간 테두리 (핀 뱃지 대신, 2026-08-17 확정).
                          hover 확대는 .pm-wrap > div:first-child(포스터)를 노리므로 링은 반드시 포스터 뒤에 온다. */}
                      {isFavMovie(slot.movie) && (
                        <div className="pm-fav-ring" style={{ position: 'absolute', inset: -2, borderRadius: 'calc(var(--radius-badge) + 2px)', boxShadow: '0 0 0 2px var(--color-error-mid)', zIndex: 2, pointerEvents: 'none' }} />
                      )}
                      {slot.movie && (
                        <div className="pm-tip">
                          <div className="pm-tip-title">{slot.movie.title}</div>
                          {slot.movie.director?.[0] && (
                            <div className="pm-tip-director">{slot.movie.director[0]}</div>
                          )}
                          {(slot.movie.genre.length > 0 || slot.movie.nation) && (
                            <div className="pm-tip-genres">
                              {slot.movie.genre.slice(0, 2).map((g) => (
                                <span key={g} className="pm-tip-genre-tag">{g}</span>
                              ))}
                              {slot.movie.nation && (
                                <span className="pm-tip-genre-tag">{withFlag(slot.movie.nation.split(/[,，/·]+/)[0].trim())}</span>
                              )}
                            </div>
                          )}
                          {slot.movie.showtimesToday && slot.movie.showtimesToday.length > 0 && (
                            <>
                              <div className="pm-tip-today-label">오늘 상영 정보</div>
                              <div className="pm-tip-times">
                                {slot.movie.showtimesToday.slice(0, 5).map((s, i) => (
                                  <span key={i} className={`pm-tip-time${s.soldout ? ' pm-tip-time--soldout' : ''}${s.past ? ' pm-tip-time--past' : ''}`}>
                                    {s.time}{s.soldout && !s.past ? ' 매진' : ''}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                          <div className="pm-tip-tail" />
                        </div>
                      )}
                    </div>
                )
              })}
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
