'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Chip, Avatar, IconButton, Button } from '@/components/primitives'
import { DetailDateTabs } from '@/components/domain/DetailDateTabs'
import { addDaysIso, toKstIsoDate } from '@/lib/date'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { ExpandableSynopsis } from '@/components/domain/movieDetail/ExpandableSynopsis'
import { ShowtimeCell } from '@/components/domain/ShowtimeCell'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import Image from 'next/image'
import { useMovieTheaterShowtimes, useDirectorProfile } from '@/lib/supabase/queries'
import type { MovieDetail } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'
import type { Showtime } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { getStoredRegion, subscribeStoredRegion } from '@/lib/regionStorage'
import { getRegionFromAddress } from '@/lib/regions'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { recordRecentlyViewed } from '@/lib/curation/recentlyViewed'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { BookingCtaButton, ShareScheduleButton, CloseRoundButton } from '@/components/domain/booking/BookingActions'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)')   // DetailShell(1024)과 기준 통일
    const fn = () => setV(m.matches); fn()
    m.addEventListener('change', fn); return () => m.removeEventListener('change', fn)
  }, [])
  return v
}

/* ── 날짜 유틸 ─────────────────────────────────────────────────── */
function getDateRange(days = 7): string[] {
  // KST 고정: 서버는 UTC로 돌아 로컬 날짜를 쓰면 자정~오전 9시(KST) 사이 SSR HTML과
  // 클라이언트 날짜가 하루 어긋나 hydration mismatch가 난다
  const todayKst = toKstIsoDate(new Date())
  return Array.from({ length: days }, (_, i) => addDaysIso(todayKst, i))
}
function formatDateTab(dateStr: string) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00'); const dow = d.getDay()
  return { day: DOW[dow], date: d.getDate(), isHoliday: dow === 0 }
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
const IcoChevronRight = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
const IcoPin = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
const IcoUser = () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

/* ── ShowtimeChip ──────────────────────────────────────────────── */
function ShowtimeChip({ st, selected, onClick }: { st: Showtime; selected?: boolean; onClick?: () => void }) {
  const soldout = st.seatAvailable === 0
  const low = !soldout && st.seatTotal > 0 && st.seatAvailable <= 20
  const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
  return (
    <div
      onClick={!soldout && onClick ? onClick : undefined}
      style={{
        padding: '12px 16px', borderRadius: 12, minWidth: 100,
        border: selected ? '2px solid var(--color-primary-base)' : '1px solid var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        opacity: soldout ? 0.5 : 1,
        cursor: !soldout && onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>{st.showTime.slice(0, 5)}</span>
        {st.endTime && <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>-{st.endTime.slice(0, 5)}</span>}
      </div>
      {st.seatTotal > 0 && (
        <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', fontFeatureSettings: '"tnum"' }}>
          <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
          <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
          {soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
        </div>
      )}
    </div>
  )
}

/* ── DirectorChip (inline in hero) ────────────────────────────── */
function DirectorChip({ name, photoUrl, onClick }: { name: string; photoUrl?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px', borderRadius: 9999, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', cursor: 'pointer', minHeight: 'auto' }}>
      <Avatar name={name} photoUrl={photoUrl} size={28} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</span>
      <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 →</span>
    </button>
  )
}

function DirectorChipLoader({ name, onClick }: { name: string; onClick: () => void }) {
  const { data: profile } = useDirectorProfile(name)
  return <DirectorChip name={name} photoUrl={profile?.photoUrl} onClick={onClick} />
}

/* ── 메인 ────────────────────────────────────────────────────────── */
export function FilmsMovieDetailClient({ movie }: { movie: MovieDetail }) {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const dates = useMemo(() => getDateRange(7), [])
  const [selectedDate, setSelectedDate] = useState(dates[0])
  // localStorage 초기화 금지 — hydration mismatch 방지 (effect에서 로드)
  const [regionId, setRegionId] = useState<string | null>(null)
  useEffect(() => { setRegionId(getStoredRegion()) }, [])
  // 다른 화면(지도 탭 등)의 지역 변경 동기
  useEffect(() => subscribeStoredRegion(setRegionId), [])
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null)
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | null>(null)
  const [bookableOnly, setBookableOnly] = useState(false)
  // 공유 링크(?date=&theater=&showtime=)로 들어왔을 때, 날짜 변경 시 선택 초기화하는
  // 아래 effect가 복원 직후 곧바로 리셋해버리지 않도록 1회 억제한다.
  const suppressResetOnDateChangeRef = useRef(false)

  const { data: theaterEntries = [], isLoading } = useMovieTheaterShowtimes(movie.id)

  /* ── analytics: films 플로우 진입 시에도 지도 플로우(MovieDetailClient)와 동일하게 기록 ── */
  useEffect(() => {
    trackEvent('movie detail viewed', {
      movie_id: movie.id,
      movie_title: movie.title,
      source: 'films_movie_detail',
    })
    classifySessionIntent('type_a', {
      source: 'films_movie_detail',
      movie_id: movie.id,
    })
    recordRecentlyViewed(cookieStorageAdapter, 'movie', {
      id: movie.id,
      title: movie.title,
      thumbnailKey: movie.posterUrl,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id])

  // 공유 링크로 진입 시 선택된 회차 복원
  const restoredShareRef = useRef(false)
  useEffect(() => {
    if (restoredShareRef.current) return
    // useSearchParams는 정적(ISR) 렌더에서 suspend해 CSR 바운더리를 만든다 — window에서 직접 읽는다
    const searchParams = new URLSearchParams(window.location.search)
    const dateParam = searchParams.get('date')
    const theaterParam = searchParams.get('theater')
    const showtimeParam = searchParams.get('showtime')
    if (!dateParam || !theaterParam || !showtimeParam) return
    if (theaterEntries.length === 0) return

    const entry = theaterEntries.find((e) => e.theaterId === theaterParam)
    const group = entry?.dateGroups.find((g) => g.date === dateParam)
    const st = group?.showtimes.find((s) => s.id === showtimeParam)
    if (!entry || !st) return

    restoredShareRef.current = true
    suppressResetOnDateChangeRef.current = true
    setSelectedDate(dateParam)
    setSelectedTheaterId(theaterParam)
    setSelectedShowtimeId(showtimeParam)

    const url = new URL(window.location.href)
    url.searchParams.delete('date')
    url.searchParams.delete('theater')
    url.searchParams.delete('showtime')
    window.history.replaceState({}, '', url.toString())
  }, [theaterEntries])

  // 날짜별 showtimes 유무
  const activeDates = useMemo(() => {
    const set = new Set<string>()
    for (const entry of theaterEntries) {
      for (const g of entry.dateGroups) set.add(g.date)
    }
    return set
  }, [theaterEntries])

  // 오늘 상영 없으면 가장 빠른 날로 자동 이동 (데이터 로드 후 1회)
  useEffect(() => {
    if (activeDates.size === 0) return
    if (selectedDate !== dates[0]) return  // 이미 다른 날 선택됨
    if (activeDates.has(selectedDate)) return  // 오늘 상영 있음
    const earliest = [...activeDates].sort()[0]
    if (earliest) setSelectedDate(earliest)
  // activeDates 로드 시점에만 체크
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDates])

  // 날짜 변경 시 선택 회차 초기화 (공유 링크 복원 직후 1회는 건너뜀)
  useEffect(() => {
    if (suppressResetOnDateChangeRef.current) {
      suppressResetOnDateChangeRef.current = false
      return
    }
    setSelectedShowtimeId(null)
    setSelectedTheaterId(null)
  }, [selectedDate])

  // 선택 날짜에 상영하는 극장+시간표만
  const dayTheaters = useMemo(() => {
    return theaterEntries
      .map((entry) => ({
        ...entry,
        showtimes: (entry.dateGroups.find((g) => g.date === selectedDate)?.showtimes ?? [])
          .filter((st) => !bookableOnly || st.seatAvailable > 0),
      }))
      .filter((entry) => entry.showtimes.length > 0)
      /* 오늘 회차가 전부 끝난 극장은 뒤로 — 지금 갈 수 있는 극장이 먼저.
         종료 판정은 ShowtimeCell kind('ended')와 같은 기준. 나머지 순서는 유지(stable sort). */
      .sort((a, b) => {
        if (selectedDate !== dates[0]) return 0
        const now = new Date()
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        const ended = (sts: typeof a.showtimes) => sts.every((st) => {
          const [sh, sm] = st.showTime.split(':').map(Number)
          const endMin = st.endTime
            ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })()
            : sh * 60 + sm + 120
          return endMin <= nowMinutes
        })
        return (ended(a.showtimes) ? 1 : 0) - (ended(b.showtimes) ? 1 : 0)
      })
  }, [theaterEntries, selectedDate, bookableOnly, dates])

  const totalTheaterCount = theaterEntries.length
  const { inRegion: inRegionEntries, otherRegion: otherRegionEntries } = useMemo(() => {
    if (!regionId) return { inRegion: [] as typeof dayTheaters, otherRegion: [] as typeof dayTheaters }
    return {
      inRegion: dayTheaters.filter((e) => getRegionFromAddress(e.theaterAddress) === regionId),
      otherRegion: dayTheaters.filter((e) => getRegionFromAddress(e.theaterAddress) !== regionId),
    }
  }, [dayTheaters, regionId])

  const selectedShowtimeData = useMemo(() => {
    if (!selectedShowtimeId || !selectedTheaterId) return null
    const entry = dayTheaters.find((e) => e.theaterId === selectedTheaterId)
    if (!entry) return null
    const st = entry.showtimes.find((s) => s.id === selectedShowtimeId)
    if (!st) return null
    return { st, theaterName: entry.theaterName, theaterAddress: entry.theaterAddress }
  }, [selectedShowtimeId, selectedTheaterId, dayTheaters])

  const shareSelectedShowtime = () => {
    if (!selectedShowtimeData || !selectedTheaterId) return
    const url = new URL(window.location.href)
    url.searchParams.set('date', selectedDate)
    url.searchParams.set('theater', selectedTheaterId)
    url.searchParams.set('showtime', selectedShowtimeData.st.id)
    void shareAndTrack({
      payload: {
        title: `${movie.title} - ${selectedShowtimeData.theaterName} ${selectedShowtimeData.st.showTime.slice(0, 5)}`,
        url: url.toString(),
      },
      source: 'films_movie_detail',
      scope: 'showtime',
      properties: {
        movie_id: movie.id,
        movie_title: movie.title,
        theater_id: selectedTheaterId,
        theater_name: selectedShowtimeData.theaterName,
        showtime_id: selectedShowtimeData.st.id,
      },
    })
  }

  // 회차가 선택돼있으면 그 회차까지 실어서 지도로 — 선택 안 돼있으면 영화 필터만
  function mapUrlWithSelection() {
    // '/map' — 지도 파라미터는 '/map'에서만 마운트되는 MapView가 읽는다 (#262 이후)
    const url = new URL('/map', window.location.origin)
    url.searchParams.set('movie', movie.id)
    if (selectedShowtimeData && selectedTheaterId) {
      url.searchParams.set('theater', selectedTheaterId)
      url.searchParams.set('date', selectedDate)
      url.searchParams.set('showtime', selectedShowtimeData.st.id)
    }
    return url.pathname + url.search
  }

  const meta = [
    movie.nation ? withFlagsRaw(movie.nation) : undefined,
    movie.year,
    movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined,
  ].filter(Boolean).join(' · ')

  /* ── 공통 섹션들 ──────────────────────────────────────────────── */
  const handleShare = () => {
    void shareAndTrack({
      payload: { title: movie.title, url: window.location.href },
      source: 'films_movie_detail',
      scope: 'page',
      properties: { movie_id: movie.id, movie_title: movie.title },
    })
  }

  /* 액션 행 — 피그마 G 확정: [♡ 관심 등록 (늘어남)] [공유] 히어로 아래 */
  const actionRow = (
    <FavoriteActionRow
      type="movie"
      id={movie.id}
      style={{ paddingLeft: isDesktop ? 0 : 16, paddingRight: isDesktop ? 0 : 16, marginBottom: isDesktop ? 24 : 20, maxWidth: isDesktop ? 480 : undefined }}
      trailing={
        <Button variant="tertiary" size="md" onClick={handleShare} aria-label="공유" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IcoShare />
          공유
        </Button>
      }
    />
  )

  const heroSection = (
    <div style={{
      background: 'var(--color-surface-bg)',
      padding: isDesktop ? '32px 0 28px' : '24px 16px 20px',
      display: 'flex', gap: isDesktop ? 32 : 16, alignItems: 'flex-start',
    }}>
      {/* 포스터 */}
      <div style={{ flexShrink: 0, position: 'relative', width: isDesktop ? 200 : 100, height: isDesktop ? 300 : 150 }}>
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={`${movie.title} 포스터`} fill priority sizes={isDesktop ? '200px' : '100px'} style={{ borderRadius: 0, objectFit: 'cover', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', borderRadius: 0, background: 'var(--color-neutral-800)' }} />
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          {movie.title}
        </h1>
        {movie.originalTitle && (
          <div style={{ marginTop: 4, fontSize: isDesktop ? 14 : 12, color: 'var(--color-text-caption)' }}>
            {movie.originalTitle}
          </div>
        )}
        {movie.genre.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {movie.genre.map((g) => (
              <span key={g} style={{ height: 24, padding: '0 12px', display: 'inline-flex', alignItems: 'center', borderRadius: 9999, fontSize: 12, fontWeight: 500, backgroundColor: 'var(--color-primary-subtle-l)', border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)', color: 'var(--color-primary-base)' }}>
                {g}
              </span>
            ))}
          </div>
        )}
        {meta && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-sub)' }}>{meta}</div>
        )}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {movie.director.map((name) => (
              <DirectorChipLoader key={name} name={name} onClick={() => router.push(`/films/director/${encodeURIComponent(name)}`)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const synopsisSection = movie.synopsis ? (
    <div style={{ padding: isDesktop ? '0 0 20px' : '0 16px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>시놉시스</p>
      <ExpandableSynopsis text={movie.synopsis} />
    </div>
  ) : null

  function renderTheaterCard(entry: (typeof dayTheaters)[number]) {
    return (
      <div key={entry.theaterId} style={{ borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', overflow: 'hidden' }}>
        <button
          onClick={() => router.push(`/films/theater/${entry.theaterId}`)}
          style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 16px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', borderBottom: '1px solid var(--color-border)' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3 }}>{entry.theaterName}</span>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 4, color: 'var(--color-text-sub)', fontSize: 12 }}>
              <IcoPin /><span style={{ wordBreak: 'keep-all', lineHeight: 1.45 }}>{entry.theaterAddress}</span>
            </div>
          </div>
          <IcoChevronRight />
        </button>
        <div style={{ padding: '12px 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, backgroundColor: 'var(--color-neutral-100)' }}>
          {entry.showtimes.map((st) => {
            /* TheaterSheet과 동일한 kind 분류 */
            const [sh, sm] = st.showTime.split(':').map(Number)
            const startMin = sh * 60 + sm
            const endMin = st.endTime ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })() : startMin + 120
            const now = new Date()
            const nowMinutes = now.getHours() * 60 + now.getMinutes()
            const isToday = selectedDate === dates[0]
            const kind: import('@/components/domain/ShowtimeCell').ShowtimeKind = (() => {
              if (isToday && endMin <= nowMinutes) return 'ended'
              if (isToday && startMin < nowMinutes && endMin > nowMinutes) return 'nowplaying'
              if (st.seatAvailable === 0) return 'soldout'
              if (st.seatTotal > 0 && st.seatAvailable <= st.seatTotal * 0.1) return 'low'
              if (sh >= 21) return 'late'
              return 'normal'
            })()
            return (
              <ShowtimeCell
                key={st.id}
                startTime={st.showTime.slice(0, 5)}
                endTime={st.endTime ? st.endTime.slice(0, 5) : ''}
                seatAvailable={st.seatAvailable}
                seatTotal={st.seatTotal}
                kind={kind}
                selected={selectedShowtimeId === st.id}
                onClick={() => {
                  trackEvent('showtime selected', {
                    theater_id: entry.theaterId,
                    theater_name: entry.theaterName,
                    movie_id: movie.id,
                    movie_title: movie.title,
                    showtime_id: st.id,
                    show_date: st.showDate,
                    show_time: st.showTime,
                    seat_available: st.seatAvailable,
                    seat_total: st.seatTotal,
                    has_booking_url: Boolean(st.bookingUrl),
                    source: 'films_movie_detail',
                  })
                  setSelectedShowtimeId(st.id); setSelectedTheaterId(entry.theaterId)
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  const showtimesSection = (
    <div style={{ paddingTop: 8 }}>
      <div style={{ padding: isDesktop ? '16px 0 0' : '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          상영 영화관 및 일정
        </span>
        <MapCtaButton fullWidth={false} onClick={() => router.push(mapUrlWithSelection())}>
          지도에서 필터로 보기
        </MapCtaButton>
      </div>
      {!isLoading && totalTheaterCount > 0 && (
        <p style={{ margin: 0, padding: isDesktop ? '6px 0 0' : '6px 16px 0', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
          {regionId && (
            <><b style={{ color: 'var(--color-primary-base)' }}>{regionId}</b>{' 지역 '}
            <b style={{ color: 'var(--color-primary-base)' }}>{theaterEntries.filter((e) => getRegionFromAddress(e.theaterAddress) === regionId).length}</b>{'개 영화관 상영중, '}</>
          )}
          {'전국 '}<b style={{ color: 'var(--color-primary-base)' }}>{totalTheaterCount}</b>{'개 영화관 상영중'}
        </p>
      )}

      {/* 날짜 탭 — 극장 상세와 동일 (공용 DetailDateTabs) */}
      <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: 12 }}>
        <DetailDateTabs dates={dates} selectedDate={selectedDate} activeDates={activeDates} onSelect={setSelectedDate} />
      </div>

      {/* 예매 가능만 보기 — 날짜 바 바로 아래 오른쪽 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: isDesktop ? 'var(--spacing-3) 0 0' : 'var(--spacing-3) var(--gutter) 0' }}>
        <Chip selected={bookableOnly} onClick={() => setBookableOnly((v) => !v)} style={{ minHeight: 'auto', whiteSpace: 'nowrap' }}>
          예매 가능만 보기
        </Chip>
      </div>

      {/* 극장별 목록 */}
      <div style={{ padding: isDesktop ? '16px 0 64px' : `12px 16px ${selectedShowtimeData ? 148 : 52}px`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', fontSize: 13 }}>불러오는 중…</div>
        ) : dayTheaters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>이 날 상영 정보가 없습니다</div>
        ) : regionId ? (
          <>
            {inRegionEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>{regionId} 지역 상영 정보가 없습니다</div>
            ) : (
              inRegionEntries.map(renderTheaterCard)
            )}
            {otherRegionEntries.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                  <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontWeight: 500, whiteSpace: 'nowrap' }}>{regionId} 외 지역 영화관</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                </div>
                {otherRegionEntries.map(renderTheaterCard)}
              </>
            )}
          </>
        ) : (
          dayTheaters.map(renderTheaterCard)
        )}
      </div>
    </div>
  )

  const detailInfoSection = (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>상세 정보</p>
      <div style={{ borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {[
          { key: '국가', value: movie.nation ? withFlagsRaw(movie.nation) : undefined },
          { key: '개봉', value: movie.year ? String(movie.year) : undefined },
          { key: '상영 시간', value: movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined },
          { key: '장르', value: movie.genre.join(', ') || undefined },
        ].filter((r) => r.value).map((row, i, arr) => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <span style={{ width: 72, flexShrink: 0, fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 500 }}>{row.key}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const directorSideCard = movie.director.length > 0 ? (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>감독</p>
      {movie.director.map((name) => (
        <DirectorSideCard key={name} name={name} onClick={() => router.push(`/films/director/${encodeURIComponent(name)}`)} />
      ))}
    </div>
  ) : null

  const desktopBookingCard = selectedShowtimeData ? (
    <div style={{ borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-primary-base) 55%, transparent)', overflow: 'hidden' }}>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-caption)' }}>회차 선택됨</span>
          <CloseRoundButton variant="card" onClick={() => { setSelectedShowtimeId(null); setSelectedTheaterId(null) }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{movie.title}</div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-primary-base)' }}>{selectedShowtimeData.theaterName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>{selectedShowtimeData.st.showTime.slice(0, 5)}</span>
          {selectedShowtimeData.st.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>→ {selectedShowtimeData.st.endTime.slice(0, 5)}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([
            { key: '날짜', value: selectedDate.slice(5).replace('-', '/') },
            { key: '상영관', value: selectedShowtimeData.st.screenName || undefined },
            { key: '포맷', value: selectedShowtimeData.st.formatType !== 'standard' ? selectedShowtimeData.st.formatType.toUpperCase() : undefined },
            { key: '잔여석', value: selectedShowtimeData.st.seatTotal > 0 ? `${selectedShowtimeData.st.seatAvailable}/${selectedShowtimeData.st.seatTotal}석` : undefined },
          ] as { key: string; value?: string }[]).filter((r) => r.value).map((row) => (
            <div key={row.key} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--color-text-caption)', width: 44, flexShrink: 0 }}>{row.key}</span>
              <span style={{ fontWeight: 600, color: row.key === '잔여석' && selectedShowtimeData.st.seatAvailable <= 20 ? 'var(--color-warning)' : 'var(--color-text-body)' }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <ShareScheduleButton variant="card" onClick={shareSelectedShowtime} />
          <BookingCtaButton
            variant="card"
            bookingUrl={selectedShowtimeData.st.bookingUrl}
            onClick={() => trackEvent('booking clicked', {
              theater_id: selectedTheaterId ?? undefined,
              theater_name: selectedShowtimeData.theaterName,
              movie_id: movie.id,
              movie_title: movie.title,
              showtime_id: selectedShowtimeData.st.id,
              show_date: selectedShowtimeData.st.showDate,
              show_time: selectedShowtimeData.st.showTime,
              source: 'films_movie_detail',
            })}
          />
        </div>
      </div>
    </div>
  ) : null

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        <DetailTopBar crumbLabel="영화" crumbHref="/films" title={movie.title} isDesktop trailing={<RegionFilterWidget onRegionChange={setRegionId} />} />
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--gutter)' }}>
          {/* hero */}
          {heroSection}
          {actionRow}

          {/* 2-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'flex-start' }}>
            {/* main */}
            <div>
              {synopsisSection}
              {showtimesSection}
            </div>
            {/* sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8, position: 'sticky', top: 68 }}>
              {desktopBookingCard}
              {directorSideCard}
              {detailInfoSection}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-slide-in" style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
      <DetailTopBar crumbLabel="영화" crumbHref="/films" title={movie.title} isDesktop={false} trailing={<RegionFilterWidget onRegionChange={setRegionId} />} />
      {heroSection}
      {actionRow}
      {synopsisSection}
      {showtimesSection}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      {selectedShowtimeData && typeof document !== 'undefined' && createPortal(
        // .page-slide-in의 transform이 컨테이닝 블록을 만들어 fixed가 페이지 하단(전체 콘텐츠 끝)에
        // 붙어버리는 문제 — 뷰포트 기준으로 뜨도록 body에 직접 포탈로 렌더한다.
        <div style={{ position: 'fixed', bottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`, left: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0, right: 0, zIndex: 100, backgroundColor: 'var(--color-surface-card)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', paddingBottom: isDesktop ? 'max(16px, env(safe-area-inset-bottom))' : '16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                {selectedShowtimeData.st.showTime.slice(0, 5)}
                {selectedShowtimeData.st.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-caption)', marginLeft: 8, fontWeight: 400 }}>→ {selectedShowtimeData.st.endTime.slice(0, 5)}</span>}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedShowtimeData.theaterName}
                {selectedShowtimeData.st.screenName ? ` · ${selectedShowtimeData.st.screenName}` : ''}
                {selectedShowtimeData.st.seatTotal > 0 ? ` · 잔여 ${selectedShowtimeData.st.seatAvailable}석` : ''}
              </div>
            </div>
            <div style={{ marginLeft: 12 }}>
              <CloseRoundButton variant="bar" onClick={() => { setSelectedShowtimeId(null); setSelectedTheaterId(null) }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <ShareScheduleButton variant="bar" onClick={shareSelectedShowtime} />
            <BookingCtaButton
              variant="bar"
              bookingUrl={selectedShowtimeData.st.bookingUrl}
              onClick={() => trackEvent('booking clicked', {
                theater_id: selectedTheaterId ?? undefined,
                theater_name: selectedShowtimeData.theaterName,
                movie_id: movie.id,
                movie_title: movie.title,
                showtime_id: selectedShowtimeData.st.id,
                show_date: selectedShowtimeData.st.showDate,
                show_time: selectedShowtimeData.st.showTime,
                source: 'films_movie_detail',
              })}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/* ── 감독 사이드카드 ──────────────────────────────────────────────── */
function DirectorSideCard({ name, onClick }: { name: string; onClick: () => void }) {
  const { data: profile } = useDirectorProfile(name)
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', marginBottom: 8 }}
    >
      <Avatar name={name} photoUrl={profile?.photoUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
        <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 페이지 보기 →</div>
      </div>
      <IcoChevronRight />
    </button>
  )
}
