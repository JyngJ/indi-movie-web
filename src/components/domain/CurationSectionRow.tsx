'use client'

import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { Movie } from '@/types/api'

interface CurationSectionRowProps {
  title: string
  movies: Movie[]
  /** 데스크톱에서는 포스터/제목을 더 크게 표시 */
  isDesktop?: boolean
}

const POSTER_SIZE = {
  mobile: { width: 96, height: 144 },
  desktop: { width: 140, height: 210 },
}

/** 영화 탭 큐레이션 섹션 — 가로 스크롤 포스터 1줄 (구현 1) */
export function CurationSectionRow({ title, movies, isDesktop = false }: CurationSectionRowProps) {
  const { width, height } = isDesktop ? POSTER_SIZE.desktop : POSTER_SIZE.mobile

  return (
    <section style={{ paddingTop: 20 }}>
      <h2
        style={{
          margin: 0,
          padding: '0 16px',
          fontSize: isDesktop ? 20 : 17,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h2>
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: isDesktop ? 16 : 10,
          overflowX: 'auto',
          padding: '12px 16px',
        }}
      >
        {movies.map((movie) => (
          <div key={movie.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, width }}>
            <PosterThumb src={movie.posterUrl} alt={movie.title} width={width} height={height} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: isDesktop ? 15 : 13,
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
                    fontSize: isDesktop ? 13 : 11,
                    color: 'var(--color-text-caption)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {movie.director.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
