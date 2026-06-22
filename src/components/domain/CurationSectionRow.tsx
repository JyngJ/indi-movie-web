'use client'

import { useEffect, useRef, useState } from 'react'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { SectionDisplayMode } from '@/lib/curation/filmsTabLists'
import { withFlag } from '@/lib/nations'
import type { Movie } from '@/types/api'

interface CurationSectionRowProps {
  title: string
  emoji: string
  description?: string
  displayMode: SectionDisplayMode
  movies: Movie[]
  isDesktop?: boolean
  /** movieId → 남은 일수 (0 = 오늘이 마지막) — 포스터 우상단 D-N 배지 */
  posterBadges?: Map<string, number>
  onMovieClick?: (movieId: string) => void
  /** true면 h2 제목/설명 영역을 렌더하지 않음 (AnniversarySection 등 외부 헤더 사용 시) */
  noHeader?: boolean
  /** compact: 외부 여백 없이 flex item으로 렌더 — 1~2편 섹션을 2열로 묶을 때 사용 */
  compact?: boolean
  id?: string
}

const POSTER_SIZE = {
  mobile: { width: 96, height: 144 },
  desktop: { width: 140, height: 210 },
}

/* ── 포스터 하단 정보: 제목 / 감독 / 장르칩+연도 ───────────────── */
function MovieCardInfo({ movie, isDesktop }: { movie: Movie; isDesktop: boolean }) {
  const fontSize = isDesktop ? 14 : 12

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 제목 */}
      <span
        style={{
          fontSize,
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

      {/* 감독 */}
      <span
        style={{
          fontSize: fontSize - 1,
          color: 'var(--color-text-caption)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {movie.director.length > 0 ? movie.director[0] : '감독 미상'}
      </span>

      {/* 장르칩 + 연도 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {movie.genre.slice(0, 1).map((g) => (
          <span
            key={g}
            style={{
              fontSize: 10,
              padding: '2px 6px',
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
  )
}

/* ── 호버 팝업 카드 ─────────────────────────────────────────────── */
function HoverPopup({ movie, x, y }: { movie: Movie; x: number; y: number }) {
  const synopsis = movie.synopsis
    ? movie.synopsis.length > 90
      ? movie.synopsis.slice(0, 90) + '...'
      : movie.synopsis
    : null

  const tags = [
    ...movie.genre.slice(0, 2),
    ...(movie.nation ? [withFlag(movie.nation)] : []),
  ]

  const cardWidth = 220
  const adjustedX =
    x + cardWidth > window.innerWidth - 16 ? x - cardWidth - 156 : x

  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: adjustedX,
        width: cardWidth,
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.48)',
        zIndex: 9999,
        pointerEvents: 'none',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {normalizeTitle(movie.title)}
      </span>

      {movie.director.length > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
          {movie.director[0]}
        </span>
      )}

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 99,
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-body)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {synopsis && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-caption)',
              lineHeight: 1.65,
            }}
          >
            {synopsis}
          </span>
        </>
      )}
    </div>
  )
}

/* ── 개별 영화 카드 ─────────────────────────────────────────────── */
function MovieCard({
  movie,
  width,
  height,
  isDesktop,
  daysLeft,
  onClick,
}: {
  movie: Movie
  width: number
  height: number
  isDesktop: boolean
  daysLeft?: number
  onClick?: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hovered, setHovered] = useState(false)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)

  function onMouseEnter() {
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (rect) {
        setHovered(true)
        setPopupPos({ x: rect.right + 8, y: rect.top })
      }
    }, 180)
  }

  function onMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHovered(false)
    setPopupPos(null)
  }

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={isDesktop ? onMouseEnter : undefined}
        onMouseLeave={isDesktop ? onMouseLeave : undefined}
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, width, flexShrink: 0, cursor: onClick ? 'pointer' : undefined }}
      >
        {/* 포스터: scale은 있으나 layout size 유지 → 부모 padding 안에서 visual overflow */}
        <div
          style={{
            transition: 'transform 130ms ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: 'center center',
            borderRadius: 6,
            position: 'relative',
          }}
        >
          <PosterThumb src={movie.posterUrl} alt={movie.title} width={width} height={height} />
          {daysLeft != null && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              padding: '2px 6px',
              borderRadius: 99,
              fontSize: 10, fontWeight: 700, lineHeight: 1.4,
              color: '#fff',
              backgroundColor: daysLeft === 0 ? '#DC2626' : daysLeft === 1 ? '#EA580C' : '#78716C',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
            }}>
              {daysLeft === 0 ? '오늘' : `D-${daysLeft}`}
            </span>
          )}
        </div>

        <MovieCardInfo movie={movie} isDesktop={isDesktop} />
      </div>

      {popupPos && isDesktop && (
        <HoverPopup movie={movie} x={popupPos.x} y={popupPos.y} />
      )}
    </>
  )
}

/* ── 섹션 행 ────────────────────────────────────────────────────── */
export function CurationSectionRow({
  title,
  emoji,
  description,
  displayMode,
  movies,
  isDesktop = false,
  posterBadges,
  onMovieClick,
  noHeader = false,
  compact = false,
  id,
}: CurationSectionRowProps) {
  const { width, height } = isDesktop ? POSTER_SIZE.desktop : POSTER_SIZE.mobile
  const scaleBleed = Math.ceil(height * 0.04)
  const gap = isDesktop ? 16 : 10
  const scrollAmount = (width + gap) * 3

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollEdge() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollEdge()
  }, [movies])

  if (movies.length === 0) return null

  // compact 모드: flex item으로 렌더, 1~2편 inline 표시 (스크롤 없음)
  if (compact) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-card)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {emoji} {title}
          </div>
          {description && (
            <div style={{ fontSize: 11, color: 'var(--color-text-caption)', marginTop: 2, lineHeight: 1.4 }}>{description}</div>
          )}
        </div>
        {/* 영화 inline */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--color-surface-card)', flex: 1 }}>
          {movies.slice(0, 2).map((movie) => (
            <div
              key={movie.id}
              onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0, cursor: onMovieClick ? 'pointer' : undefined }}
            >
              <div style={{ flexShrink: 0 }}>
                <PosterThumb src={movie.posterUrl} alt={movie.title} width={52} height={78} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                  {normalizeTitle(movie.title)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {movie.director.length > 0 ? movie.director[0] : '감독 미상'}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {movie.genre.slice(0, 1).map((g) => (
                    <span key={g} style={{ fontSize: 10, padding: '2px 5px', borderRadius: 99, background: 'var(--color-surface-raised)', color: 'var(--color-text-caption)', border: '1px solid var(--color-border)' }}>{g}</span>
                  ))}
                  <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontWeight: 600 }}>{movie.year}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 포스터 이미지 영역 세로 중앙: padding-top + 포스터 높이의 절반
  const posterMidY = scaleBleed + 8 + height / 2

  const btnStyle: React.CSSProperties = {
    position: 'absolute', top: posterMidY, transform: 'translateY(-50%)',
    width: 32, height: 32, borderRadius: '50%', zIndex: 3,
    border: 'none', cursor: 'pointer',
    backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 72%, transparent)',
    backdropFilter: 'blur(8px)',
    color: 'var(--color-text-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
    minHeight: 'auto',
  }

  return (
    <section id={id} style={{ paddingTop: noHeader ? 0 : 24 }}>
      {!noHeader && (
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
          {emoji} {title}
        </h2>
      )}
      {!noHeader && description && (
        <p
          style={{
            margin: '4px 0 0',
            padding: '0 16px',
            fontSize: isDesktop ? 13 : 12,
            color: 'var(--color-text-caption)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      <div style={{ position: 'relative' }}>
        {canScrollLeft && (
          <button
            style={{ ...btnStyle, left: 6 }}
            onClick={() => scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' })}
            aria-label="이전"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            style={{ ...btnStyle, right: 6 }}
            onClick={() => scrollRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' })}
            aria-label="다음"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollEdge}
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap,
            overflowX: 'auto',
            padding: `${scaleBleed + 8}px ${scaleBleed + 16}px`,
          }}
        >
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              width={width}
              height={height}
              isDesktop={isDesktop}
              daysLeft={posterBadges?.get(movie.id)}
              onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
