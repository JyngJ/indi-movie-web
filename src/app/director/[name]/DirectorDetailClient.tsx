'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMovies, useActiveMovieIds } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'

function useIsDesktopDetail() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoClose = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
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
function NavBar({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
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
      <button style={btn} onClick={onClose}><IcoClose /></button>
    </div>
  )
}

/* ── ProfileHero ── */
function ProfileHero({ name, count, desktop = false }: { name: string; count?: number; desktop?: boolean }) {
  return (
    <div style={{
      background: desktop
        ? 'linear-gradient(135deg, var(--color-surface-card) 0%, var(--color-primary-subtle-l) 100%)'
        : 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      padding: desktop ? '34px 28px' : '32px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      border: desktop ? '1px solid var(--color-border)' : undefined,
      borderRadius: desktop ? 20 : 0,
      boxShadow: desktop ? '0 18px 54px rgba(20, 15, 10, 0.10)' : undefined,
    }}>
      {/* 프로필 아바타 */}
      <div style={{
        width: desktop ? 128 : 96, height: desktop ? 128 : 96, borderRadius: '50%',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: desktop ? 22 : 16,
        color: 'var(--color-text-caption)',
      }}>
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: desktop ? 34 : 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {name}
      </h1>
      {typeof count === 'number' && (
        <div style={{
          marginTop: 10,
          fontSize: 13,
          color: 'var(--color-text-sub)',
        }}>
          등록 작품 {count}편
        </div>
      )}
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
  desktop = false,
}: {
  movie: Movie
  isLast: boolean
  isActive: boolean
  onClick: () => void
  desktop?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: desktop ? '16px 18px' : '14px 16px',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomStyle: 'solid',
        borderBottomColor: isLast ? 'transparent' : 'var(--color-border)',
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
            maxWidth: desktop ? 360 : 160,
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
  const isDesktop = useIsDesktopDetail()
  // const [starred, setStarred] = useState(false) // 즐겨찾기 — 계정 기능 구현 전 비활성화
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
        minHeight: '100svh',
        backgroundColor: 'var(--color-surface-bg)',
        paddingLeft: isDesktop ? 28 : 0,
        paddingRight: isDesktop ? 28 : 0,
        paddingBottom: isDesktop ? 40 : 0,
      }}
    >
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: 'var(--color-surface-bg)',
        marginLeft: isDesktop ? -28 : 0,
        marginRight: isDesktop ? -28 : 0,
      }}>
        <NavBar onBack={() => router.back()} onClose={() => router.push('/')} />
      </div>

      <ProfileHero name={directorName} count={directorMovies.length} desktop={isDesktop} />

      {/* 작품 목록 */}
      <div style={{
        maxWidth: isDesktop ? 860 : undefined,
        margin: isDesktop ? '0 auto' : undefined,
        padding: isDesktop ? '24px 0 64px' : '0 20px 52px',
        border: isDesktop ? '1px solid var(--color-border)' : undefined,
        borderRadius: isDesktop ? 20 : undefined,
        backgroundColor: isDesktop ? 'var(--color-surface-card)' : undefined,
        boxShadow: isDesktop ? '0 14px 44px rgba(20, 15, 10, 0.08)' : undefined,
        overflow: isDesktop ? 'hidden' : undefined,
        marginTop: isDesktop ? 20 : undefined,
      }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isDesktop ? 0 : 14,
            padding: isDesktop ? '20px 22px' : undefined,
            borderBottom: isDesktop ? '1px solid var(--color-border)' : undefined,
          }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
              작품 · {directorMovies.length}편
            </span>
            <SortChips active={sort} onChange={setSort} />
          </div>

          {/* 리스트 */}
          {directorMovies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isDesktop ? '56px 0' : '40px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
              작품 정보가 없습니다
            </div>
          ) : (
            <div style={{
              borderRadius: isDesktop ? 0 : 12,
              border: isDesktop ? 'none' : '1px solid var(--color-border)',
              overflow: 'hidden',
              backgroundColor: 'var(--color-surface-card)',
            }}>
              {visibleMovies.map((movie, i) => (
                <FilmographyRow
                  key={movie.id}
                  movie={movie}
                  isLast={i === visibleMovies.length - 1 && (expanded || hiddenCount <= 0)}
                  isActive={activeIdSet.has(movie.id)}
                  onClick={() => router.push(`/movie/${movie.id}`)}
                  desktop={isDesktop}
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

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
