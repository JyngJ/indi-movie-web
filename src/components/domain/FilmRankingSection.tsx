'use client'

import { useState } from 'react'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { FilmRankingEntry } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'

interface FilmRankingSectionProps {
  weekStart: string
  rankings: FilmRankingEntry[]
  movies: Movie[]
  isDesktop: boolean
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
        fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
        background: '#D97706', color: '#fff', letterSpacing: 0.2,
      }}>NEW</span>
    )
  }
  const diff = prevRank - rank
  if (diff > 0) {
    return (
      <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A' }}>
        ▲{diff}
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
        ▼{Math.abs(diff)}
      </span>
    )
  }
  return null
}

// ── 랭킹 설명 팝업 ────────────────────────────────────────────────
function InfoPopup({ weekStart, onClose }: { weekStart: string; onClose: () => void }) {
  const label = getKoreanWeekLabel(weekStart)
  const [, m, d] = weekStart.split('-').map(Number)
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + 6)
  const em = endDate.getMonth() + 1
  const ed = endDate.getDate()
  const periodLabel = `${m}.${d}(월)–${em}.${ed}(일)`

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '20px 20px 16px',
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.48)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>⚖️</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            랭킹은 이렇게 매겨요
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.6 }}>
          지난 7일 · <strong>{periodLabel}</strong> 동안의 세 지표를 가중 합산해 순위를 정합니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            { icon: '📍', label: '상영관 수', pct: 45, desc: '전국 독립·예술영화 전용관 중 상영 중인 극장 수' },
            { icon: '🎞️', label: '상영 회차', pct: 30, desc: '집계 기간 동안 편성된 총 상영 회차' },
            { icon: '👁️', label: '영화볼지도 조회', pct: 25, desc: '앱에서 이 영화·상영관을 찾아본 횟수' },
          ] as const).map(({ icon, label: l, pct, desc }) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-body)' }}>{icon} {l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>{pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>{desc}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--color-border)' }} />
        <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 11, color: 'var(--color-text-caption)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <li>독립·예술영화 전용관과 기획전 상영작만 집계해요.</li>
          <li>재상영·재개봉·회고전도 함께 포함합니다.</li>
          <li>멀티플렉스 단독 와이드 개봉작은 제외해요.</li>
        </ul>
        <span style={{ fontSize: 10, color: 'var(--color-text-caption)' }}>
          🕐 매주 월요일 오전 6시 자동 갱신 · {label} 기준
        </span>
      </div>
    </div>
  )
}

// ── 랭킹 카드 ─────────────────────────────────────────────────────
function RankingCard({ entry, movie, rank }: { entry: FilmRankingEntry; movie?: Movie; rank: number }) {
  const { width, height } = POSTER

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width, flexShrink: 0 }}>
      <div style={{ position: 'relative' }}>
        <PosterThumb src={movie?.posterUrl} alt={movie?.title ?? ''} width={width} height={height} />
        {/* 순위 번호 — 좌하단 */}
        <div
          style={{
            position: 'absolute', bottom: 6, left: 6,
            width: 24, height: 24, borderRadius: 6,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{rank}</span>
        </div>
      </div>

      {/* 제목 */}
      <span
        style={{
          fontSize: 13, fontWeight: 700, color: 'var(--color-text-body)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.3,
        }}
      >
        {movie ? normalizeTitle(movie.title) : '—'}
      </span>

      {/* 감독 + 순위변화 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {movie?.director?.[0] ?? '감독 미상'}
        </span>
        <RankBadge rank={entry.rank} prevRank={entry.prev_rank} />
      </div>
    </div>
  )
}

// ── 메인 섹션 ─────────────────────────────────────────────────────
export function FilmRankingSection({ weekStart, rankings, movies, isDesktop }: FilmRankingSectionProps) {
  const [infoOpen, setInfoOpen] = useState(false)

  if (rankings.length === 0) return null

  const movieById = new Map(movies.map((m) => [m.id, m]))
  const label = getKoreanWeekLabel(weekStart)

  return (
    <>
      {infoOpen && <InfoPopup weekStart={weekStart} onClose={() => setInfoOpen(false)} />}
      <section style={{ paddingTop: 28 }}>
        <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 style={{
                margin: 0,
                fontSize: isDesktop ? 20 : 17,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
              }}>
                🔥 독립영화 주간 랭킹
              </h2>
              <button
                onClick={() => setInfoOpen(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 2, color: 'var(--color-text-caption)', fontSize: 14,
                  display: 'flex', alignItems: 'center',
                }}
                aria-label="랭킹 기준 보기"
              >
                ⓘ
              </button>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-caption)' }}>
              {label} · 상영관·회차·조회수 합산
            </p>
          </div>
        </div>

        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: isDesktop ? 16 : 12,
            overflowX: 'auto',
            padding: '12px 16px 8px',
          }}
        >
          {rankings.map((entry) => (
            <RankingCard
              key={entry.movie_id}
              entry={entry}
              movie={movieById.get(entry.movie_id)}
              rank={entry.rank}
            />
          ))}
        </div>
      </section>
    </>
  )
}
