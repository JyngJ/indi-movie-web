'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMovieDetail, useMovieTheaterShowtimes, useActiveMovieIds } from '@/lib/supabase/queries'
import type { MovieDetail, MovieTheaterEntry } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { recordRecentlyViewed } from '@/lib/curation/recentlyViewed'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { useUserLocation } from '@/hooks/useUserLocation'
import { locationAdapter } from '@/lib/adapters/location'
import { calculateAndFormatDistance, calculateDistanceKm } from '@/lib/map/distanceUtils'
import { getRegionFromAddress, getRegionFromCoords } from '@/lib/regions'

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
const IcoMap = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const IcoPin = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoUser = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

/* ── NavBar ── */
function NavBar({
  title,
  titleVisible,
  onBack,
  onClose,
}: {
  title: string
  titleVisible: boolean
  onBack: () => void
  onClose: () => void
}) {
  const btn: React.CSSProperties = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)',
    flexShrink: 0,
  }
  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 4,
      paddingRight: 4,
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-primary-subtle-l)',
    }}>
      <button style={btn} onClick={onBack}><IcoChevronLeft /></button>
      <span style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 4px',
        opacity: titleVisible ? 1 : 0,
        transition: 'opacity 180ms ease',
      }}>
        {title}
      </span>
      <button style={btn} onClick={onClose}><IcoClose /></button>
    </div>
  )
}

/* ── HeroSection ── */
function HeroSection({ movie, titleRef, desktop = false }: { movie: MovieDetail; titleRef: React.Ref<HTMLHeadingElement>; desktop?: boolean }) {
  const posterW = desktop ? 220 : 96
  const posterH = desktop ? 330 : 144
  return (
    <div style={{
      maxWidth: desktop ? 1120 : undefined,
      margin: desktop ? '28px auto 0' : undefined,
      border: desktop ? '1px solid var(--color-border)' : undefined,
      borderRadius: desktop ? 20 : 0,
      overflow: desktop ? 'hidden' : undefined,
      background: desktop
        ? 'linear-gradient(135deg, var(--color-surface-card) 0%, var(--color-primary-subtle-l) 100%)'
        : 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      boxShadow: desktop ? '0 18px 54px rgba(20, 15, 10, 0.10)' : undefined,
      padding: desktop ? 32 : '24px 20px 20px',
      display: 'flex',
      gap: desktop ? 34 : 16,
      alignItems: 'flex-start',
    }}>
      {/* 포스터 */}
      <div style={{ flexShrink: 0, position: 'relative', width: posterW, height: posterH }}>
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={`${movie.title} 포스터`}
            fill
            priority
            sizes={`(min-width: 1024px) ${posterW}px, ${posterW}px`}
            style={{ borderRadius: desktop ? 12 : 8, objectFit: 'cover', boxShadow: desktop ? '0 18px 46px rgba(0,0,0,0.28)' : '0 8px 28px rgba(0,0,0,0.45)' }}
          />
        ) : (
          <div style={{
            width: posterW, height: posterH, borderRadius: desktop ? 12 : 8,
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)',
          }} />
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: desktop ? 8 : 4, maxWidth: desktop ? 720 : undefined }}>
        <h1
          ref={titleRef}
          style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: desktop ? 36 : 21, fontWeight: 700, lineHeight: desktop ? 1.12 : 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}
        >
          {movie.title}
        </h1>
        {movie.originalTitle && (
          <div style={{ marginTop: desktop ? 8 : 4, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: desktop ? 15 : 11, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
            {movie.originalTitle}
          </div>
        )}
        {movie.genre.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: desktop ? 8 : 5, marginTop: desktop ? 18 : 10 }}>
            {movie.genre.map((g) => (
              <span key={g} style={{
                height: desktop ? 28 : 22, padding: desktop ? '0 12px' : '0 9px',
                display: 'inline-flex', alignItems: 'center',
                borderRadius: 999, fontSize: desktop ? 13 : 11, fontWeight: 500,
                backgroundColor: 'var(--color-primary-subtle-l)',
                border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)',
                color: 'var(--color-primary-base)',
              }}>{g}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: desktop ? 18 : 10, fontSize: desktop ? 15 : 13, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
          {[movie.nation ? withFlagsRaw(movie.nation) : undefined, movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : null].filter(Boolean).join(' · ')}
        </div>
        {movie.rating != null && (
          <div style={{ marginTop: desktop ? 18 : 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: 'var(--color-warning)', fontSize: desktop ? 18 : 14 }}>★</span>
            <span style={{ fontSize: desktop ? 22 : 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFeatureSettings: '"tnum"' }}>{movie.rating.toFixed(1)}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>&nbsp;/ 10</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>관객 평점</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── TabBar ── */
function TabBar({ active, onChange, desktop = false }: { active: 'info' | 'theaters'; onChange: (t: 'info' | 'theaters') => void; desktop?: boolean }) {
  const tabs: Array<{ key: 'info' | 'theaters'; label: string }> = [
    { key: 'info', label: '영화 정보' },
    { key: 'theaters', label: '상영 영화관' },
  ]
  return (
    <div style={{
      position: 'sticky',
      top: 'calc(env(safe-area-inset-top) + 52px)',
      zIndex: 40,
      display: 'flex',
      maxWidth: desktop ? 1120 : undefined,
      margin: desktop ? '18px auto 0' : undefined,
      border: desktop ? '1px solid var(--color-border)' : undefined,
      borderRadius: desktop ? 14 : 0,
      overflow: desktop ? 'hidden' : undefined,
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-bg)',
    }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1, height: 44,
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14,
            fontWeight: active === t.key ? 600 : 400,
            color: active === t.key ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
            borderBottom: active === t.key ? '2px solid var(--color-primary-base)' : '2px solid transparent',
            transition: 'color 150ms, border-color 150ms',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ── InfoTab ── */
function InfoTab({ movie, onDirectorClick, desktop = false }: { movie: MovieDetail; onDirectorClick: (name: string) => void; desktop?: boolean }) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
    color: 'var(--color-text-caption)', marginBottom: 10,
  }
  const divider: React.CSSProperties = { borderTop: '1px solid var(--color-border)', margin: '0 20px' }

  return (
    <div style={{ paddingBottom: 52, maxWidth: desktop ? 860 : undefined, margin: desktop ? '0 auto' : undefined }}>
      {movie.synopsis && (
        <div style={{ padding: desktop ? '34px 0 28px' : '24px 20px' }}>
          <p style={sectionLabel}>시놉시스</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>
            {movie.synopsis}
          </p>
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
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-card)',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 10, minHeight: 'auto',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--color-text-caption)',
                }}>
                  <IcoUser />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500, textDecoration: 'underline' }}>감독 페이지 보기</div>
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
            <div key={row.key} style={{
              display: 'flex', alignItems: 'center', padding: '13px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <span style={{ width: 72, flexShrink: 0, fontSize: 13, color: 'var(--color-text-sub)', fontWeight: 500 }}>{row.key}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 날짜 포맷 헬퍼 ── */
function formatDateLabel(dateStr: string) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const [, m, d] = dateStr.split('-').map(Number)
  const dow = DOW[new Date(dateStr + 'T00:00:00').getDay()]
  return `${m}월 ${d}일(${dow})`
}

/* ── TheaterShowtimeChips ── */
function TheaterShowtimeChips({
  entry,
  movieId,
  userCoords,
  onGoTo,
}: {
  entry: MovieTheaterEntry
  movieId: string
  userCoords: { lat: number; lng: number } | null
  onGoTo: (date: string) => void
}) {
  const distance = calculateAndFormatDistance(
    userCoords?.lat,
    userCoords?.lng,
    entry.theaterLat,
    entry.theaterLng,
  )

  return (
    <div>
      {/* 극장 헤더 */}
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {entry.theaterName}
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 3, color: 'var(--color-text-sub)', fontSize: 12, lineHeight: 1.45 }}>
            <IcoPin />
            <span style={{ minWidth: 0, wordBreak: 'keep-all' }}>{entry.theaterAddress}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          {distance && (
            <span style={{
              minWidth: 58,
              height: 24,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-body)',
              fontSize: 12,
              fontWeight: 500,
              fontFeatureSettings: '"tnum"',
              whiteSpace: 'nowrap',
            }}>
              {distance}
            </span>
          )}
          <button
            onClick={() => {
              const date = entry.dateGroups[0]?.date ?? ''
              trackEvent('movie theater selected', {
                movie_id: movieId,
                theater_id: entry.theaterId,
                theater_name: entry.theaterName,
                show_date: date,
                source: 'movie_detail',
              })
              onGoTo(date)
            }}
            style={{
              flexShrink: 0,
              height: 28, padding: '0 11px',
              borderRadius: 999,
              border: '1px solid color-mix(in srgb, var(--color-primary-base) 35%, transparent)',
              backgroundColor: 'var(--color-primary-subtle-l)',
              color: 'var(--color-primary-base)',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer', minHeight: 'auto',
            }}
          >
            영화관 보기
          </button>
        </div>
      </div>

      {/* 날짜별 상영시간 */}
      {entry.dateGroups.map((group) => (
        <div key={group.date} style={{ borderTop: '1px solid var(--color-border)', padding: '10px 16px 12px' }}>
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.3px' }}>
            {formatDateLabel(group.date)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.showtimes.map((st) => {
              const soldout = st.seatAvailable === 0
              const low = !soldout && st.seatAvailable !== null && st.seatAvailable <= 20
              const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
              return (
                <button
                  key={st.id}
                  disabled={soldout}
                  onClick={soldout ? undefined : () => {
                    trackEvent('movie theater selected', {
                      movie_id: movieId,
                      theater_id: entry.theaterId,
                      theater_name: entry.theaterName,
                      showtime_id: st.id,
                      show_date: group.date,
                      show_time: st.showTime,
                      source: 'movie_detail_showtime',
                    })
                    onGoTo(group.date)
                  }}
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    cursor: soldout ? 'default' : 'pointer',
                    opacity: soldout ? 0.5 : 1,
                    textAlign: 'left', minHeight: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                      {st.showTime.slice(0, 5)}
                    </span>
                    {st.endTime && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>
                        -{st.endTime.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  {(st.seatTotal > 0) && (
                    <div style={{ marginTop: 4, fontSize: 12, fontFeatureSettings: '"tnum"' }}>
                      <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
                      <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
                      {low && !soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-warning)', fontWeight: 600 }}>잔여↓</span>}
                      {soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
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
}

/* ── TheatersTab ── */
function TheatersTab({ movieId, onMapClick, onGoToTheater, desktop = false, initialShowtimes }: { movieId: string; onMapClick: () => void; onGoToTheater: (theaterId: string, date: string) => void; desktop?: boolean; initialShowtimes?: MovieTheaterEntry[] }) {
  const { data: theaters = [], isLoading } = useMovieTheaterShowtimes(movieId, initialShowtimes)
  const { coords } = useUserLocation()
  const distanceCoords = coords ?? locationAdapter.getDefaultLocation()
  const regionId = coords ? getRegionFromCoords(coords.lat, coords.lng) : null

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
    if (!regionId) return { inRegion: sortedTheaters, otherRegion: [] }
    const inRegion = sortedTheaters.filter(e => getRegionFromAddress(e.theaterAddress) === regionId)
    const otherRegion = sortedTheaters.filter(e => getRegionFromAddress(e.theaterAddress) !== regionId)
    return { inRegion, otherRegion }
  }, [regionId, sortedTheaters])

  const theaterCard = (entry: typeof theaters[number]) => (
    <div key={entry.theaterId} style={{
      borderRadius: 12, border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)', overflow: 'hidden',
    }}>
      <TheaterShowtimeChips
        entry={entry}
        movieId={movieId}
        userCoords={distanceCoords}
        onGoTo={(date) => onGoToTheater(entry.theaterId, date)}
      />
    </div>
  )

  const primaryColor = 'var(--color-primary-base)'

  // 지도에서 보기 버튼 아래 상영 카운트 텍스트
  const countLine = !isLoading && (
    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
      {regionId && (
        <>
          <b style={{ color: primaryColor }}>{regionId}</b>
          {' 지역 '}
          <b style={{ color: primaryColor }}>{inRegion.length}</b>
          {'개 영화관 상영중, '}
        </>
      )}
      {'전국 '}
      <b style={{ color: primaryColor }}>{theaters.length}</b>
      {'개 영화관 상영중'}
    </p>
  )

  const sectionDivider = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  )

  const grid = (entries: typeof theaters) => (
    <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 12 }}>
      {entries.map(theaterCard)}
    </div>
  )

  return (
    <div style={{ padding: desktop ? '26px 0 64px' : '20px 20px 52px', maxWidth: desktop ? 1040 : undefined, margin: desktop ? '0 auto' : undefined }}>
      {/* 지도에서 보기 버튼 */}
      <button
        onClick={() => {
          trackEvent('movie theaters map opened', {
            movie_id: movieId,
            theater_count: theaters.length,
            source: 'movie_detail',
          })
          classifySessionIntent('type_a', { source: 'movie_detail', movie_id: movieId })
          onMapClick()
        }}
        style={{
          width: '100%', height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 10, border: '1px solid var(--color-primary-base)',
          backgroundColor: 'var(--color-primary-subtle-l)',
          color: 'var(--color-primary-base)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', marginBottom: 0,
        }}
      >
        <IcoMap />
        상영중인 영화관 지도에서 보기
      </button>
      {countLine}

      {/* 목록 */}
      {isLoading ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', fontSize: 13 }}>
          불러오는 중…
        </div>
      ) : theaters.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'var(--color-text-caption)' }}>
          상영 중인 영화관이 없습니다
        </div>
      ) : regionId ? (
        <>
          {/* 선택 지역 섹션 */}
          {inRegion.length > 0
            ? grid(inRegion)
            : (
              <div style={{ textAlign: 'center', padding: '28px 0 4px', fontSize: 13, color: 'var(--color-text-caption)' }}>
                {regionId} 지역 상영 정보가 없습니다
              </div>
            )
          }

          {/* 구분선 + 그 외 지역 */}
          {otherRegion.length > 0 && (
            <>
              {sectionDivider(`${regionId} 외 지역`)}
              {grid(otherRegion)}
            </>
          )}
        </>
      ) : (
        grid(sortedTheaters)
      )}
    </div>
  )
}

/* ── SEO 전용 상영시간표 (JS 없이도 검색엔진·사용자에게 노출) ──
 * 탭 UI(TheatersTab)는 tab==='info'일 때 DOM에서 완전히 빠져 SSR HTML에 시간표가 없다.
 * 이 섹션은 tab 상태와 무관하게 항상 서버 렌더되고, 하이드레이션 이후에만
 * 인터랙티브 탭과 중복되지 않도록 스스로 숨는다 — JS 비활성 환경에선 계속 보인다. */
function SeoShowtimesSection({ movie, entries }: { movie: MovieDetail; entries: MovieTheaterEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.display = 'none'
  }, [])

  if (entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => a.theaterName.localeCompare(b.theaterName, 'ko'))

  return (
    <div ref={ref}>
      <section aria-label={`${movie.title} 상영 시간표`} style={{ padding: '20px 20px 0' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {movie.title} 상영 시간표
        </h2>
        {sorted.map((entry) => (
          <div key={entry.theaterId} style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {entry.theaterName} — {entry.theaterAddress}
            </h3>
            <ul>
              {entry.dateGroups.map((group) => (
                <li key={group.date}>
                  {formatDateLabel(group.date)}: {group.showtimes.map((st) => st.showTime.slice(0, 5)).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

/* ── 메인 ── */
export function MovieDetailClient({ movieId, theaterId, initialData, initialShowtimes }: { movieId: string; theaterId?: string; initialData?: MovieDetail; initialShowtimes?: MovieTheaterEntry[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDesktop = useIsDesktopDetail()
  const [tab, setTab] = useState<'info' | 'theaters'>(() =>
    searchParams.get('tab') === 'theaters' ? 'theaters' : 'info'
  )
  // const [starred, setStarred] = useState(false) // 즐겨찾기 — 계정 기능 구현 전 비활성화
  const [titleInNav, setTitleInNav] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const { data: movie, isLoading } = useMovieDetail(movieId, initialData)
  const { data: activeIds = [] } = useActiveMovieIds()
  void activeIds

  useEffect(() => {
    if (!movie) return
    trackEvent('movie detail viewed', {
      movie_id: movie.id,
      movie_title: movie.title,
      source: theaterId ? 'theater_sheet' : 'direct',
      theater_id: theaterId,
      initial_tab: tab,
    })
    classifySessionIntent('type_a', {
      source: theaterId ? 'theater_sheet' : 'direct',
      movie_id: movie.id,
    })
    recordRecentlyViewed(cookieStorageAdapter, 'movie', {
      id: movie.id,
      title: movie.title,
      thumbnailKey: movie.posterUrl,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id])

  // 제목이 sticky NavBar 아래로 스크롤되면 NavBar에 영화 제목 표시
  useEffect(() => {
    if (!movie) return
    const el = titleRef.current
    if (!el) return
    const onScroll = () => {
      setTitleInNav(el.getBoundingClientRect().bottom < 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [movie])

  const fromCuration = searchParams.get('from') === 'curation'
  const handleBack = () => fromCuration ? router.push('/') : router.back()
  const handleClose = () => theaterId ? router.push(`/?theater=${theaterId}`) : router.push('/')
  const handleDirectorClick = (name: string) => router.push(`/director/${encodeURIComponent(name)}`)
  const handleMapClick = () => router.push(`/?movie=${movieId}`)

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>불러오는 중…</span>
      </div>
    )
  }

  if (!movie) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)' }}>
          <NavBar title="영화 정보" titleVisible onBack={handleBack} onClose={handleClose} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-caption)' }}>영화를 찾을 수 없습니다</span>
          <button onClick={handleBack} style={{ fontSize: 13, color: 'var(--color-primary-base)', border: 'none', background: 'none', cursor: 'pointer' }}>돌아가기</button>
        </div>
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
      {/* Sticky 상단 바: safe-area + NavBar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: 'var(--color-surface-bg)',
        marginLeft: isDesktop ? -28 : 0,
        marginRight: isDesktop ? -28 : 0,
      }}>
        <NavBar
          title={movie.title}
          titleVisible={titleInNav}
          onBack={handleBack}
          onClose={handleClose}
        />
      </div>

      <HeroSection movie={movie} titleRef={titleRef} desktop={isDesktop} />

      <TabBar
        active={tab}
        onChange={(nextTab) => {
          trackEvent('movie detail tab changed', {
            movie_id: movie.id,
            movie_title: movie.title,
            from_tab: tab,
            to_tab: nextTab,
          })
          setTab(nextTab)
        }}
        desktop={isDesktop}
      />

      {tab === 'info'
        ? <InfoTab movie={movie} onDirectorClick={handleDirectorClick} desktop={isDesktop} />
        : <TheatersTab
            movieId={movieId}
            onMapClick={handleMapClick}
            onGoToTheater={(tid, date) => router.push(`/?theater=${tid}&movie=${movieId}&date=${date}&fromMovie=${movieId}`)}
            desktop={isDesktop}
            initialShowtimes={initialShowtimes}
          />
      }

      {initialShowtimes && <SeoShowtimesSection movie={movie} entries={initialShowtimes} />}

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
