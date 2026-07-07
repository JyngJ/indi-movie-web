'use client'

import type { Movie } from '@/types/api'
import { useDirectorProfile } from '@/lib/supabase/queries'
import { Trophy } from 'lucide-react'

interface DirectorSpotlight {
  name: string
  movieCount: number
}

interface DirectorSpotlightSectionProps {
  movies: Movie[]
  activeMovieIds: ReadonlySet<string>
  isDesktop: boolean
  onDirectorClick?: (name: string) => void
}

const AVATAR_COLORS = [
  '#2C3E50',
  '#7B2D2D',
  '#2D5A27',
  '#4A2D6B',
  '#5C4A1C',
  '#1A4A5C',
  '#5C2D1A',
]

function hashColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function getSpotlight(movies: Movie[], activeMovieIds: ReadonlySet<string>): DirectorSpotlight[] {
  const directorMovies = new Map<string, Set<string>>()

  for (const movie of movies) {
    if (!activeMovieIds.has(movie.id)) continue
    for (const dir of movie.director) {
      if (!directorMovies.has(dir)) directorMovies.set(dir, new Set())
      directorMovies.get(dir)!.add(movie.id)
    }
  }

  return [...directorMovies.entries()]
    .filter(([, ids]) => ids.size >= 2)
    .map(([name, ids]) => ({ name, movieCount: ids.size }))
    .sort((a, b) => b.movieCount - a.movieCount)
    .slice(0, 12)
}

function DirectorCard({ director, isDesktop, onClick }: { director: DirectorSpotlight; isDesktop: boolean; onClick?: () => void }) {
  const size = isDesktop ? 80 : 64
  const color = hashColor(director.name)
  const { data: profile } = useDirectorProfile(director.name)
  const photoUrl = profile?.photoUrl

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-1-5)',
        width: size + 16,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: photoUrl ? 'transparent' : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={director.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            loading="lazy"
          />
        ) : (
          <span
            style={{
              fontSize: size * 0.38,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--font-display)',
              userSelect: 'none',
            }}
          >
            {director.name.charAt(0)}
          </span>
        )}
      </div>

      <span
        style={{
          fontSize: isDesktop ? 13 : 12,
          fontWeight: 700,
          color: 'var(--color-text-body)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: size + 16,
        }}
      >
        {director.name}
      </span>

      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', whiteSpace: 'nowrap' }}>
        상영중{' '}
        <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
          {director.movieCount}
        </strong>
        편
      </span>
    </div>
  )
}

export function DirectorSpotlightSection({
  movies,
  activeMovieIds,
  isDesktop,
  onDirectorClick,
}: DirectorSpotlightSectionProps) {
  const directors = getSpotlight(movies, activeMovieIds)

  if (directors.length === 0) return null

  return (
    <section style={{ paddingTop: 28 }}>
      <div style={{ padding: '0 16px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: isDesktop ? 'var(--text-h3)' : 'var(--text-title)',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Trophy size={24} strokeWidth={2} color="var(--color-primary-base)" /> 감독 스포트라이트
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-caption)' }}>
          지금 주목할 만한 감독
        </p>
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: isDesktop ? 'var(--spacing-5)' : 14,
          overflowX: 'auto',
          padding: '12px 16px 8px',
        }}
      >
        {directors.map((dir) => (
          <DirectorCard
            key={dir.name}
            director={dir}
            isDesktop={isDesktop}
            onClick={onDirectorClick ? () => onDirectorClick(dir.name) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
