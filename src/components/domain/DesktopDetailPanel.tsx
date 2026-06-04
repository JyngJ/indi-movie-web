'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMovieDetail, useMovieTheaterShowtimes, useMovies, useActiveMovieIds } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { useUserLocation } from '@/hooks/useUserLocation'
import { locationAdapter } from '@/lib/adapters/location'
import { calculateAndFormatDistance, calculateDistanceKm } from '@/lib/map/distanceUtils'
import { getRegionFromAddress } from '@/lib/regions'

export type DesktopPanelState =
  | { type: 'movie'; id: string }
  | { type: 'director'; name: string }

/* ── 아이콘 ── */
const IcoClose = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoChevronLeft = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoUser = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IcoMap = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const IcoPin = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoChevronDown = ({ flipped }: { flipped?: boolean }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: flipped ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

/* ── 공통 패널 래퍼 ── */
function PanelShell({
  onClose,
  onBack,
  title,
  children,
}: {
  onClose: () => void
  onBack?: () => void
  title?: string
  children: React.ReactNode
}) {
  const btn: React.CSSProperties = {
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer',
    color: 'var(--color-text-body)', borderRadius: 8, flexShrink: 0,
  }
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--color-surface-bg)',
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: onBack ? 8 : 16,
        paddingRight: 8,
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        gap: 4,
      }}>
        {onBack && (
          <button style={btn} onClick={onBack}><IcoChevronLeft /></button>
        )}
        <span style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        <button style={btn} onClick={onClose}><IcoClose /></button>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
        {children}
      </div>
    </div>
  )
}

/* ── 영화 상세 패널 ── */
function MoviePanel({
  movieId,
  regionId,
  onClose,
  onBack,
  onDirectorOpen,
  onMovieFilterOnMap,
  onTheaterOpen,
}: {
  movieId: string
  regionId?: string | null
  onClose: () => void
  onBack?: () => void
  onDirectorOpen: (name: string) => void
  onMovieFilterOnMap: (id: string, title: string) => void
  onTheaterOpen: (theaterId: string, date: string) => void
}) {
  const [tab, setTab] = useState<'info' | 'theaters'>('info')
  const { data: movie, isLoading } = useMovieDetail(movieId)

  useEffect(() => {
    if (!movie) return
    trackEvent('movie detail viewed', {
      movie_id: movie.id,
      movie_title: movie.title,
      source: 'desktop_panel',
      initial_tab: tab,
    })
    classifySessionIntent('type_a', { source: 'desktop_panel', movie_id: movie.id })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id])

  if (isLoading) {
    return (
      <PanelShell onClose={onClose} onBack={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--color-text-caption)' }}>
          불러오는 중…
        </div>
      </PanelShell>
    )
  }
  if (!movie) {
    return (
      <PanelShell onClose={onClose} onBack={onBack} title="영화 정보">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--color-text-caption)' }}>
          영화를 찾을 수 없습니다
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell onClose={onClose} onBack={onBack} title={movie.title}>
      {/* 히어로 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-surface-card) 0%, var(--color-primary-subtle-l) 100%)',
        padding: '24px 20px 20px',
        display: 'flex',
        gap: 18,
        alignItems: 'flex-start',
      }}>
        <div style={{ flexShrink: 0, width: 90, height: 135 }}>
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={movie.posterUrl} alt="" style={{ width: 90, height: 135, borderRadius: 8, objectFit: 'cover', display: 'block', boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }} />
          ) : (
            <div style={{ width: 90, height: 135, borderRadius: 8, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
            {movie.title}
          </h1>
          {movie.originalTitle && (
            <div style={{ marginTop: 4, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-caption)' }}>
              {movie.originalTitle}
            </div>
          )}
          {movie.genre.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
              {movie.genre.map((g) => (
                <span key={g} style={{
                  height: 22, padding: '0 9px',
                  display: 'inline-flex', alignItems: 'center',
                  borderRadius: 999, fontSize: 11, fontWeight: 500,
                  backgroundColor: 'var(--color-primary-subtle-l)',
                  border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)',
                  color: 'var(--color-primary-base)',
                }}>{g}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
            {[movie.nation ? withFlagsRaw(movie.nation) : undefined, movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {(['info', 'theaters'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              trackEvent('movie detail tab changed', {
                movie_id: movie.id,
                movie_title: movie.title,
                from_tab: tab,
                to_tab: t,
                source: 'desktop_panel',
              })
              setTab(t)
            }}
            style={{
              flex: 1, height: 42, border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: tab === t ? 'var(--color-primary-base)' : 'transparent',
            }}
          >
            {t === 'info' ? '영화 정보' : '상영 영화관'}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {tab === 'info' ? (
        <MovieInfoTab movie={movie} onDirectorClick={onDirectorOpen} />
      ) : (
        <MovieTheatersTab
          movieId={movieId}
          regionId={regionId}
          onMapClick={() => onMovieFilterOnMap(movie.id, movie.title)}
          onTheaterOpen={onTheaterOpen}
        />
      )}
    </PanelShell>
  )
}

function MovieInfoTab({ movie, onDirectorClick }: { movie: NonNullable<ReturnType<typeof useMovieDetail>['data']>; onDirectorClick: (n: string) => void }) {
  const divider: React.CSSProperties = { borderTop: '1px solid var(--color-border)', margin: '0 20px' }
  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)', marginBottom: 10 }

  return (
    <div style={{ paddingBottom: 32 }}>
      {movie.synopsis && (
        <div style={{ padding: '24px 20px' }}>
          <p style={sectionLabel}>시놉시스</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>{movie.synopsis}</p>
        </div>
      )}
      {movie.director.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ padding: '20px 20px' }}>
            <p style={sectionLabel}>감독</p>
            {movie.director.map((name) => (
              <button
                key={name}
                onClick={() => onDirectorClick(name)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-card)',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 8, minHeight: 'auto',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-caption)' }}>
                  <IcoUser />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500, textDecoration: 'underline' }}>감독 페이지 보기</div>
                </div>
                <IcoChevronRight />
              </button>
            ))}
          </div>
        </>
      )}
      <div style={divider} />
      <div style={{ padding: '20px 20px' }}>
        <p style={sectionLabel}>상세 정보</p>
        <div style={{ borderRadius: 10, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {[
            { key: '국가', value: movie.nation ? withFlagsRaw(movie.nation) : undefined },
            { key: '개봉', value: movie.year ? String(movie.year) : undefined },
            { key: '상영 시간', value: movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined },
            { key: '장르', value: movie.genre.join(', ') || undefined },
          ].filter((r) => r.value).map((row, i, arr) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <span style={{ width: 72, flexShrink: 0, fontSize: 13, color: 'var(--color-text-sub)', fontWeight: 500 }}>{row.key}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDateLabel(dateStr: string) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const [, m, d] = dateStr.split('-').map(Number)
  const dow = DOW[new Date(dateStr + 'T00:00:00').getDay()]
  return `${m}월 ${d}일(${dow})`
}

function MovieTheatersTab({
  movieId,
  regionId,
  onMapClick,
  onTheaterOpen,
}: {
  movieId: string
  regionId?: string | null
  onMapClick: () => void
  onTheaterOpen: (theaterId: string, date: string) => void
}) {
  const { data: theaters = [], isLoading } = useMovieTheaterShowtimes(movieId)
  const { coords } = useUserLocation()
  const distanceCoords = coords ?? locationAdapter.getDefaultLocation()

  const sortedTheaters = useMemo(() => {
    return [...theaters].sort((a, b) => {
      const aDistance = calculateDistanceKm(distanceCoords.lat, distanceCoords.lng, a.theaterLat, a.theaterLng)
      const bDistance = calculateDistanceKm(distanceCoords.lat, distanceCoords.lng, b.theaterLat, b.theaterLng)
      if (aDistance == null && bDistance == null) return a.theaterName.localeCompare(b.theaterName, 'ko')
      if (aDistance == null) return 1
      if (bDistance == null) return -1
      return aDistance - bDistance
    })
  }, [distanceCoords.lat, distanceCoords.lng, theaters])

  const { inRegion, otherRegion } = useMemo(() => {
    if (!regionId) return { inRegion: [] as typeof sortedTheaters, otherRegion: sortedTheaters }
    return {
      inRegion: sortedTheaters.filter(t => getRegionFromAddress(t.theaterAddress) === regionId),
      otherRegion: sortedTheaters.filter(t => getRegionFromAddress(t.theaterAddress) !== regionId),
    }
  }, [sortedTheaters, regionId])

  const renderTheaterCard = (entry: typeof sortedTheaters[0]) => (
    <div key={entry.theaterId} style={{ borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', overflow: 'hidden' }}>
      {/* 극장 헤더 */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{entry.theaterName}</div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-text-sub)', fontSize: 11 }}>
            <IcoPin />{entry.theaterAddress}
          </div>
        </div>
        {(() => {
          const distance = calculateAndFormatDistance(distanceCoords.lat, distanceCoords.lng, entry.theaterLat, entry.theaterLng)
          return distance ? (
            <span style={{
              flexShrink: 0, alignSelf: 'center', minWidth: 54, height: 24,
              padding: '0 8px', marginRight: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start',
              borderRadius: 999, border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-body)',
              fontSize: 11, fontWeight: 500, fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap',
            }}>
              {distance}
            </span>
          ) : null
        })()}
        <button
          onClick={() => {
            trackEvent('movie theater selected', { movie_id: movieId, theater_id: entry.theaterId, theater_name: entry.theaterName, source: 'desktop_panel' })
            onTheaterOpen(entry.theaterId, entry.dateGroups[0]?.date ?? '')
          }}
          style={{ flexShrink: 0, alignSelf: 'center', height: 26, padding: '0 10px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--color-primary-base) 35%, transparent)', backgroundColor: 'var(--color-primary-subtle-l)', color: 'var(--color-primary-base)', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 'auto' }}
        >
          영화관 보기
        </button>
      </div>
      {/* 날짜별 상영시간 */}
      {entry.dateGroups.map((group) => (
        <div key={group.date} style={{ borderTop: '1px solid var(--color-border)', padding: '9px 14px 11px' }}>
          <div style={{ marginBottom: 7, fontSize: 10, fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.3px' }}>
            {formatDateLabel(group.date)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {group.showtimes.map((st) => {
              const soldout = st.seatAvailable === 0
              const low = !soldout && st.seatAvailable !== null && st.seatAvailable <= 20
              const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
              return (
                <button
                  key={st.id}
                  disabled={soldout}
                  onClick={soldout ? undefined : () => {
                    trackEvent('movie theater selected', { movie_id: movieId, theater_id: entry.theaterId, theater_name: entry.theaterName, showtime_id: st.id, show_date: group.date, show_time: st.showTime, source: 'desktop_panel_showtime' })
                    onTheaterOpen(entry.theaterId, group.date)
                  }}
                  style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-raised)', cursor: soldout ? 'default' : 'pointer', opacity: soldout ? 0.5 : 1, textAlign: 'left', minHeight: 'auto' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                    {st.showTime.slice(0, 5)}
                    {st.endTime && <span style={{ fontSize: 10, color: 'var(--color-text-caption)', marginLeft: 3 }}>-{st.endTime.slice(0, 5)}</span>}
                  </div>
                  {st.seatTotal > 0 && (
                    <div style={{ marginTop: 3, fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                      <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
                      <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
                      {soldout && <span style={{ marginLeft: 3, fontSize: 9, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  const sectionDivider = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
      <span style={{ fontSize: 11, color: 'var(--color-text-caption)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
    </div>
  )

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <button
        onClick={() => {
          trackEvent('movie theaters map opened', { movie_id: movieId, theater_count: theaters.length, source: 'desktop_panel' })
          classifySessionIntent('type_a', { source: 'desktop_panel', movie_id: movieId })
          onMapClick()
        }}
        style={{
          width: '100%', height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 10, border: '1px solid var(--color-primary-base)',
          backgroundColor: 'var(--color-primary-subtle-l)',
          color: 'var(--color-primary-base)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <IcoMap />
        지도에서 필터로 보기
      </button>

      <p style={{ margin: '6px 0 12px', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
        {regionId && (
          <><b style={{ color: 'var(--color-primary-base)' }}>{regionId}</b>{' 지역 '}
          <b style={{ color: 'var(--color-primary-base)' }}>{inRegion.length}</b>{'개 영화관 상영중, '}</>
        )}
        {'전국 '}<b style={{ color: 'var(--color-primary-base)' }}>{theaters.length}</b>{'개 영화관 상영중'}
      </p>

      {isLoading ? (
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--color-text-caption)' }}>불러오는 중…</div>
      ) : theaters.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 32, fontSize: 13, color: 'var(--color-text-caption)' }}>상영 중인 영화관이 없습니다</div>
      ) : regionId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inRegion.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
              {regionId} 지역 상영 정보가 없습니다
            </div>
          ) : (
            inRegion.map(renderTheaterCard)
          )}
          {otherRegion.length > 0 && (
            <>
              {sectionDivider(`${regionId} 외 지역`)}
              {otherRegion.map(renderTheaterCard)}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedTheaters.map(renderTheaterCard)}
        </div>
      )}
    </div>
  )
}

/* ── 감독 상세 패널 ── */
function DirectorPanel({
  directorName,
  onClose,
  onBack,
  onMovieOpen,
  onDirectorFilterOnMap,
}: {
  directorName: string
  onClose: () => void
  onBack?: () => void
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
      <PanelShell onClose={onClose} onBack={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontSize: 13, color: 'var(--color-text-caption)' }}>
          불러오는 중…
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell onClose={onClose} onBack={onBack} title={directorName}>
      {/* 감독 헤더 */}
      <div style={{ padding: '28px 20px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', flexShrink: 0 }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{directorName}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-caption)' }}>작품 {directorMovies.length}편</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <button
          onClick={() => onDirectorFilterOnMap(directorName)}
          style={{
            width: '100%', height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 10,
            border: '1px solid var(--color-primary-base)',
            backgroundColor: 'var(--color-primary-subtle-l)',
            color: 'var(--color-primary-base)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IcoMap />
          지도에서 필터로 보기
        </button>
      </div>

      {/* 정렬 + 목록 */}
      <div style={{ padding: '16px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
            작품 · {directorMovies.length}편
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['newest', 'oldest'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--color-border)',
                  backgroundColor: sort === s ? 'var(--color-primary-base)' : 'transparent',
                  color: sort === s ? '#fff' : 'var(--color-text-caption)',
                }}
              >
                {s === 'newest' ? '최신순' : '오래된순'}
              </button>
            ))}
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
                  padding: '12px 14px',
                  borderWidth: 0,
                  borderBottomWidth: i < visibleMovies.length - 1 ? 1 : 0,
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--color-border)',
                  background: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto',
                }}
              >
                {movie.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.posterUrl} alt="" style={{ width: 36, height: 52, borderRadius: 5, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                ) : (
                  <div style={{ width: 36, height: 52, borderRadius: 5, backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--color-primary-base)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {movie.title}
                    {isActive && (
                      <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700, color: '#fff', backgroundColor: 'var(--color-primary-base)', verticalAlign: 'middle' }}>상영중</span>
                    )}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-caption)' }}>
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
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

/* ── 메인 export ── */
export function DesktopDetailPanel({
  panel,
  regionId,
  onClose,
  onBack,
  onNavigate,
  onMovieFilterOnMap,
  onDirectorFilterOnMap,
  onTheaterOpen,
}: {
  panel: DesktopPanelState
  regionId?: string | null
  onClose: () => void
  onBack?: () => void
  onNavigate: (next: DesktopPanelState) => void
  onMovieFilterOnMap: (id: string, title: string) => void
  onDirectorFilterOnMap: (name: string) => void
  onTheaterOpen: (movieId: string, theaterId: string, date: string) => void
}) {
  if (panel.type === 'movie') {
    return (
      <MoviePanel
        movieId={panel.id}
        regionId={regionId}
        onClose={onClose}
        onBack={onBack}
        onDirectorOpen={(name) => onNavigate({ type: 'director', name })}
        onMovieFilterOnMap={onMovieFilterOnMap}
        onTheaterOpen={(theaterId, date) => onTheaterOpen(panel.id, theaterId, date)}
      />
    )
  }

  return (
    <DirectorPanel
      directorName={panel.name}
      onClose={onClose}
      onBack={onBack}
      onMovieOpen={(id) => onNavigate({ type: 'movie', id })}
      onDirectorFilterOnMap={onDirectorFilterOnMap}
    />
  )
}
