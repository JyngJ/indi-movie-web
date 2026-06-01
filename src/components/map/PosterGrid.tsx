'use client'

import { PosterThumb } from '@/components/domain'
import { finiteNumber } from '@/lib/map/searchUtils'
import type { TheaterPosterMovie, PosterSlot } from '@/lib/map/posterLogic'

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

export function PosterGrid({ slots, tailDir, tailOffset = 0, matchCount, filtersActive = false, selected = false, posterW = 44, posterH = 66, allMovies }: {
  slots: PosterSlot[]
  tailDir?: 'up' | 'right'
  tailOffset?: number
  matchCount?: number
  filtersActive?: boolean
  selected?: boolean
  posterW?: number
  posterH?: number
  allMovies?: TheaterPosterMovie[]
}) {
  const count = slots.length
  const perRow = count > 3 ? 3 : count
  const cardWidth = perRow * posterW + Math.max(0, perRow - 1) * 4 + 16
  const tailInset = 14
  const safeTailOffset = finiteNumber(tailOffset)
  const tailX = Math.max(tailInset, Math.min(cardWidth - tailInset, cardWidth / 2 - safeTailOffset))

  const tailBg = selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)'
  const tailBorder = selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)'

  const tailStyle: React.CSSProperties | null = tailDir === 'up' ? {
    position: 'absolute', width: 10, height: 10,
    backgroundColor: tailBg, borderTop: tailBorder, borderRight: tailBorder,
    borderTopRightRadius: 2, top: -6, left: tailX,
    transform: 'translateX(-50%) rotate(45deg)', zIndex: 0, pointerEvents: 'none',
  } : tailDir === 'right' ? {
    position: 'absolute', width: 10, height: 10,
    backgroundColor: tailBg, borderRight: tailBorder, borderBottom: tailBorder,
    borderBottomRightRadius: 2, top: '50%', right: -6,
    transform: 'translateY(-50%) rotate(45deg)', zIndex: 0, pointerEvents: 'none',
  } : null

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      {tailStyle && <div style={tailStyle} />}
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
        {filtersActive && matchCount != null && matchCount > 0 && (
          <div style={{
            position: 'absolute', top: -8, right: -8,
            backgroundColor: 'var(--color-primary-base)', color: '#fff',
            borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 700,
            zIndex: 10, whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            border: '1.5px solid var(--color-surface-bg)',
          }}>
            {matchCount}편 일치
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 1 }}>
          {Array.from({ length: count > 3 ? 2 : 1 }).map((_, row) => (
            <div key={row} style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: perRow }).map((_, col) => {
                const idx = row * perRow + col
                const slot = slots[idx]
                if (!slot) return null
                return (
                  slot.countLabel ? (
                    <div key={idx} className="po-wrap" style={{ position: 'relative', width: posterW, height: posterH }}>
                      <div style={{
                        width: posterW, height: posterH,
                        borderRadius: 'var(--comp-poster-radius)',
                        backgroundColor: 'var(--color-primary-base)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 800,
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                        whiteSpace: 'nowrap',
                      }}>
                        {slot.countLabel}
                      </div>
                      {allMovies && allMovies.length > 0 && <MovieListCard movies={allMovies} />}
                    </div>
                  ) : (
                    <div key={idx} data-movie-id={slot.movie?.id} className={slot.overflow ? 'po-wrap' : 'pm-wrap'} style={{ position: 'relative', width: posterW, height: posterH, opacity: slot.dimmed ? 0.5 : 1 }}>
                      <PosterThumb
                        src={slot.movie?.posterUrl}
                        alt={slot.movie?.title ?? ''}
                        width={posterW}
                        height={posterH}
                        size="sm"
                        overflow={slot.overflow}
                        highlighted={filtersActive && !slot.dimmed && !slot.overflow && !!slot.movie?.matchesFilter}
                      />
                      {slot.dimmed && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          borderRadius: 'var(--comp-poster-radius)',
                          backgroundColor: 'rgba(0,0,0,0.45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.3 }}>
                            조건{'\n'}외
                          </span>
                        </div>
                      )}
                      {slot.movie && !slot.overflow && (
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
                                <span className="pm-tip-genre-tag">{slot.movie.nation.split(/[,，/·]+/)[0].trim()}</span>
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
                      {slot.overflow && allMovies && allMovies.length > 0 && <MovieListCard movies={allMovies} />}
                    </div>
                  )
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
