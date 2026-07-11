'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useMovies, useActiveMovieIds, useDirectorProfile } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { Movie } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { trackEvent } from '@/lib/analytics/client'
import { Clapperboard } from 'lucide-react'

function useIsDesktop() {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1280px)')
    const fn = () => setV(m.matches); fn()
    m.addEventListener('change', fn); return () => m.removeEventListener('change', fn)
  }, [])
  return v
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
const IcoChevronRight = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
const IcoChevronDown = ({ flipped }: { flipped?: boolean }) => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flipped ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}><path d="M6 9l6 6 6-6" /></svg>
const IcoMap = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>

type SortKey = 'newest' | 'oldest'

/* ── MiniPoster ─────────────────────────────────────────────────── */
function MiniPoster({ src }: { src?: string }) {
  return (
    <div style={{ width: 52, height: 76, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 5px, transparent 5px 10px)' }} />}
    </div>
  )
}

/* ── NowPlayingPoster ────────────────────────────────────────────── */
function NowPlayingPoster({ movie, isDesktop, onClick }: { movie: Movie; isDesktop: boolean; onClick: () => void }) {
  const w = isDesktop ? 120 : 96
  const h = isDesktop ? 180 : 144
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', width: w, flexShrink: 0 }}>
      <div style={{ width: w, height: h, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={movie.title} fill sizes={`${w}px`} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)' }} />
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, width: '100%' }}>
        {normalizeTitle(movie.title)}
      </span>
    </button>
  )
}

/* ── FilmographyRow ──────────────────────────────────────────────── */
function FilmographyRow({ movie, isLast, isActive, onClick, isDesktop }: { movie: Movie; isLast: boolean; isActive: boolean; onClick: () => void; isDesktop: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isDesktop ? '14px 18px' : '12px 16px', background: 'transparent', border: 'none', borderBottom: isLast ? 'none' : '1px solid var(--color-border)', width: '100%', cursor: 'pointer', textAlign: 'left', minHeight: 'auto' }}
    >
      <MiniPoster src={movie.posterUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 700, color: isActive ? 'var(--color-primary-base)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isDesktop ? 360 : 180 }}>
            {normalizeTitle(movie.title)}
          </span>
          {isActive && <span style={{ height: 18, padding: '0 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 9, fontWeight: 700, color: '#fff', backgroundColor: 'var(--color-primary-base)', flexShrink: 0 }}>상영중</span>}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-caption)' }}>
          {[movie.year, movie.genre[0]].filter(Boolean).join(' · ')}
        </div>
      </div>
      <IcoChevronRight />
    </button>
  )
}

/* ── 메인 ────────────────────────────────────────────────────────── */
export function FilmsDirectorDetailClient({ directorName }: { directorName: string }) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [sort, setSort] = useState<SortKey>('newest')
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_COUNT = 5

  const { data: movies = [], isLoading } = useMovies()
  const { data: activeIds = [] } = useActiveMovieIds()
  const { data: profile } = useDirectorProfile(directorName)
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds])

  const directorMovies = useMemo(() => {
    return movies
      .filter((m) => m.director.includes(directorName))
      .sort((a, b) => sort === 'newest' ? b.year - a.year : a.year - b.year)
  }, [movies, directorName, sort])

  const nowPlaying = useMemo(() => directorMovies.filter((m) => activeIdSet.has(m.id)), [directorMovies, activeIdSet])
  const visibleMovies = expanded ? directorMovies : directorMovies.slice(0, COLLAPSED_COUNT)
  const hiddenCount = directorMovies.length - COLLAPSED_COUNT

  if (isLoading) {
    return <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface-bg)' }}><span style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>불러오는 중…</span></div>
  }

  const navBar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: isDesktop ? 4 : 0, paddingRight: 12, gap: 6, maxWidth: isDesktop ? 1200 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 4 : 0, minWidth: 0 }}>
          <button onClick={() => router.back()} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}><IcoChevronLeft /></button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto', padding: '0 2px', flexShrink: 0 }}>영화</button>
          <span style={{ color: 'var(--color-text-caption)', fontSize: 13, flexShrink: 0 }}>&gt;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>감독 · {directorName}</span>
        </div>
        <RegionFilterWidget />
      </div>
    </div>
  )

  const heroSection = (
    <div style={{
      background: 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      padding: '32px 20px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* 아바타 */}
      <div style={{ width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
        {profile?.photoUrl ? (
          <img src={profile.photoUrl} alt={directorName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <span style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.7)' }}>{directorName.charAt(0)}</span>
        )}
      </div>

      {/* 이름 */}
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center' }}>
        {directorName}
      </h1>
      {profile?.originalName && (
        <div style={{ marginTop: 5, fontSize: 14, color: 'var(--color-text-sub)', fontStyle: 'italic', textAlign: 'center' }}>{profile.originalName}</div>
      )}

      {/* 메타 정보 */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-caption)' }}>
        {nowPlaying.length > 0 && (
          <span style={{ color: 'var(--color-primary-base)', fontWeight: 600 }}>상영중 {nowPlaying.length}편</span>
        )}
      </div>

      {/* CTA 버튼 */}
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push(`/?director=${encodeURIComponent(directorName)}`)}
          style={{ height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1px solid var(--color-primary-base)', backgroundColor: 'var(--color-primary-base)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <IcoMap /> 지도에서 필터로 보기
        </button>
        <button
          onClick={() => {
            trackEvent('share clicked', { director_name: directorName, source: 'films_director_detail' })
            navigator.share?.({ title: directorName, url: window.location.href }).catch(() => {})
          }}
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', cursor: 'pointer', flexShrink: 0 }}
        >
          <IcoShare />
        </button>
      </div>
    </div>
  )

  return (
    <div className="page-slide-in" style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
      {navBar}

      <div style={{ maxWidth: isDesktop ? 1200 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        {heroSection}

        {/* 소개 */}
        {profile?.bio && (
          <div style={{ padding: '20px 20px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>소개</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>{profile.bio}</p>
          </div>
        )}

        {/* 현재 상영작 */}
        {nowPlaying.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <p style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clapperboard size={20} strokeWidth={2} color="var(--color-primary-base)" /> 현재 상영작 <span style={{ fontSize: 16, color: 'var(--color-primary-base)' }}>{nowPlaying.length}편</span>
            </p>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {nowPlaying.map((m) => (
                <NowPlayingPoster
                  key={m.id}
                  movie={m}
                  isDesktop={isDesktop}
                  onClick={() => router.push(`/films/movie/${m.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 작품 목록 */}
        <div style={{ padding: isDesktop ? '20px 0 64px' : '20px 0 52px' }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              작품 목록 <span style={{ fontSize: 16, color: 'var(--color-text-caption)', fontWeight: 400 }}>{directorMovies.length}편</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['newest', 'oldest'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  style={{ height: 26, padding: '0 10px', borderRadius: 999, border: '1px solid', borderColor: sort === k ? 'var(--color-primary-base)' : 'var(--color-border)', backgroundColor: sort === k ? 'var(--color-primary-subtle-l)' : 'transparent', color: sort === k ? 'var(--color-primary-base)' : 'var(--color-text-caption)', fontSize: 12, fontWeight: sort === k ? 600 : 400, cursor: 'pointer', minHeight: 'auto' }}
                >
                  {k === 'newest' ? '최신순' : '오래된순'}
                </button>
              ))}
            </div>
          </div>

          {directorMovies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>작품 정보가 없습니다</div>
          ) : (
            <div style={{ backgroundColor: 'var(--color-surface-card)' }}>
              {visibleMovies.map((m, i) => (
                <FilmographyRow
                  key={m.id}
                  movie={m}
                  isLast={i === visibleMovies.length - 1 && (expanded || hiddenCount <= 0)}
                  isActive={activeIdSet.has(m.id)}
                  onClick={() => router.push(`/films/movie/${m.id}`)}
                  isDesktop={isDesktop}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{ width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-sub)', fontSize: 13, fontWeight: 500, cursor: 'pointer', minHeight: 'auto' }}
                >
                  <IcoChevronDown flipped={expanded} />
                  {expanded ? '접기' : `${hiddenCount}편 더 보기`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
