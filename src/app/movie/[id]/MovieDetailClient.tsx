'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMovieDetail, useMovieTheaterShowtimes, useActiveMovieIds } from '@/lib/supabase/queries'
import { TheaterCardSkeleton, Divider, EmptyState } from '@/components/primitives'
import type { MovieDetail, MovieTheaterEntry } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { recordRecentlyViewed } from '@/lib/curation/recentlyViewed'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { useUserLocation } from '@/hooks/useUserLocation'
import { locationAdapter } from '@/lib/adapters/location'
import { calculateAndFormatDistance, calculateDistanceKm } from '@/lib/map/distanceUtils'
import { getRegionFromAddress, getRegionFromCoords } from '@/lib/regions'
import { formatDateLabel } from '@/lib/date'
import { Toast, IconButton, Button, Icon } from '@/components/primitives'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { ExpandableSynopsis } from '@/components/domain/movieDetail/ExpandableSynopsis'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { MovieInfoTable } from '@/components/domain/movieDetail/MovieInfoTable'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'

function useIsDesktopDetail() {
  return useMediaQuery('(min-width: 1024px)')   /* 레일(1024)과 기준 통일 */
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */

/* ── NavBar ── */
function NavBar({
  title,
  titleVisible,
  onBack,
  onClose,
  trailing,
}: {
  title: string
  titleVisible: boolean
  onBack: () => void
  onClose: () => void
  /** 닫기 왼쪽 위젯 (하트) */
  trailing?: React.ReactNode
}) {
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
      <IconButton variant="ghost" size={44} aria-label="뒤로가기" onClick={onBack}><Icon name="chevron-left" size={22} /></IconButton>
      <span style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 'var(--text-subtitle)',
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
      {trailing}
      <IconButton variant="ghost" size={44} aria-label="닫기" onClick={onClose}><Icon name="x" size={20} /></IconButton>
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
      background: desktop ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
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
            sizes={`(min-width: 1280px) ${posterW}px, ${posterW}px`}
            style={{ borderRadius: 0, objectFit: 'cover', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)' }}
          />
        ) : (
          <div style={{
            width: posterW, height: posterH, borderRadius: 0,
            border: '1px solid var(--color-border)',
            background: 'var(--color-neutral-800)',
          }} />
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: desktop ? 8 : 4, maxWidth: desktop ? 720 : undefined }}>
        <h1
          ref={titleRef}
          className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}
        >
          {movie.title}
        </h1>
        {movie.originalTitle && (
          <div style={{ marginTop: desktop ? 8 : 4, fontSize: desktop ? 15 : 11, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
            {movie.originalTitle}
          </div>
        )}
        {movie.genre.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: desktop ? 8 : 5, marginTop: desktop ? 18 : 10 }}>
            {movie.genre.map((g) => (
              <span key={g} style={{
                height: desktop ? 28 : 22, padding: desktop ? '0 12px' : '0 9px',
                display: 'inline-flex', alignItems: 'center',
                borderRadius: 9999, fontSize: desktop ? 13 : 11, fontWeight: 500,
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
            <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>관객 평점</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── InfoTab ── */
function InfoTab({ movie, onDirectorClick, desktop = false }: { movie: MovieDetail; onDirectorClick: (name: string) => void; desktop?: boolean }) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 'var(--text-badge)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
    color: 'var(--color-text-caption)', marginBottom: 12,
  }
  const divider: React.CSSProperties = { borderTop: '1px solid var(--color-border)', margin: '0 var(--gutter)' }

  return (
    <div style={{ paddingBottom: 52, maxWidth: desktop ? 860 : undefined, margin: desktop ? '0 auto' : undefined }}>
      {movie.synopsis && (
        <div style={{ padding: desktop ? '34px 0 28px' : '24px var(--gutter)' }}>
          <p style={sectionLabel}>시놉시스</p>
          <ExpandableSynopsis text={movie.synopsis} />
        </div>
      )}

      {movie.director.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ padding: '20px var(--gutter)' }}>
            <p style={sectionLabel}>감독</p>
            {movie.director.map((name) => (
              <button
                key={name}
                onClick={() => onDirectorClick(name)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px', borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-card)',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 12, minHeight: 'auto',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--color-text-caption)',
                }}>
                  <Icon name="user" size={26} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
                  <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-primary-base)', fontWeight: 500, textDecoration: 'underline' }}>감독 페이지 보기</div>
                </div>
                <Icon name="chevron-right" size={16} />
              </button>
            ))}
          </div>
        </>
      )}

      <div style={divider} />
      <div style={{ padding: '20px var(--gutter)' }}>
        <p style={sectionLabel}>상세 정보</p>
        <MovieInfoTable movie={movie} />
      </div>
    </div>
  )
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
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* 극장 이름 칸은 최소 폭을 보장한다 — 브라우저 자동번역으로 오른쪽 버튼 문구가 길어지면
            이 칸이 한 글자 폭까지 눌려 이름이 세로로 한 자씩 쌓였다 (2026-09-02, 말레이어 번역 세션) */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {entry.theaterName}
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 4, color: 'var(--color-text-sub)', fontSize: 12, lineHeight: 1.45 }}>
            <Icon name="map-pin" size={12} />
            <span style={{ minWidth: 0, wordBreak: 'keep-all' }}>{entry.theaterAddress}</span>
          </div>
        </div>
        <div style={{ flexShrink: 1, minWidth: 0, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          {distance && (
            <span style={{
              minWidth: 58,
              height: 24,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderRadius: 9999,
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
          <Button
            variant="secondary"
            size="sm"
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
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            영화관 보기
          </Button>
        </div>
      </div>

      {/* 날짜별 상영시간 */}
      {entry.dateGroups.map((group) => (
        <div key={group.date} style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px' }}>
          <div style={{ marginBottom: 8, fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.3px' }}>
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
                    trackEvent('showtime selected', {
                      movie_id: movieId,
                      theater_id: entry.theaterId,
                      theater_name: entry.theaterName,
                      showtime_id: st.id,
                      show_date: group.date,
                      show_time: st.showTime,
                      seat_available: st.seatAvailable,
                      seat_total: st.seatTotal,
                      source: 'movie_detail_showtime',
                    })
                    onGoTo(group.date)
                  }}
                  style={{
                    padding: '12px 16px', borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    cursor: soldout ? 'default' : 'pointer',
                    opacity: soldout ? 0.5 : 1,
                    textAlign: 'left', minHeight: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
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
    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '40px 0 16px' }}>
      <Divider flex />
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <Divider flex />
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
      <MapCtaButton
        onClick={() => {
          trackEvent('movie theaters map opened', {
            movie_id: movieId,
            theater_count: theaters.length,
            source: 'movie_detail',
          })
          classifySessionIntent('type_a', { source: 'movie_detail', movie_id: movieId })
          onMapClick()
        }}
      >
        상영중인 영화관 지도에서 보기
      </MapCtaButton>
      {countLine}

      {/* 목록 */}
      {isLoading ? (
        /* 목록이 들어올 자리를 카드 문법 그대로 잡아 둔다 — 글자 한 줄만 두면 도착 순간 화면이 튄다 */
        <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 12 }}>
          {Array.from({ length: desktop ? 4 : 3 }).map((_, i) => (
            <TheaterCardSkeleton key={i} />
          ))}
        </div>
      ) : theaters.length === 0 ? (
        <EmptyState message="상영 중인 극장이 없어요" paddingY={40} style={{ paddingBottom: 0 }} />
      ) : regionId ? (
        <>
          {/* 선택 지역 섹션 */}
          {inRegion.length > 0
            ? grid(inRegion)
            : (
              <EmptyState message={`${regionId} 지역 상영 정보가 없어요`} paddingY={28} />
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
      <section aria-label={`${movie.title} 상영 시간표`} style={{ padding: '20px var(--gutter) 0' }}>
        <h2 style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
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
  /* 2026-08-24: 가로 탭(영화 정보/상영 영화관) 폐지 — /films/movie와 같은 단일 스크롤.
     구 공유 링크(?tab=theaters)는 상영 영화관 섹션으로 스크롤해 준다. */
  const wantTheaters = searchParams.get('tab') === 'theaters'
  // const [starred, setStarred] = useState(false) // 즐겨찾기 — 계정 기능 구현 전 비활성화
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

  // ?tab=theaters 구 링크 — 마운트 후 상영 영화관 섹션으로 스크롤
  useEffect(() => {
    if (!movie || !wantTheaters) return
    setTimeout(() => {
      document.getElementById('theaters-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id])

  const fromCuration = searchParams.get('from') === 'curation'
  const handleBack = () => fromCuration ? router.push('/map') : router.back()
  const handleClose = () => theaterId ? router.push(`/map?theater=${theaterId}`) : router.push('/map')
  const handleDirectorClick = (name: string) => router.push(`/director/${encodeURIComponent(name)}`)
  const handleMapClick = () => router.push(`/map?movie=${movieId}`)

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        <Toast message="불러오는 중…" visible />
      </div>
    )
  }

  if (!movie) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)' }}>
          <NavBar title="영화 정보" titleVisible onBack={handleBack} onClose={handleClose} />
        </div>
        <EmptyState
          message="영화를 찾을 수 없어요"
          action={<button onClick={handleBack} style={{ fontSize: 13, color: 'var(--color-primary-base)', border: 'none', background: 'none', cursor: 'pointer' }}>돌아가기</button>}
          style={{ flex: 1, gap: 12 }}
        />
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
      {/* 상단 바 — /films/movie와 같은 breadcrumb (2026-08-24, 두 상세 통일) */}
      <div style={{ marginLeft: isDesktop ? -28 : 0, marginRight: isDesktop ? -28 : 0 }}>
        <DetailTopBar crumbLabel="영화" crumbHref="/films" title={movie.title} isDesktop={isDesktop} onBack={handleBack} />
      </div>

      <HeroSection movie={movie} titleRef={titleRef} desktop={isDesktop} />
      {/* 액션 행 — [♡ 관심 영화 등록][공유], /films/movie와 동일 (2026-08-24 통일) */}
      <FavoriteActionRow
        type="movie"
        id={movie.id}
        label={movie.title}
        style={{ paddingLeft: isDesktop ? 0 : 16, paddingRight: isDesktop ? 0 : 16, marginBottom: 20, maxWidth: isDesktop ? 480 : undefined }}
        trailing={
          <Button
            variant="tertiary" size="md" aria-label="공유"
            onClick={() => {
              void shareAndTrack({
                payload: { title: movie.title, url: window.location.href },
                source: 'movie_detail',
                scope: 'page',
                properties: { movie_id: movie.id, movie_title: movie.title },
              })
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Icon name="share-2" size={16} />
            공유
          </Button>
        }
      />

      {/* 섹션 디바이더 — 8px raised 밴드 (피그마 상세 통일 시안, 2026-08-24) */}
      {!isDesktop && <div aria-hidden style={{ height: 8, backgroundColor: 'var(--color-surface-raised)' }} />}
      <InfoTab movie={movie} onDirectorClick={handleDirectorClick} desktop={isDesktop} />

      {/* 상영 영화관 — 탭 대신 스크롤 섹션 (2026-08-24) */}
      <div id="theaters-section" style={{ borderTop: '8px solid var(--color-surface-raised)' }}>
        <p style={{
          margin: 0, padding: isDesktop ? '28px 0 0' : '24px var(--gutter) 0',
          maxWidth: isDesktop ? 860 : undefined, marginLeft: isDesktop ? 'auto' : undefined, marginRight: isDesktop ? 'auto' : undefined,
          fontSize: 'var(--text-badge)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
          color: 'var(--color-text-caption)',
        }}>상영 영화관</p>
        <TheatersTab
          movieId={movieId}
          onMapClick={handleMapClick}
          onGoToTheater={(tid, date) => router.push(`/map?theater=${tid}&movie=${movieId}&date=${date}&fromMovie=${movieId}`)}
          desktop={isDesktop}
          initialShowtimes={initialShowtimes}
        />
      </div>

      {initialShowtimes && <SeoShowtimesSection movie={movie} entries={initialShowtimes} />}

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
