'use client'

import { useEffect, useRef, useState } from 'react'
import type { Movie } from '@/types/api'
import { ScrollNavButton } from '@/components/primitives'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { trackEvent } from '@/lib/analytics/client'
import { toSecureImageUrl } from '@/lib/media/imageUrl'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'
import { useDirectorProfile } from '@/lib/supabase/queries'
import { scrollRailBy } from '@/lib/ui/railScroll'

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
        gap: 8,
        width: size + 16,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div
        className={onClick ? 'hover-lift' : undefined}
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
            src={toSecureImageUrl(photoUrl)}
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
        <strong style={{ color: 'var(--color-primary-base)', fontWeight: 700 }}>
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [rowHovered, setRowHovered] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  function updateScrollEdge() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  // 마운트·데이터 변경 시 측정 — 안 하면 넘칠 게 없어도 hover 버튼이 떠서 헛클릭 유발
  useEffect(() => { updateScrollEdge() }, [movies, activeMovieIds])

  const directors = getSpotlight(movies, activeMovieIds)

  /* 하단 고정 섹션. 스크롤 끝까지 내려온 사람만 보므로 체류가 짧게 나오는 게 정상이고,
     그걸 확인하려면 계측이 있어야 한다 (여기까지 오는 사람이 얼마나 되는지 포함) */
  const sectionRef = useRef<HTMLElement>(null)
  const analytics = buildSectionAnalytics({
    listId: 'director_spotlight', sectionTitle: '감독 스포트라이트',
    run: 'fixed_bottom', movieCount: directors.length, layout: 'avatar',
  })
  useSectionDwellTracking(sectionRef, directors.length > 0 ? 'director_spotlight' : undefined, analytics)

  if (directors.length === 0) return null

  return (
    <section ref={sectionRef} style={{ paddingTop: isDesktop ? 56 : 28 }}>
      <div style={{ padding: '0 var(--gutter-sheet)' }}>
        <h2
          className="display-h2"
          style={{
            margin: 0,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          감독 스포트라이트
        </h2>
      </div>

      <div
        style={{ position: 'relative' }}
        onMouseEnter={isDesktop ? () => setRowHovered(true) : undefined}
        onMouseLeave={isDesktop ? () => setRowHovered(false) : undefined}
      >
        {isDesktop && rowHovered && canScrollLeft && (
          <ScrollNavButton direction="left" style={{ zIndex: 3 }}
            onClick={() => scrollRailBy(scrollRef.current, -400)} />
        )}
        {isDesktop && rowHovered && canScrollRight && (
          <ScrollNavButton direction="right" style={{ zIndex: 3 }}
            onClick={() => scrollRailBy(scrollRef.current, 400)} />
        )}
      <div
        ref={scrollRef}
        onScroll={updateScrollEdge}
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: isDesktop ? 'var(--spacing-5)' : 14,
          overflowX: 'auto',
          padding: '12px var(--gutter-sheet) 8px',
        }}
      >
        {directors.map((dir) => (
          <DirectorCard
            key={dir.name}
            director={dir}
            isDesktop={isDesktop}
            onClick={onDirectorClick ? () => {
              trackEvent('curation director selected', { ...analytics, director: dir.name })
              onDirectorClick(dir.name)
            } : undefined}
          />
        ))}
      </div>
      </div>
    </section>
  )
}
