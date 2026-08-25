'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRouter } from 'next/navigation'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { FavoriteActionButton } from '@/components/domain/favorites/FavoriteActionRow'
import Image from 'next/image'
import { useMovies, useActiveMovieIds, useDirectorProfile } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { Movie } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { Toast, Avatar, IconButton, SortToggle } from '@/components/primitives'
import { Button } from '@/components/primitives'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'

function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')   /* 레일(1024)과 기준 통일 */
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
const IcoChevronRight = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
const IcoChevronDown = ({ flipped }: { flipped?: boolean }) => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flipped ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}><path d="M6 9l6 6 6-6" /></svg>
const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>

type SortKey = 'newest' | 'oldest'

/* ── MiniPoster ─────────────────────────────────────────────────── */
function MiniPoster({ src, title }: { src?: string; title?: string }) {
  return (
    <div style={{ width: 52, height: 76, borderRadius: 8, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      {src ? <img src={src} alt={title ? `${title} 포스터` : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--color-neutral-800)' }} />}
    </div>
  )
}

/* ── NowPlayingPoster ────────────────────────────────────────────── */
function NowPlayingPoster({ movie, isDesktop, onClick }: { movie: Movie; isDesktop: boolean; onClick: () => void }) {
  const w = isDesktop ? 120 : 96
  const h = isDesktop ? 180 : 144
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', width: w, flexShrink: 0 }}>
      <div style={{ width: w, height: h, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={movie.title} fill sizes={`${w}px`} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--color-neutral-800)' }} />
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
      <MiniPoster src={movie.posterUrl} title={movie.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: isActive ? 'var(--color-primary-base)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isDesktop ? 360 : 180 }}>
            {normalizeTitle(movie.title)}
          </span>
          {isActive && <span style={{ height: 18, padding: '0 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-on-accent)', backgroundColor: 'var(--color-primary-base)', flexShrink: 0 }}>상영중</span>}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-caption)' }}>
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
    return <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}><Toast message="불러오는 중…" visible /></div>
  }

  const navBar = (
    <DetailTopBar crumbLabel="영화" crumbHref="/films" title={`감독 · ${directorName}`} isDesktop={isDesktop} trailing={<RegionFilterWidget />} />
  )

  const heroSection = (
    /* 영화 상세 히어로 문법: 왼쪽 이미지(아바타) + 오른쪽 텍스트/CTA 좌측 정렬 */
    <div style={{
      background: 'var(--color-surface-bg)',
      padding: isDesktop ? '32px 0 28px' : '24px var(--gutter) 20px',
      display: 'flex', gap: isDesktop ? 32 : 16, alignItems: 'flex-start',
    }}>
      {/* 아바타 */}
      <Avatar name={directorName} photoUrl={profile?.photoUrl} size={isDesktop ? 160 : 100} />

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
      <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
        {directorName}
      </h1>
      {profile?.originalName && (
        <div style={{ marginTop: 4, fontSize: isDesktop ? 14 : 12, color: 'var(--color-text-sub)' }}>{profile.originalName}</div>
      )}

      {/* 메타 정보 */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-caption)' }}>
        {nowPlaying.length > 0 && (
          <span style={{ color: 'var(--color-primary-base)', fontWeight: 600 }}>상영중 {nowPlaying.length}편</span>
        )}
      </div>

      {/* CTA 버튼 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MapCtaButton fullWidth={false} onClick={() => router.push(`/map?director=${encodeURIComponent(directorName)}`)}>
          지도에서 필터로 보기
        </MapCtaButton>
        <FavoriteActionButton type="director" id={directorName} />
        <IconButton
          variant="overlay"
          size={44}
          aria-label="공유"
          onClick={() => {
            void shareAndTrack({
              payload: { title: directorName, url: window.location.href },
              source: 'films_director_detail',
              scope: 'page',
              properties: { director_name: directorName },
            })
          }}
        >
          <IcoShare />
        </IconButton>
      </div>
      </div>
    </div>
  )

  return (
    <div className="page-slide-in" style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
      {navBar}

      <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        {heroSection}

        {/* 소개 */}
        {profile?.bio && (
          <div style={{ padding: '20px var(--gutter)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>소개</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>{profile.bio}</p>
          </div>
        )}

        {/* 현재 상영작 */}
        {nowPlaying.length > 0 && (
          <div style={{ padding: '20px var(--gutter) 0' }}>
            <p style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              현재 상영작 <span style={{ fontSize: 16, color: 'var(--color-primary-base)' }}>{nowPlaying.length}편</span>
            </p>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--gutter) 12px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              작품 목록 <span style={{ fontSize: 16, color: 'var(--color-text-caption)', fontWeight: 400 }}>{directorMovies.length}편</span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['newest', 'oldest'] as SortKey[]).map((k) => (
                <SortToggle key={k} active={sort === k} onClick={() => setSort(k)}>
                  {k === 'newest' ? '최신순' : '오래된순'}
                </SortToggle>
              ))}
            </div>
          </div>

          {directorMovies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>작품 정보가 없어요</div>
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
                /* 면 색이 Button tertiary와 같다 — 목록 하단에 붙는 형태라 위 구분선만 얹는다 */
                <Button
                  variant="tertiary"
                  size="sm"
                  fullWidth
                  onClick={() => setExpanded(!expanded)}
                  style={{ borderTop: '1px solid var(--color-border)', borderRadius: 0 }}
                >
                  <IcoChevronDown flipped={expanded} />
                  {expanded ? '접기' : `${hiddenCount}편 더 보기`}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
