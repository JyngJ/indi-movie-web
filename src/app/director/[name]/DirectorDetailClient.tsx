'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMovies, useActiveMovieIds, useDirectorProfile } from '@/lib/supabase/queries'
import type { Movie } from '@/types/api'
import { Toast, IconButton, SortToggle } from '@/components/primitives'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { Button } from '@/components/primitives'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { toSecureImageUrl } from '@/lib/media/imageUrl'

const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>

function useIsDesktopDetail() {
  return useMediaQuery('(min-width: 1024px)')   /* 레일(1024)과 기준 통일 */
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoClose = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoChevronDown = ({ flipped }: { flipped?: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flipped ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

/* ── ProfileHero ── */
function ProfileHero({
  name, originalName, photoUrl, nowPlayingCount = 0,
}: {
  name: string; originalName?: string; photoUrl?: string; nowPlayingCount?: number
}) {
  return (
    /* 2026-08-24: 중앙 정렬 → 좌 아바타 + 우 텍스트 (m4 /films/director 히어로 문법으로 통일) */
    <div style={{
      display: 'flex', gap: 16, alignItems: 'flex-start',
      padding: '24px var(--gutter) 20px',
      background: 'var(--color-surface-bg)',
    }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
        color: 'var(--color-text-caption)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
      }}>
        {photoUrl ? (
          <img src={toSecureImageUrl(photoUrl)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          {name}
        </h1>
        {originalName && (
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-sub)' }}>
            {originalName}
          </div>
        )}
        {nowPlayingCount > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-primary-base)', fontWeight: 600 }}>
            상영중 {nowPlayingCount}편
          </div>
        )}
      </div>
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {opts.map((o) => (
        <SortToggle key={o.key} active={active === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </SortToggle>
      ))}
    </div>
  )
}

/* ── 포스터 플레이스홀더 ── */
function MiniPoster({ src, title }: { src?: string; title?: string }) {
  return (
    <div style={{ width: 52, height: 76, borderRadius: 8, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title ? `${title} 포스터` : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--color-neutral-800)' }} />
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
      <MiniPoster src={movie.posterUrl} title={movie.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 'var(--text-subtitle)',
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
              height: 18, padding: '0 8px',
              borderRadius: 4,
              display: 'inline-flex', alignItems: 'center',
              fontSize: 'var(--text-badge)', fontWeight: 700,
              color: 'var(--color-on-accent)',
              backgroundColor: 'var(--color-primary-base)',
              flexShrink: 0,
            }}>
              상영중
            </span>
          )}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-caption)' }}>
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
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from')
  const isDesktop = useIsDesktopDetail()
  // const [starred, setStarred] = useState(false) // 즐겨찾기 — 계정 기능 구현 전 비활성화
  const [sort, setSort] = useState<SortKey>('newest')
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_COUNT = 4

  const { data: movies = [], isLoading } = useMovies()
  const { data: activeIds = [] } = useActiveMovieIds()
  const { data: profile } = useDirectorProfile(directorName)
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds])

  const directorMovies = useMemo(() => {
    const filtered = movies.filter((m) => m.director.includes(directorName))
    return [...filtered].sort((a, b) =>
      sort === 'newest' ? b.year - a.year : a.year - b.year
    )
  }, [movies, directorName, sort])

  const nowPlaying = useMemo(() => directorMovies.filter((m) => activeIdSet.has(m.id)), [directorMovies, activeIdSet])
  const visibleMovies = expanded ? directorMovies : directorMovies.slice(0, COLLAPSED_COUNT)
  const hiddenCount = directorMovies.length - COLLAPSED_COUNT

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        <Toast message="불러오는 중…" visible />
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
      {/* 상단 바 — breadcrumb, /films/director와 통일 (2026-08-24). 뒤로가기 규칙(fromPath)은 유지 */}
      <div style={{ marginLeft: isDesktop ? -28 : 0, marginRight: isDesktop ? -28 : 0 }}>
        <DetailTopBar
          crumbLabel="영화" crumbHref="/films" title={`감독 · ${directorName}`} isDesktop={isDesktop}
          onBack={() => fromPath ? router.push(fromPath) : router.back()}
        />
      </div>

      <ProfileHero name={directorName} originalName={profile?.originalName} photoUrl={profile?.photoUrl} nowPlayingCount={nowPlaying.length} />
      {/* 액션 행 — [♡ 관심 감독 등록(늘어남)][공유] (2026-08-24 통일) */}
      <FavoriteActionRow
        type="director"
        id={directorName}
        style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 16, maxWidth: isDesktop ? 480 : undefined }}
        trailing={
          <Button
            variant="tertiary" size="md" aria-label="공유"
            onClick={() => {
              void shareAndTrack({
                payload: { title: directorName, url: window.location.href },
                source: 'director_detail',
                scope: 'page',
                properties: { director_name: directorName },
              })
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <IcoShare />
            공유
          </Button>
        }
      />

      {/* 약력 */}
      {profile?.bio && (
        <div style={{ padding: '16px var(--gutter)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: 'var(--color-text-body)' }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* 섹션 디바이더 — 8px raised 밴드 (피그마 상세 통일 시안, 2026-08-24) */}
      {!isDesktop && <div aria-hidden style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />}
      {/* 현재 상영작 — 헤더 우측에 작은 지도 CTA (2026-08-24, 전폭 버튼에서 이동) */}
      {nowPlaying.length > 0 && (
        <div style={{ maxWidth: isDesktop ? 860 : undefined, margin: isDesktop ? '20px auto 0' : undefined, padding: isDesktop ? 0 : '16px var(--gutter) 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              현재 상영작 <span style={{ color: 'var(--color-primary-base)' }}>{nowPlaying.length}편</span>
            </span>
            <MapCtaButton fullWidth={false} size="sm" onClick={() => router.push(`/map?director=${encodeURIComponent(directorName)}`)}>
              지도에서 필터로 보기
            </MapCtaButton>
          </div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {nowPlaying.map((m) => (
              <button
                key={m.id}
                onClick={() => router.push(`/movie/${m.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minHeight: 'auto', flexShrink: 0, width: 96 }}
              >
                <div style={{ width: 96, height: 144, borderRadius: 'var(--radius-poster)', overflow: 'hidden', backgroundColor: 'var(--color-surface-raised)' }}>
                  {m.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toSecureImageUrl(m.posterUrl)} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isDesktop && <div aria-hidden style={{ height: 8, backgroundColor: 'var(--color-surface-raised)', marginTop: 20 }} />}
      {/* 작품 목록 */}
      <div style={{
        maxWidth: isDesktop ? 860 : undefined,
        margin: isDesktop ? '0 auto' : undefined,
        padding: isDesktop ? '24px 0 64px' : '0 var(--gutter) 52px',
        border: isDesktop ? '1px solid var(--color-border)' : undefined,
        borderRadius: isDesktop ? 20 : undefined,
        backgroundColor: isDesktop ? 'var(--color-surface-card)' : undefined,
        boxShadow: isDesktop ? '0 14px 44px rgba(20, 15, 10, 0.08)' : undefined,
        overflow: isDesktop ? 'hidden' : undefined,
        marginTop: isDesktop ? 20 : undefined,
      }}>
          {/* 헤더 */}
          <div style={{
            marginBottom: isDesktop ? 0 : 14,
            marginTop: isDesktop ? 0 : 20,
            padding: isDesktop ? '20px 22px 16px' : undefined,
            borderBottom: isDesktop ? '1px solid var(--color-border)' : undefined,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 'var(--text-badge)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
                작품 · {directorMovies.length}편
              </span>
              <SortChips active={sort} onChange={setSort} />
            </div>
            {/* 가이드 텍스트 추가 */}
            <div style={{ 
              marginTop: 12,
              fontSize: 12,
              color: 'var(--color-text-sub)',
              lineHeight: 1.4,
            }}>
              현재 상영일정이 존재하는 영화는 <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                height: 16, 
                padding: '0 4px', 
                borderRadius: 4, 
                backgroundColor: 'var(--color-primary-base)', 
                color: 'var(--color-on-accent)', 
                fontSize: 'var(--text-badge)', 
                fontWeight: 700, 
                verticalAlign: 'text-bottom',
                margin: '0 4px'
              }}>상영중</span> 태그가 붙어요
            </div>
          </div>

          {/* 리스트 */}
          {directorMovies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isDesktop ? '56px 0' : '40px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
              작품 정보가 없어요
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
                    gap: 8,
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
