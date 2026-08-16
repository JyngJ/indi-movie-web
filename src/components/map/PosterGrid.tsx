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

export function MovieListCard({ movies }: { movies: TheaterPosterMovie[] }) {
  return (
    <div className="po-list">
      <div className="po-list-tail" />
      {movies.slice(0, 10).map((m) => (
        <div key={m.id} className="po-list-item">
          <span className="po-list-title">{m.title}</span>
          {m.director?.[0] && <span className="po-list-director"> — {m.director[0]}</span>}
        </div>
      ))}
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

export function PosterGrid({ slots, overflowCount = 0, tailDir, tailOffset = 0, matchCount, filtersActive = false, selected = false, posterW = 44, posterH = 66, allMovies, schedule, scheduleShowTimes = true, occurrenceCount, hideMatchChip = false }: {
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
}) {
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
        {/* 코너 칩 — 필터 일치수 · 넘친 편수. 둘 다면 가로로 붙는다 */}
        {(showMatchChip || overflowCount > 0) && (
          <div style={{
            position: 'absolute', top: -8, right: -8, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {showMatchChip && <CornerChip>{matchCount}편 일치</CornerChip>}
            {overflowCount > 0 && (
              <span className="po-wrap" style={{ display: 'inline-flex' }}>
                <CornerChip>+{overflowCount}</CornerChip>
                {allMovies && allMovies.length > 0 && <MovieListCard movies={allMovies} />}
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
              boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)',
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
                        highlighted={filtersActive && !!slot.movie?.matchesFilter}
                      />
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
