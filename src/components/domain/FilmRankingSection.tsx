'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlag } from '@/lib/nations'
import type { FilmRankingEntry } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'

interface FilmRankingSectionProps {
  weekStart: string
  rankings: FilmRankingEntry[]
  movies: Movie[]
  isDesktop: boolean
  onMovieClick?: (movieId: string) => void
}

const POSTER = { width: 120, height: 180 }

// ── 주간 라벨 "6월 2주차" ──────────────────────────────────────────
function getKoreanWeekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-').map(Number)
  return `${m}월 ${Math.ceil(d / 7)}주차`
}

// ── 순위 변화 배지 ────────────────────────────────────────────────
function RankBadge({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  if (prevRank === null) {
    return (
      <span style={{
        fontSize: 'var(--text-caption)', fontWeight: 700, padding: '2px 5px', borderRadius: 'var(--radius-sm)',
        background: '#D97706', color: '#fff', letterSpacing: 0.2,
      }}>NEW</span>
    )
  }
  const diff = prevRank - rank
  if (diff > 0) {
    return (
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: '#16A34A' }}>
        ▲{diff}
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: '#DC2626' }}>
        ▼{Math.abs(diff)}
      </span>
    )
  }
  return null
}

// ── 랭킹 설명 호버 툴팁 ──────────────────────────────────────────
const METRICS = [
  { icon: '📍', label: '상영관 수',      pct: 45, color: '#3B82F6', desc: '전국 독립·예술영화 전용관 중 상영 중인 극장 수' },
  { icon: '🎞️', label: '상영 회차',      pct: 30, color: '#10B981', desc: '집계 기간 동안 편성된 총 상영 회차' },
  { icon: '👁️', label: '영화볼지도 조회', pct: 25, color: '#8B5CF6', desc: '앱에서 이 영화·상영관을 찾아본 횟수' },
] as const

function InfoTooltip({ weekStart }: { weekStart: string }) {
  const label = getKoreanWeekLabel(weekStart)
  const [, m, d] = weekStart.split('-').map(Number)
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + 6)
  const periodLabel = `${m}.${d}(월)–${endDate.getMonth() + 1}.${endDate.getDate()}(일)`

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
      transform: 'translateX(-60%)',
      zIndex: 9990, pointerEvents: 'none',
      width: 288,
    }}>
      {/* 꼬리 */}
      <div style={{
        position: 'absolute', top: -5, left: '60%', transform: 'translateX(-50%) rotate(45deg)',
        width: 10, height: 10,
        background: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        borderLeft: '1px solid var(--color-border)',
      }} />
      <div style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2-5)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      }}>
        <span style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          ⚖️ 랭킹은 이렇게 매겨요
        </span>
        <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', lineHeight: 1.6 }}>
          지난 7일 · <strong>{periodLabel}</strong> 세 지표 가중 합산
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          {METRICS.map(({ icon, label: l, pct, color, desc }) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-body)' }}>{icon} {l}</span>
                <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color }}>{pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)' }}>{desc}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
          🕐 매주 월요일 오전 6시 자동 갱신 · {label} 기준
        </span>
      </div>
    </div>
  )
}

// ── 호버 팝업 ────────────────────────────────────────────────────
function HoverPopup({ movie, x, y }: { movie: Movie; x: number; y: number }) {
  const synopsis = movie.synopsis
    ? movie.synopsis.length > 90 ? movie.synopsis.slice(0, 90) + '...' : movie.synopsis
    : null
  const tags = [...movie.genre.slice(0, 2), ...(movie.nation ? [withFlag(movie.nation)] : [])]
  const cardWidth = 220
  const adjustedX = x + cardWidth > window.innerWidth - 16 ? x - cardWidth - 136 : x

  // transform 조상(도크 슬라이드 패널)에 잘리지 않게 body로 portal
  return createPortal(
    <div style={{
      position: 'fixed', top: y, left: adjustedX, width: cardWidth,
      background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)', boxShadow: '0 12px 40px rgba(0,0,0,0.48)',
      zIndex: 9999, pointerEvents: 'none', padding: 14,
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
    }}>
      <span style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {normalizeTitle(movie.title)}
      </span>
      {movie.director.length > 0 && (
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{movie.director[0]}</span>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)' }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 'var(--text-caption)', padding: '3px 9px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface-raised)', color: 'var(--color-text-body)', border: '1px solid var(--color-border)' }}>
              {tag}
            </span>
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

// ── 랭킹 카드 ─────────────────────────────────────────────────────
function RankingCard({ entry, movie, rank, isDesktop, gapRight, onClick }: { entry: FilmRankingEntry; movie?: Movie; rank: number; isDesktop: boolean; gapRight: number; onClick?: () => void }) {
  const { width, height } = POSTER
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

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={isDesktop ? onMouseEnter : undefined}
        onMouseLeave={isDesktop ? onMouseLeave : undefined}
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', width, flexShrink: 0, cursor: onClick ? 'pointer' : undefined, marginRight: gapRight }}
      >
        <div style={{ position: 'relative', overflow: 'visible' }}>
          {/* 순위 — 포스터 왼쪽 뒤에, 반투명 테두리만 */}
          <span style={{
            position: 'absolute', bottom: -28, left: rank >= 10 ? -76 : -44,
            zIndex: 0,
            fontSize: isDesktop ? 96 : 68, fontWeight: 900, lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: '3px rgba(59,130,246,0.45)',
            fontFamily: 'var(--font-display)',
            userSelect: 'none', pointerEvents: 'none',
          }}>
            {rank}
          </span>
          {/* 포스터 — 숫자 위에, 호버시만 확대 */}
          <div style={{
            position: 'relative', zIndex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden',
            transition: 'transform 130ms ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: 'center center',
          }}>
            <PosterThumb src={movie?.posterUrl} alt={movie?.title ?? ''} width={width} height={height} />
          </div>
        </div>

        <span style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
          {movie ? normalizeTitle(movie.title) : '—'}
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-1)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {movie?.director?.[0] ?? '감독 미상'}
          </span>
          <RankBadge rank={entry.rank} prevRank={entry.prev_rank} />
        </div>
      </div>

      {popupPos && isDesktop && movie && (
        <HoverPopup movie={movie} x={popupPos.x} y={popupPos.y} />
      )}
    </>
  )
}

// ── 메인 섹션 ─────────────────────────────────────────────────────
export function FilmRankingSection({ weekStart, rankings, movies, isDesktop, onMovieClick }: FilmRankingSectionProps) {
  const [infoHover, setInfoHover] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollEdge() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  if (rankings.length === 0) return null

  const movieById = new Map(movies.map((m) => [m.id, m]))
  const label = getKoreanWeekLabel(weekStart)
  const paddingLeft = isDesktop ? 60 : 52
  const scrollAmount = (POSTER.width + (isDesktop ? 78 : 60)) * 3

  function getGapRight(nextRank: number | undefined): number {
    if (nextRank == null) return 16
    return nextRank >= 10
      ? (isDesktop ? 108 : 84)
      : (isDesktop ? 78 : 60)
  }

  // 포스터 이미지 영역 세로 중앙: scroll container paddingTop(12) + poster 높이 절반
  const posterMidY = 12 + POSTER.height / 2

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
    <section style={{ paddingTop: 28 }}>
      <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1-5)' }}>
            <h2 style={{
              margin: 0,
              fontSize: isDesktop ? 'var(--text-h3)' : 'var(--text-title)',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
            }}>
              🔥 독립영화 주간 랭킹
            </h2>
            <div
              style={{ position: 'relative', display: 'inline-flex' }}
              onMouseEnter={() => setInfoHover(true)}
              onMouseLeave={() => setInfoHover(false)}
            >
              <button
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 2, color: 'var(--color-text-caption)', fontSize: 'var(--text-body)',
                  display: 'flex', alignItems: 'center',
                }}
                aria-label="랭킹 기준 보기"
              >
                ⓘ
              </button>
              {infoHover && <InfoTooltip weekStart={weekStart} />}
            </div>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
            {label} · 상영관·회차·조회수 합산
          </p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {canScrollLeft && (
          <button style={{ ...btnStyle, left: 6 }}
            onClick={() => scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' })}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        {canScrollRight && (
          <button style={{ ...btnStyle, right: 6 }}
            onClick={() => scrollRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' })}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollEdge}
          className="no-scrollbar"
          style={{
            display: 'flex',
            overflowX: 'auto',
            padding: `12px 16px 8px ${paddingLeft}px`,
          }}
        >
          {rankings.map((entry, i) => (
            <RankingCard
              key={entry.movie_id}
              entry={entry}
              movie={movieById.get(entry.movie_id)}
              rank={entry.rank}
              isDesktop={isDesktop}
              gapRight={getGapRight(rankings[i + 1]?.rank)}
              onClick={onMovieClick && entry.movie_id ? () => onMovieClick(entry.movie_id) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
