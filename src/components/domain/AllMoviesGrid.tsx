'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Movie } from '@/types/api'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { RevealItem } from '@/components/motion'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { trackEvent } from '@/lib/analytics/client'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'
import { FooterWordmark } from '@/components/domain/FooterWordmark'
import { PosterThumb } from './PosterThumb'

/** CTA 밴드가 스크롤 목적지로 쓰는 앵커 id — 호출부가 문자열을 재입력하지 않게 내보낸다 */
export const ALL_MOVIES_GRID_ANCHOR_ID = 'all-movies-grid'

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

function GridPoster({ src, alt, interactive, onReady }: { src?: string; alt: string; interactive?: boolean; onReady?: () => void }) {
  return (
    <PosterThumb
      fluid
      lazy
      src={src}
      alt={alt}
      radius={0}
      shadow={false}
      fade={false}
      onReady={onReady}
      className={interactive ? 'hover-lift' : undefined}
    />
  )
}

/**
 * 그리드 카드 한 장 — 포스터가 실제로 그려진 뒤에야 등장 모션을 재생한다.
 * 이미지가 없는 영화(제목 타일 대체)는 기다릴 게 없으므로 바로 준비 완료.
 */
function GridCard({
  movie,
  staggerIndex,
  interactive,
  onClick,
  children,
}: {
  movie: Movie
  staggerIndex: number
  interactive: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(!movie.posterUrl)

  return (
    <RevealItem
      preset="slide"
      ready={ready}
      staggerIndex={staggerIndex}
      /* 전체 그리드는 빠르게 — 화면에 닿기 전(아래 10% 여유)부터, 살짝만 보여도 시작.
         행 캐러셀보다 이르게 잡는 이유: 세로로 계속 훑는 화면이라 늦게 뜨면 빈칸이 먼저 눈에 든다 */
      rootMargin="0px 0px 10% 0px"
      threshold={0.05}
      settleMs={0}
      readyTimeoutMs={600}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
    >
      <GridPoster
        src={movie.posterUrl}
        alt={movie.title}
        interactive={interactive}
        onReady={() => setReady(true)}
      />
      {children}
    </RevealItem>
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
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('theaters_desc')

  /* 무한 로드 — 훅은 얼리 리턴보다 항상 먼저 (Rules of Hooks) */
  const CHUNK = isDesktop ? 12 : 9   /* 3줄씩 (웹 4열·모바일 3열) */
  const [visibleCount, setVisibleCount] = useState(CHUNK)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const hasMore = visibleCount < movies.length
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || loadingMore) return
      setLoadingMore(true)
      // 고스트가 한 프레임이라도 보이게 — 렌더 자체는 동기라 짧은 지연 후 확장
      setTimeout(() => { setVisibleCount((c) => c + CHUNK); setLoadingMore(false) }, 250)
    }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadingMore, CHUNK])

  /* 맨 아래 폴백 그리드. 큐레이션 행을 지나쳐 여기까지 온 비율을 알아야
     "위 섹션들이 제 역할을 했는가"를 판단할 수 있다. */
  const sectionRef = useRef<HTMLElement>(null)
  const analytics = buildSectionAnalytics({
    listId: 'all_movies_grid', sectionTitle: '전체 상영작',
    run: 'fixed_bottom', movieCount: movies.length, layout: 'grid',
  })
  useSectionDwellTracking(sectionRef, movies.length > 0 ? 'all_movies_grid' : undefined, analytics)

  if (movies.length === 0) return null

  const tcMap = theaterCountByMovie ?? new Map<string, number>()
  const sorted = sortMovies(movies, sortKey, tcMap)
  const regionText = regionLabel ? `${regionLabel} ` : ''


  return (
    <>
      {/* 구분선 — 특별전 상영작 배경색과 통일.
          id는 상단 CTA 밴드(AllMoviesCtaBand)가 스크롤로 찾아오는 앵커다. 섹션이 아니라
          구분선에 거는 이유: 여기 걸어야 그리드 제목줄이 화면 맨 위에 딱 붙지 않는다. */}
      <div id={ALL_MOVIES_GRID_ANCHOR_ID} style={{
        height: 8,
        width: '100%',
        backgroundColor: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        marginTop: isDesktop ? 64 : 32,
      }} />

      <section ref={sectionRef}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: isDesktop ? '20px var(--gutter) 0' : '16px var(--gutter) 0',
          gap: 8,
        }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isDesktop ? 'var(--text-h2)' : 'var(--text-h3)',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              지금 {regionText}상영 전체
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: isDesktop ? 'var(--text-meta)' : 'var(--text-caption)', color: 'var(--color-text-caption)' }}>
              {movies.length}편 상영 중
            </p>
          </div>

          {/* 정렬 드롭다운 */}
          <select className="hover-raise"
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
              padding: '8px 12px',
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

        {/* 그리드 — 각 카드는 "화면에 들어옴 + 포스터 디코드 완료" 뒤에 뜬다 (RevealItem) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop
              ? 'repeat(4, 1fr)'   /* 웹: 한 줄 4개 고정 */
              : 'repeat(3, 1fr)',
            gap: isDesktop ? 20 : 12,
            padding: isDesktop ? '16px var(--gutter-sheet) 0' : '14px var(--gutter-sheet) 0',
          }}
        >
          {sorted.slice(0, visibleCount).map((movie, i) => (
            <GridCard
              key={movie.id}
              movie={movie}
              /* 한 행 안에서만 계단식 — 아래 행은 스크롤해 들어올 때 각자 재생된다 */
              staggerIndex={i % (isDesktop ? 4 : 3)}
              interactive={!!onMovieClick}
              onClick={onMovieClick ? () => {
                trackEvent('curation movie selected', {
                  ...analytics, movie_id: movie.id, movie_title: movie.title,
                  grid_index: i, sort: sortKey,
                })
                onMovieClick(movie.id)
              } : undefined}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: isDesktop ? 'var(--text-title)' : 'var(--text-subtitle)',
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
                    className="caption-link"
                    role="button"
                    onClick={(e) => { e.stopPropagation(); router.push(`/films/director/${encodeURIComponent(movie.director[0])}`) }}
                    style={{
                      fontSize: 'var(--text-meta)',
                      color: 'var(--color-text-caption)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      alignSelf: 'flex-start',
                      maxWidth: '100%',
                      minHeight: 'auto',
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
                        padding: '4px',
                        borderRadius: 9999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
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
            </GridCard>
          ))}
          {loadingMore && Array.from({ length: isDesktop ? 4 : 3 }).map((_, i) => (
            <div key={`ghost_${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: '100%', aspectRatio: '2/3', backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 120}ms` }} />
              <div style={{ width: '70%', height: 12, borderRadius: 4, backgroundColor: 'var(--color-border)', animation: 'poster-wave 1.5s ease-in-out infinite', animationDelay: `${i * 120}ms` }} />
            </div>
          ))}
        </div>
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        <FooterWordmark isDesktop={isDesktop} />
      </section>
    </>
  )
}
