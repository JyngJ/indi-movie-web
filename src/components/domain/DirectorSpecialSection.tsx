'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Movie, Theater } from '@/types/api'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { useDirectorProfile } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlag } from '@/lib/nations'
import { ScrollNavButton } from '@/components/primitives'
import { HoverPopup } from '@/components/domain/CurationSectionRow'
import { MapPin } from 'lucide-react'

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
  mobile: { width: 120, height: 180 },
  desktop: { width: 210, height: 315 },
}

// ── 아바타 색상 ─────────────────────────────────────────────────
const AVATAR_COLORS = ['#2C3E50', '#7B2D2D', '#2D5A27', '#4A2D6B', '#5C4A1C', '#1A4A5C']
function hashColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// (local HoverPopup removed)

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
        style={{ display: 'flex', flexDirection: 'column', gap: 8, width, flexShrink: 0, cursor: onClick ? 'pointer' : undefined }}
      >
        <div style={{
          transition: 'transform 130ms ease',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          transformOrigin: 'center center',
          borderRadius: 'var(--radius-poster)',
        }}>
          <PosterThumb src={movie.posterUrl} alt={movie.title} width={width} height={height} radius={0} shadow={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                fontSize: 10, padding: '4px 8px', borderRadius: 'var(--radius-pill)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
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

  // 카드 내부 패딩 통일 (상단·좌우 동일)
  const blockPad = 16

  // 컨테이너 폭 기준 와이드 레이아웃 — 넓으면 버튼을 오른쪽에 인라인 배치
  // (데스크톱 분할 레이아웃의 260px 사이드 패널·좁은 도크에서는 세로 적층 유지)
  const rootRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setWide(el.getBoundingClientRect().width >= 420)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [dirBtnHovered, setDirBtnHovered] = useState(false)
  const [theaterBtnHovered, setTheaterBtnHovered] = useState(false)

  const avatarRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          {directorName}
        </div>
        {profile?.originalName && (
          <div style={{ fontSize: 'var(--text-caption)', fontStyle: 'italic', color: 'var(--color-text-caption)', fontFamily: 'var(--font-serif-en)', marginTop: 4 }}>
            {profile.originalName}
          </div>
        )}
      </div>
    </div>
  )

  const directorButton = onDirectorClick && (
    <button
      onClick={onDirectorClick}
      onMouseEnter={() => setDirBtnHovered(true)}
      onMouseLeave={() => setDirBtnHovered(false)}
      style={{
        ...(wide ? { flexShrink: 0 } : { marginTop: 'auto' }),
        minHeight: 32, padding: '0 16px', lineHeight: 1, whiteSpace: 'nowrap', borderRadius: 'var(--radius-button)',
        border: '1px solid var(--color-border)',
        background: dirBtnHovered ? 'var(--color-surface-raised)' : 'var(--color-surface-card)',
        color: 'var(--color-text-body)',
        transition: 'background var(--transition-fast)',
        fontSize: 'var(--text-meta)', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
      }}
    >
      감독 상세 보기
    </button>
  )

  return (
    <div ref={rootRef} style={{
      display: 'flex', flexDirection: 'column',
      borderRight: isDesktop ? '1px solid var(--color-border)' : 'none',
      borderBottom: !isDesktop ? '1px solid var(--color-border)' : 'none',
      height: '100%',
    }}>
      {/* ── 감독 블록 ── */}
      <div style={{ padding: blockPad, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {wide ? (
          /* 와이드: 아바타+이름 왼쪽, 감독 상세 버튼 오른쪽 상단 */
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {avatarRow}
            </div>
            {directorButton}
          </div>
        ) : (
          avatarRow
        )}

        {/* 바이오 */}
        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.65,
          color: bio ? 'var(--color-text-sub)' : 'var(--color-text-caption)',
          fontStyle: bio ? 'normal' : 'italic',
          ...(bio ? { display: '-webkit-box', WebkitLineClamp: isDesktop ? 5 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
        }}>
          {bio ?? '감독 설명이 아직 없습니다'}
        </p>

        {/* 감독 상세 버튼 — 좁은 레이아웃에서는 블록 하단 풀폭 */}
        {!wide && directorButton}
      </div>

      {/* ── 영화관 블록 (카드 좌우 끝까지 풀블리드) ── */}
      <div style={{
        padding: blockPad,
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        ...(wide
          ? { flexDirection: 'row' as const, alignItems: 'center', gap: 16 }
          : { flexDirection: 'column' as const, gap: 'var(--spacing-2)' }),
        background: 'var(--color-surface-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, ...(wide ? { flex: 1, minWidth: 0 } : {}) }}>
          <MapPin size={16} strokeWidth={1.75} color="currentColor" style={{ marginTop: 4, flexShrink: 0, color: 'var(--color-text-body)' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {theater.name}
              {distSuffix && <span style={{ fontSize: 'var(--text-caption)', fontWeight: 400, color: 'var(--color-text-caption)', marginLeft: 4 }}>{distSuffix}</span>}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', marginTop: 4 }}>{theater.city} · {filmCount}편 상영중</div>
          </div>
        </div>
        {onTheaterClick && (
          <button
            onClick={onTheaterClick}
            onMouseEnter={() => setTheaterBtnHovered(true)}
            onMouseLeave={() => setTheaterBtnHovered(false)}
            style={{
              ...(wide ? { flexShrink: 0 } : {}),
              minHeight: 32, padding: '0 16px', lineHeight: 1, whiteSpace: 'nowrap', borderRadius: 'var(--radius-button)', border: 'none',
              background: theaterBtnHovered ? 'var(--color-primary-hover-l)' : 'var(--color-primary-base)',
              color: 'var(--color-on-accent)',
              transition: 'background var(--transition-fast)',
              fontSize: 'var(--text-meta)', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
            }}
          >
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

  const filmScroll = (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setScrollAreaHovered(true)}
      onMouseLeave={() => setScrollAreaHovered(false)}
    >
      {scrollAreaHovered && canScrollLeft && (
        <ScrollNavButton
          direction="left"
          style={{ position: 'absolute', top: posterMidY, transform: 'translateY(-50%)', left: 6, zIndex: 3 }}
          onClick={() => scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' })}
        />
      )}
      {scrollAreaHovered && canScrollRight && (
        <ScrollNavButton
          direction="right"
          style={{ position: 'absolute', top: posterMidY, transform: 'translateY(-50%)', right: 6, zIndex: 3 }}
          onClick={() => scrollRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' })}
        />
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollEdge}
        className="no-scrollbar"
        style={{ display: 'flex', gap, overflowX: 'auto', padding: `${scaleBleed + 8}px calc(${scaleBleed}px + var(--gutter-sheet))`, margin: `0 ${-scaleBleed}px` }}
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

  /* 2.0: 카드 2장(감독 카드+회색 블록) 폐기 — 맨 종이 위 플랫 헤더 + 포스터 행 (피그마 TOBE) */
  return (
    <section style={{ paddingTop: isDesktop ? 48 : 32 }}>
      <h2 style={{
        margin: 0, padding: '0 var(--gutter-sheet)',
        fontSize: isDesktop ? 'var(--text-h2)' : 'var(--text-h3)',
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.05em',
        color: 'var(--color-text-primary)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        {directorName} 특별전
      </h2>
      {/* 극장 플랫 헤더 — [클래퍼보드 + 극장명/캡션] ... 영화관 보기 › */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 var(--gutter-sheet) 4px' }}>
        <span style={{
          width: 40, height: 40, flexShrink: 0, borderRadius: 'var(--radius-badge)',
          backgroundColor: 'var(--color-primary-subtle-l)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-base)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
            <path d="m6.2 5.3 3.1 3.9" />
            <path d="m12.4 3.4 3.1 4" />
            <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {theater.name}
          </span>
          <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
            {films.length}편 상영중{distSuffix ? ` ${distSuffix}` : ''}
          </span>
        </div>
        {onTheaterClick && (
          <button
            onClick={() => onTheaterClick(theater.id)}
            style={{
              border: 'none', background: 'transparent', padding: '12px 0',
              fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--color-text-sub)',
              cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 'auto',
            }}
          >
            영화관 보기 ›
          </button>
        )}
      </div>
      {filmScroll}
    </section>
  )
}
