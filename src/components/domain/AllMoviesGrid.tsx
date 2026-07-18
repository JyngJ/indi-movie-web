'use client'

import { useState } from 'react'
import type { Movie } from '@/types/api'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { Film } from 'lucide-react'

type SortKey = 'theaters_desc' | 'theaters_asc' | 'year_desc' | 'year_asc' | 'alpha'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'theaters_desc', label: '상영관 많은 순' },
  { value: 'theaters_asc', label: '상영관 적은 순' },
  { value: 'year_desc',    label: '최신 영화 순' },
  { value: 'year_asc',     label: '오래된 영화 순' },
  { value: 'alpha',        label: '가나다 순' },
]

function sortMovies(
  movies: Movie[],
  sortKey: SortKey,
  theaterCountByMovie: Map<string, number>,
): Movie[] {
  const copy = [...movies]
  switch (sortKey) {
    case 'theaters_desc':
      return copy.sort((a, b) => (theaterCountByMovie.get(b.id) ?? 0) - (theaterCountByMovie.get(a.id) ?? 0))
    case 'theaters_asc':
      return copy.sort((a, b) => (theaterCountByMovie.get(a.id) ?? 0) - (theaterCountByMovie.get(b.id) ?? 0))
    case 'year_desc':
      return copy.sort((a, b) => b.year - a.year)
    case 'year_asc':
      return copy.sort((a, b) => a.year - b.year)
    case 'alpha':
      return copy.sort((a, b) => normalizeTitle(a.title).localeCompare(normalizeTitle(b.title), 'ko'))
  }
}

function GridPoster({ src, alt }: { src?: string; alt: string }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '2/3',
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        background: 'oklch(0.32 0.04 220)',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%',
            backgroundImage: 'repeating-linear-gradient(135deg, oklch(0.38 0.04 220) 0 6px, transparent 6px 14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 5px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {alt}
          </span>
        </div>
      )}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 0, pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)',
        }}
      />
    </div>
  )
}

interface Props {
  movies: Movie[]
  isDesktop: boolean
  regionLabel?: string
  theaterCountByMovie?: Map<string, number>
  onMovieClick?: (movieId: string) => void
}

export function AllMoviesGrid({ movies, isDesktop, regionLabel, theaterCountByMovie, onMovieClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('theaters_desc')

  if (movies.length === 0) return null

  const tcMap = theaterCountByMovie ?? new Map<string, number>()
  const sorted = sortMovies(movies, sortKey, tcMap)
  const regionText = regionLabel ? `${regionLabel} ` : ''

  const logoSize = isDesktop ? 120 : 90
  const bottomSafeArea = isDesktop ? 32 : GLOBAL_NAV_MOBILE_HEIGHT + 24

  return (
    <>
      {/* 구분선 — 특별전 상영작 배경색과 통일 */}
      <div style={{
        height: 8,
        width: '100%',
        backgroundColor: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        marginTop: 32,
      }} />

      <section>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: isDesktop ? '20px 16px 0' : '16px 16px 0',
          gap: 8,
        }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isDesktop ? 20 : 17,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Film size={20} strokeWidth={1.75} color="var(--color-primary-base)" /> 지금 {regionText}상영 전체
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-caption)' }}>
              {movies.length}편 상영 중
            </p>
          </div>

          {/* 정렬 드롭다운 */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-body)',
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: 28,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop
              ? 'repeat(auto-fill, minmax(160px, 1fr))'
              : 'repeat(3, 1fr)',
            gap: isDesktop ? 20 : 12,
            padding: isDesktop ? '16px 16px 0' : '14px 12px 0',
          }}
        >
          {sorted.map((movie) => (
            <div
              key={movie.id}
              onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                cursor: onMovieClick ? 'pointer' : undefined,
              }}
            >
              <GridPoster src={movie.posterUrl} alt={movie.title} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: isDesktop ? 13 : 12,
                    fontWeight: 700,
                    color: 'var(--color-text-body)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.3,
                  }}
                >
                  {normalizeTitle(movie.title)}
                </span>

                {movie.director.length > 0 && (
                  <span
                    style={{
                      fontSize: isDesktop ? 12 : 11,
                      color: 'var(--color-text-caption)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {movie.director[0]}
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {movie.genre.slice(0, 1).map((g) => (
                    <span
                      key={g}
                      style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 99,
                        background: 'var(--color-surface-raised)',
                        color: 'var(--color-text-caption)',
                        border: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                  <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontWeight: 600 }}>
                    {movie.year}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 로고 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 48,
          paddingBottom: bottomSafeArea,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="영화볼지도"
            width={logoSize}
            style={{ opacity: 0.6 }}
          />
        </div>
      </section>
    </>
  )
}
