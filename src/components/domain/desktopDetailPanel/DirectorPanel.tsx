'use client'

import { useState, useMemo } from 'react'
import { useMovies, useActiveMovieIds } from '@/lib/supabase/queries'
import { Toast, SortToggle } from '@/components/primitives'
import { PanelShell } from './PanelShell'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { IcoChevronRight, IcoChevronDown } from './icons'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'

/* ── 감독 상세 패널 ── */
export function DirectorPanel({
  directorName,
  onClose,
  onBack,
  embedded,
  onMovieOpen,
  onDirectorFilterOnMap,
}: {
  directorName: string
  onClose: () => void
  onBack?: () => void
  embedded?: boolean
  onMovieOpen: (id: string) => void
  onDirectorFilterOnMap: (name: string) => void
}) {
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_COUNT = 6

  const { data: movies = [], isLoading } = useMovies()
  const { data: activeIds = [] } = useActiveMovieIds()
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds])

  const directorMovies = useMemo(() => {
    const filtered = movies.filter((m) => m.director.includes(directorName))
    return [...filtered].sort((a, b) => sort === 'newest' ? b.year - a.year : a.year - b.year)
  }, [movies, directorName, sort])

  const visibleMovies = expanded ? directorMovies : directorMovies.slice(0, COLLAPSED_COUNT)
  const hiddenCount = directorMovies.length - COLLAPSED_COUNT

  if (isLoading) {
    return (
      <PanelShell onClose={onClose} onBack={onBack} embedded={embedded}>
        <div style={{ height: 200 }}>
          <Toast message="데이터 불러오는 중…" visible />
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell onClose={onClose} onBack={onBack} embedded={embedded} title={directorName}>
      {/* 감독 헤더 */}
      <div style={{ padding: '28px var(--gutter) 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', flexShrink: 0 }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{directorName}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-caption)' }}>작품 {directorMovies.length}편</div>
        </div>
      </div>
      <FavoriteActionRow type="director" id={directorName} style={{ padding: '16px var(--gutter) 0' }} />

      <div style={{ padding: '16px var(--gutter) 0' }}>
        <MapCtaButton onClick={() => onDirectorFilterOnMap(directorName)}>
          지도에서 필터로 보기
        </MapCtaButton>
      </div>

      {/* 정렬 + 목록 */}
      <div style={{ padding: '16px var(--gutter) 32px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
              작품 · {directorMovies.length}편
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['newest', 'oldest'] as const).map((s) => (
                <SortToggle key={s} active={sort === s} onClick={() => setSort(s)}>
                  {s === 'newest' ? '최신순' : '오래된순'}
                </SortToggle>
              ))}
            </div>
          </div>
          <div style={{ 
            marginTop: 12,
            fontSize: 'var(--text-badge)',
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
            }}>상영중</span> 태그가 표시됩니다.
          </div>
        </div>

        <div style={{ borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface-card)' }}>
          {visibleMovies.map((movie, i) => {
            const isActive = activeIdSet.has(movie.id)
            return (
              <button
                key={movie.id}
                onClick={() => onMovieOpen(movie.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderWidth: 0,
                  borderBottomWidth: i < visibleMovies.length - 1 ? 1 : 0,
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--color-border)',
                  background: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto',
                }}
              >
                {movie.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.posterUrl} alt={`${movie.title} 포스터`} style={{ width: 36, height: 52, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                ) : (
                  <div style={{ width: 36, height: 52, borderRadius: 4, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--color-primary-base)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {movie.title}
                    {isActive && (
                      <span style={{ marginLeft: 8, padding: 4, borderRadius: 4, fontSize: 'var(--text-badge)', fontWeight: 700, lineHeight: 1, display: 'inline-flex', alignItems: 'center', color: 'var(--color-on-accent)', backgroundColor: 'var(--color-primary-base)', verticalAlign: 'middle' }}>상영중</span>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-caption)' }}>
                    {[movie.year, movie.genre[0]].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <IcoChevronRight />
              </button>
            )
          })}

          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                width: '100%', height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderWidth: 0,
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                borderTopColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-text-sub)', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', borderRadius: '0 0 12px 12px', minHeight: 'auto',
              }}
            >
              <IcoChevronDown flipped={expanded} />
              {expanded ? '접기' : `${hiddenCount}편 더 보기`}
            </button>
          )}
        </div>
      </div>
    </PanelShell>
  )
}
