'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMovies, useActiveMovieIds } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoStar = ({ filled }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? 'var(--color-primary-base)' : 'none'} stroke={filled ? 'var(--color-primary-base)' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoChevronDown = ({ flipped }: { flipped?: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flipped ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

/* ── NavBar ── */
function NavBar({ onBack, starred, onStar }: { onBack: () => void; starred?: boolean; onStar?: () => void }) {
  const btn: React.CSSProperties = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)',
  }
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingLeft: 4, paddingRight: 4,
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-bg)',
      flexShrink: 0,
    }}>
      <button style={btn} onClick={onBack}><IcoChevronLeft /></button>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>감독 정보</span>
      <button style={btn} onClick={onStar}><IcoStar filled={starred} /></button>
    </div>
  )
}

/* ── ProfileHero ── */
function ProfileHero({ name }: { name: string }) {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      padding: '32px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      {/* 프로필 아바타 */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        color: 'var(--color-text-caption)',
      }}>
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {name}
      </h1>
    </div>
  )
}

/* ── 정렬 칩 ── */
type SortKey = 'newest' | 'oldest'
function SortChips({ active, onChange }: { active: SortKey; onChange: (k: SortKey) => void }) {
  const opts: Array<{ key: SortKey; label: string }> = [
    { key: 'newest', label: '최신' },
    { key: 'oldest', label: '오래된' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            height: 26, padding: '0 12px',
            borderRadius: 999,
            border: '1px solid',
            borderColor: active === o.key ? 'var(--color-primary-base)' : 'var(--color-border)',
            backgroundColor: active === o.key ? 'var(--color-primary-subtle-l)' : 'transparent',
            color: active === o.key ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
            fontSize: 12,
            fontWeight: active === o.key ? 600 : 400,
            cursor: 'pointer',
            minHeight: 'auto',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── 포스터 플레이스홀더 ── */
function MiniPoster({ src }: { src?: string }) {
  return (
    <div style={{ width: 44, height: 66, borderRadius: 5, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 5px, transparent 5px 10px)' }} />
      )}
    </div>
  )
}

/* ── FilmographyRow ── */
function FilmographyRow({
  movie,
  isLast,
  isActive,
  onClick,
}: {
  movie: Movie
  isLast: boolean
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottomColor: isLast ? 'transparent' : 'var(--color-border)',
        borderBottomStyle: 'solid',
        borderBottomWidth: isLast ? 0 : 1,
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 'auto',
      }}
    >
      <MiniPoster src={movie.posterUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 700,
            color: isActive ? 'var(--color-primary-base)' : 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 160,
          }}>
            {movie.title}
          </span>
          {isActive && (
            <span style={{
              height: 18, padding: '0 6px',
              borderRadius: 4,
              display: 'inline-flex', alignItems: 'center',
              fontSize: 9, fontWeight: 700,
              color: '#fff',
              backgroundColor: 'var(--color-primary-base)',
              flexShrink: 0,
            }}>
              상영중
            </span>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-caption)' }}>
          {[movie.year, movie.genre[0]].filter(Boolean).join(' · ')}
        </div>
      </div>
      {isActive && <IcoChevronRight />}
    </button>
  )
}

/* ── 메인 ── */
export function DirectorDetailClient({ directorName }: { directorName: string }) {
  const router = useRouter()
  const [starred, setStarred] = useState(false)
  const [sort, setSort] = useState<SortKey>('newest')
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_COUNT = 4

  const { data: movies = [], isLoading } = useMovies()
  const { data: activeIds = [] } = useActiveMovieIds()
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds])

  const directorMovies = useMemo(() => {
    const filtered = movies.filter((m) => m.director.includes(directorName))
    return [...filtered].sort((a, b) =>
      sort === 'newest' ? b.year - a.year : a.year - b.year
    )
  }, [movies, directorName, sort])

  const visibleMovies = expanded ? directorMovies : directorMovies.slice(0, COLLAPSED_COUNT)
  const hiddenCount = directorMovies.length - COLLAPSED_COUNT

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>불러오는 중…</span>
      </div>
    )
  }

  return (
    <div
      className="page-slide-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-surface-bg)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <NavBar onBack={() => router.back()} starred={starred} onStar={() => setStarred(!starred)} />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
        <ProfileHero name={directorName} />

        {/* 작품 목록 */}
        <div style={{ padding: '0 20px 52px' }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
              작품 · {directorMovies.length}편
            </span>
            <SortChips active={sort} onChange={setSort} />
          </div>

          {/* 리스트 */}
          {directorMovies.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'var(--color-text-caption)' }}>
              작품 정보가 없습니다
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface-card)' }}>
              {visibleMovies.map((movie, i) => (
                <FilmographyRow
                  key={movie.id}
                  movie={movie}
                  isLast={i === visibleMovies.length - 1 && (expanded || hiddenCount <= 0)}
                  isActive={activeIdSet.has(movie.id)}
                  onClick={() => router.push(`/movie/${movie.id}`)}
                />
              ))}

              {/* 더 보기/접기 버튼 */}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    width: '100%',
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    border: 'none',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    color: 'var(--color-text-sub)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: '0 0 12px 12px',
                    minHeight: 'auto',
                  }}
                >
                  <IcoChevronDown flipped={expanded} />
                  {expanded ? '접기' : `${hiddenCount}편 더 보기`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
