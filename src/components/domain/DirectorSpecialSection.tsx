'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Movie, Theater } from '@/types/api'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { useDirectorProfile } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlag } from '@/lib/nations'

interface Props {
  directorName: string
  theater: Theater
  films: Movie[]
  distSuffix?: string
  isDesktop: boolean
  onDirectorClick?: (name: string) => void
  onTheaterClick?: (id: string) => void
  onMovieClick?: (id: string) => void
}

const POSTER = {
  mobile: { width: 96, height: 144 },
  desktop: { width: 140, height: 210 },
}

// ── 아바타 색상 ─────────────────────────────────────────────────
const AVATAR_COLORS = ['#2C3E50', '#7B2D2D', '#2D5A27', '#4A2D6B', '#5C4A1C', '#1A4A5C']
function hashColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ── 호버 팝업 (CurationSectionRow 동일 패턴) ────────────────────
function HoverPopup({ movie, x, y }: { movie: Movie; x: number; y: number }) {
  const synopsis = movie.synopsis
    ? movie.synopsis.length > 90 ? movie.synopsis.slice(0, 90) + '...' : movie.synopsis
    : null
  const tags = [...movie.genre.slice(0, 2), ...(movie.nation ? [withFlag(movie.nation)] : [])]
  const cardWidth = 220
  const adjustedX = x + cardWidth > window.innerWidth - 16 ? x - cardWidth - 156 : x

  return createPortal(
    <div style={{
      position: 'fixed', top: y, left: adjustedX, width: cardWidth,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)', boxShadow: '0 12px 40px rgba(0,0,0,0.48)',
      zIndex: 9999, pointerEvents: 'none', padding: 14,
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
    }}>
      <span style={{
        fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {normalizeTitle(movie.title)}
      </span>
      {movie.director.length > 0 && (
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{movie.director[0]}</span>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)' }}>
          {tags.map((t) => (
            <span key={t} style={{
              fontSize: 'var(--text-caption)', padding: '3px 9px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-surface-raised)', color: 'var(--color-text-body)',
              border: '1px solid var(--color-border)',
            }}>{t}</span>
          ))}
        </div>
      )}
      {synopsis && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.65 }}>{synopsis}</span>
        </>
      )}
    </div>,
    document.body,
  )
}

// ── 영화 카드 (CurationSectionRow 동일 패턴) ────────────────────
function MovieCard({
  movie, width, height, isDesktop, onClick,
}: { movie: Movie; width: number; height: number; isDesktop: boolean; onClick?: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hovered, setHovered] = useState(false)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)

  function onMouseEnter() {
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (rect) { setHovered(true); setPopupPos({ x: rect.right + 8, y: rect.top }) }
    }, 180)
  }
  function onMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHovered(false); setPopupPos(null)
  }

  const fontSize = isDesktop ? 14 : 12

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={isDesktop ? onMouseEnter : undefined}
        onMouseLeave={isDesktop ? onMouseLeave : undefined}
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1-5)', width, flexShrink: 0, cursor: onClick ? 'pointer' : undefined }}
      >
        <div style={{
          transition: 'transform 130ms ease',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          transformOrigin: 'center center',
          borderRadius: 'var(--radius-md)',
        }}>
          <PosterThumb src={movie.posterUrl} alt={movie.title} width={width} height={height} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
          <span style={{
            fontSize, fontWeight: 700, color: 'var(--color-text-body)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3,
          }}>
            {normalizeTitle(movie.title)}
          </span>
          <span style={{ fontSize: fontSize - 1, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {movie.director.length > 0 ? movie.director[0] : '감독 미상'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexWrap: 'wrap' }}>
            {movie.genre.slice(0, 1).map((g) => (
              <span key={g} style={{
                fontSize: 'var(--text-caption)', padding: '2px 6px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-raised)', color: 'var(--color-text-caption)',
                border: '1px solid var(--color-border)', whiteSpace: 'nowrap',
              }}>{g}</span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontWeight: 600 }}>{movie.year}</span>
          </div>
        </div>
      </div>
      {popupPos && isDesktop && <HoverPopup movie={movie} x={popupPos.x} y={popupPos.y} />}
    </>
  )
}

// ── 왼쪽 패널: 감독 블록 + 영화관 블록 ──────────────────────────
function LeftPanel({
  directorName, theater, filmCount, distSuffix, isDesktop, onDirectorClick, onTheaterClick,
}: {
  directorName: string; theater: Theater; filmCount: number; distSuffix?: string
  isDesktop: boolean; onDirectorClick?: () => void; onTheaterClick?: () => void
}) {
  const { data: profile } = useDirectorProfile(directorName)
  const avatarSize = isDesktop ? 56 : 48
  const color = hashColor(directorName)
  const photoUrl = profile?.photoUrl
  const bio = profile?.bio

  const blockPad = isDesktop ? '18px 20px' : '16px'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRight: isDesktop ? '1px solid var(--color-border)' : 'none',
      borderBottom: !isDesktop ? '1px solid var(--color-border)' : 'none',
      height: '100%',
    }}>
      {/* ── 감독 블록 ── */}
      <div style={{ padding: blockPad, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2-5)', flex: 1 }}>
        {/* 배지 */}
        <span style={{
          alignSelf: 'flex-start', fontSize: 'var(--text-caption)', fontWeight: 600,
          color: 'var(--color-primary-base)',
          padding: '3px 10px', borderRadius: 'var(--radius-full)',
          border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--color-primary-base) 10%, transparent)',
          letterSpacing: 0.3,
        }}>
          ✦ 감독 특별전
        </span>

        {/* 아바타 + 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2-5)' }}>
          <div style={{
            width: avatarSize, height: avatarSize, borderRadius: '50%',
            background: photoUrl ? 'transparent' : color,
            flexShrink: 0, overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px var(--color-border), 0 2px 6px rgba(0,0,0,0.18)',
          }}>
            {photoUrl ? (
              <img src={photoUrl} alt={directorName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: avatarSize * 0.38, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-display)' }}>
                  {directorName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {directorName}
            </div>
            {profile?.originalName && (
              <div style={{ fontSize: 'var(--text-caption)', fontStyle: 'italic', color: 'var(--color-text-caption)', fontFamily: 'var(--font-serif-en)', marginTop: 2 }}>
                {profile.originalName}
              </div>
            )}
          </div>
        </div>

        {/* 바이오 */}
        <p style={{
          margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.65,
          color: bio ? 'var(--color-text-sub)' : 'var(--color-text-caption)',
          fontStyle: bio ? 'normal' : 'italic',
          ...(bio ? { display: '-webkit-box', WebkitLineClamp: isDesktop ? 5 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
        }}>
          {bio ?? '감독 설명이 아직 없습니다'}
        </p>

        {/* 감독 상세 버튼 */}
        {onDirectorClick && (
          <button onClick={onDirectorClick} style={{
            marginTop: 'auto', padding: '8px 14px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-card)', color: 'var(--color-text-body)',
            fontSize: 'var(--text-meta)', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
          }}>
            감독 상세 →
          </button>
        )}
      </div>

      {/* ── 영화관 블록 ── */}
      <div style={{
        padding: blockPad,
        borderTop: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
        background: 'var(--color-surface-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-1-5)' }}>
          <span style={{ fontSize: 'var(--text-meta)', flexShrink: 0, marginTop: 1 }}>📍</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {theater.name}
              {distSuffix && <span style={{ fontSize: 'var(--text-caption)', fontWeight: 400, color: 'var(--color-text-caption)', marginLeft: 4 }}>{distSuffix}</span>}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', marginTop: 1 }}>{theater.city} · {filmCount}편 상영중</div>
          </div>
        </div>
        {onTheaterClick && (
          <button onClick={onTheaterClick} style={{
            padding: '7px 14px', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary-base)', color: '#fff',
            fontSize: 'var(--text-meta)', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
          }}>
            영화관 보기
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 섹션 ─────────────────────────────────────────────────
export function DirectorSpecialSection({
  directorName, theater, films, distSuffix, isDesktop,
  onDirectorClick, onTheaterClick, onMovieClick,
}: Props) {
  const { width, height } = isDesktop ? POSTER.desktop : POSTER.mobile
  const scaleBleed = Math.ceil(height * 0.04)
  const gap = isDesktop ? 16 : 10
  const scrollAmount = (width + gap) * 3

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [scrollAreaHovered, setScrollAreaHovered] = useState(false)

  function updateScrollEdge() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => { updateScrollEdge() }, [films])

  if (films.length === 0) return null

  const posterMidY = scaleBleed + 8 + height / 2
  const showBtns = scrollAreaHovered || !isDesktop

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
    opacity: scrollAreaHovered ? 1 : 0,
    transition: 'opacity 150ms ease',
    pointerEvents: scrollAreaHovered ? 'auto' : 'none',
  }

  const filmScroll = (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setScrollAreaHovered(true)}
      onMouseLeave={() => setScrollAreaHovered(false)}
    >
      {canScrollLeft && (
        <button style={{ ...btnStyle, left: 6 }} onClick={() => scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' })} aria-label="이전">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button style={{ ...btnStyle, right: 6 }} onClick={() => scrollRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' })} aria-label="다음">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollEdge}
        className="no-scrollbar"
        style={{ display: 'flex', gap, overflowX: 'auto', padding: `${scaleBleed + 8}px ${scaleBleed + 16}px` }}
      >
        {films.map((movie) => (
          <MovieCard
            key={movie.id} movie={movie} width={width} height={height} isDesktop={isDesktop}
            onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
          />
        ))}
      </div>
    </div>
  )

  const filmScrollWithHeader = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 상영 극장 한 줄 타이틀 */}
      <div style={{
        padding: isDesktop ? '14px 20px 0' : '14px 16px 0',
        fontSize: isDesktop ? 'var(--text-subtitle)' : 'var(--text-body)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-display)',
      }}>
        {theater.name} 상영작
      </div>
      {filmScroll}
    </div>
  )

  return (
    <section style={{ paddingTop: 24 }}>
      <h2 style={{
        margin: 0, padding: '0 16px',
        fontSize: isDesktop ? 'var(--text-h3)' : 'var(--text-title)',
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        color: 'var(--color-text-primary)',
        marginBottom: 10,
      }}>
        🎬 {directorName} 특별전
      </h2>
      {isDesktop ? (
        /* ── 데스크톱: 좌우 분할, 동일 마진 ─────── */
        <div style={{
          margin: '0 16px',
          display: 'flex',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ width: 260, flexShrink: 0, background: 'var(--color-surface-card)' }}>
            <LeftPanel
              directorName={directorName} theater={theater} filmCount={films.length}
              distSuffix={distSuffix} isDesktop={isDesktop}
              onDirectorClick={onDirectorClick ? () => onDirectorClick(directorName) : undefined}
              onTheaterClick={onTheaterClick ? () => onTheaterClick(theater.id) : undefined}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, background: 'var(--color-surface-raised)' }}>
            {filmScrollWithHeader}
          </div>
        </div>
      ) : (
        /* ── 모바일: 위아래 적층, 동일 마진 ─────── */
        <div style={{ margin: '0 16px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ background: 'var(--color-surface-card)', padding: '0 16px' }}>
            <LeftPanel
              directorName={directorName} theater={theater} filmCount={films.length}
              distSuffix={distSuffix} isDesktop={isDesktop}
              onDirectorClick={onDirectorClick ? () => onDirectorClick(directorName) : undefined}
              onTheaterClick={onTheaterClick ? () => onTheaterClick(theater.id) : undefined}
            />
          </div>
          <div style={{ background: 'var(--color-surface-raised)' }}>
            {filmScrollWithHeader}
          </div>
        </div>
      )}
    </section>
  )
}
