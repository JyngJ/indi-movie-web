'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { addDaysIso, toKstIsoDate } from '@/lib/date'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { FavoriteActionButton } from '@/components/domain/favorites/FavoriteActionRow'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import Image from 'next/image'
import { useTheaterShowtimes, useTheaterAllMovies } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlagsRaw } from '@/lib/nations'
import type { Theater, Movie, Showtime } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { BookingCtaButton, ShareScheduleButton, CloseRoundButton } from '@/components/domain/booking/BookingActions'
import { Skeleton, Button, Icon, EmptyState } from '@/components/primitives'
import { DetailDateTabs } from '@/components/domain/DetailDateTabs'
import { ShowtimeCell } from '@/components/domain/ShowtimeCell'
import { MapCtaButton } from '@/components/domain/movieDetail/MapCtaButton'

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)')   // DetailShell(1024)과 기준 통일
    const fn = () => setV(m.matches)
    fn(); m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
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

function formatDateTab(dateStr: string): { day: string; date: number; isHoliday: boolean } {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  return { day: DOW[dow], date: d.getDate(), isHoliday: dow === 0 }
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */

/* ── 상영시간 포맷 ─────────────────────────────────────────────── */
function formatLabel(st: Showtime): string {
  const parts: string[] = []
  if (st.screenName) parts.push(st.screenName)
  if (st.formatType && st.formatType !== 'standard') parts.push(st.formatType.toUpperCase())
  const langMap: Record<string, string> = { korean: '한국어', english: '영어', original: '원어' }
  if (st.language && st.language !== 'korean') parts.push(langMap[st.language] ?? st.language)
  return parts.join(' · ')
}

/* ── ShowtimeChip ──────────────────────────────────────────────── */
function ShowtimeChip({ st, selected, onClick }: { st: Showtime; selected?: boolean; onClick?: () => void }) {
  const soldout = st.seatAvailable === 0
  const low = !soldout && st.seatAvailable !== null && st.seatTotal > 0 && st.seatAvailable <= 20
  const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
  const label = formatLabel(st)

  return (
    <div
      onClick={!soldout && onClick ? onClick : undefined}
      style={{
        padding: '12px 16px', borderRadius: 12, minWidth: 110,
        border: selected ? '2px solid var(--color-primary-base)' : '1px solid var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        opacity: soldout ? 0.5 : 1,
        cursor: !soldout && onClick ? 'pointer' : 'default',
      }}>
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
      {st.seatTotal > 0 && (
        <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', fontFeatureSettings: '"tnum"' }}>
          <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
          <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
          {low && !soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-warning)', fontWeight: 600 }}>잔여↓</span>}
          {soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
        </div>
      )}
      {label && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--color-text-caption)' }}>{label}</div>
      )}
    </div>
  )
}

/* ── MovieShowtimeCard ─────────────────────────────────────────── */
function MovieShowtimeCard({
  movie,
  showtimes,
  isDesktop,
  isTodaySelected,
  onMovieClick,
  onChipClick,
  selectedShowtimeId,
}: {
  movie: Movie
  showtimes: Showtime[]
  isDesktop: boolean
  isTodaySelected: boolean
  onMovieClick: (id: string) => void
  onChipClick?: (st: Showtime, movieTitle: string) => void
  selectedShowtimeId?: string | null
}) {
  const posterW = isDesktop ? 80 : 68
  const posterH = isDesktop ? 120 : 102
  const meta = [
    movie.director[0],
    movie.nation ? withFlagsRaw(movie.nation) : undefined,
    movie.year,
    movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      borderRadius: 16, border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* 영화 헤더 */}
      <button
        onClick={() => onMovieClick(movie.id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 16,
          padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', minHeight: 'auto',
        }}
      >
        {/* 포스터 */}
        <div style={{ width: posterW, height: posterH, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
          {movie.posterUrl ? (
            <Image src={movie.posterUrl} alt={movie.title} fill sizes={`${posterW}px`} style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--color-neutral-800)' }} />
          )}
        </div>

        {/* 텍스트 */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {normalizeTitle(movie.title)}
          </span>
          {meta && (
            <span style={{ marginTop: 4, display: 'block', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
              {meta}
            </span>
          )}
          {movie.genre.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {movie.genre.slice(0, 2).map((g) => (
                <span key={g} style={{ fontSize: 'var(--text-badge)', padding: '4px 8px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: '1px solid var(--color-border)', color: 'var(--color-text-caption)', backgroundColor: 'var(--color-surface-raised)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        <Icon name="chevron-right" size={15} />
      </button>

      {/* 상영시간 — 2.0 ShowtimeCell 3열, 눌린 트레이 위 흰 셀 반전 (피그마 ShowtimeGroupCard) */}
      <div style={{ padding: '12px 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, backgroundColor: 'var(--color-neutral-100)' }}>
        {showtimes.map((st) => {
          const [sh, sm] = st.showTime.split(':').map(Number)
          const startMin = sh * 60 + sm
          const endMin = st.endTime ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })() : startMin + 120
          const now = new Date()
          const nowMinutes = now.getHours() * 60 + now.getMinutes()
          const kind: import('@/components/domain/ShowtimeCell').ShowtimeKind = (() => {
            if (isTodaySelected && endMin <= nowMinutes) return 'ended'
            if (isTodaySelected && startMin < nowMinutes && endMin > nowMinutes) return 'nowplaying'
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
              promo={/GV/i.test(st.screenName ?? '') ? 'GV' : undefined}
              kind={kind}
              selected={selectedShowtimeId === st.id}
              onClick={() => onChipClick?.(st, movie.title)}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── MovieShowtimeCard 로딩 자리표시 — 실제 카드와 같은 레이아웃/크기로 시프트 방지 ── */
function MovieShowtimeCardSkeleton({ isDesktop }: { isDesktop: boolean }) {
  const posterW = isDesktop ? 80 : 68
  const posterH = isDesktop ? 120 : 102

  return (
    <div style={{
      borderRadius: 16, border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px' }}>
        <Skeleton width={posterW} height={posterH} rounded="md" />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="45%" height={13} />
          <Skeleton width={90} height={18} rounded="full" />
        </div>
      </div>
      <div style={{ padding: '0 16px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Skeleton width={110} height={60} rounded="md" />
        <Skeleton width={110} height={60} rounded="md" />
      </div>
    </div>
  )
}

/* ── 메인 ────────────────────────────────────────────────────────── */
export function FilmsTheaterDetailClient({ theater }: { theater: Theater }) {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const dates = useMemo(() => getDateRange(7), [])
  const [selectedDate, setSelectedDate] = useState(dates[0])
  const [copied, setCopied] = useState(false)
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null)
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null)
  // 공유 링크(?date=&showtime=)로 들어왔을 때, 날짜 변경 시 선택 초기화하는
  // 아래 effect가 복원 직후 곧바로 리셋해버리지 않도록 1회 억제한다.
  const suppressResetOnDateChangeRef = useRef(false)
  const restoredShareRef = useRef(false)

  const { data: allMovies = [] } = useTheaterAllMovies(theater.id)
  const { data: dayData, isLoading } = useTheaterShowtimes(theater.id, selectedDate)

  /* ── analytics: 극장을 영화 경유 없이 직접 본 흐름 — TheaterSheet의 type_c 패턴 미러링 ── */
  useEffect(() => {
    classifySessionIntent('type_c', {
      source: 'films_theater_detail',
      theater_id: theater.id,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater.id])

  const dayMovies = dayData?.movies ?? []
  const dayShowtimes = dayData?.showtimes ?? []

  // 날짜가 showtimes에 있는 것만 탭 활성화
  const activeDates = useMemo(() => {
    const set = new Set<string>()
    for (const entry of allMovies) {
      for (const d of entry.availableDates) set.add(d)
    }
    return set
  }, [allMovies])

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
    setSelectedMovieTitle(null)
  }, [selectedDate])

  // 공유 링크·큐레이션 캡션 진입 시 선택된 회차 복원 (+ 해당 영화 카드로 스크롤)
  useEffect(() => {
    if (restoredShareRef.current) return
    // useSearchParams suspend → ISR 미완성 shell 캐시 → hydration 정지 방지 (영화 상세와 동일)
    const searchParams = new URLSearchParams(window.location.search)
    const dateParam = searchParams.get('date')
    const showtimeParam = searchParams.get('showtime')
    const movieParam = searchParams.get('movie')
    const timeParam = searchParams.get('time')
    if (!dateParam || (!showtimeParam && !(movieParam && timeParam))) return
    if (dayShowtimes.length === 0) return
    if (selectedDate !== dateParam) {
      // 해당 날짜로 먼저 이동 — dayShowtimes가 새 날짜로 다시 로드된 뒤 이 effect가 재실행된다
      suppressResetOnDateChangeRef.current = true
      setSelectedDate(dateParam)
      return
    }

    const st = showtimeParam
      ? dayShowtimes.find((s) => s.id === showtimeParam)
      : dayShowtimes.find((s) => s.movieId === movieParam && s.showTime.startsWith(timeParam!))
    if (!st) return

    restoredShareRef.current = true
    setSelectedShowtimeId(st.id)
    setSelectedMovieTitle(st.movieTitle)

    // 방금 선택한 상영표가 있는 영화 카드로 스크롤
    setTimeout(() => {
      document.querySelector(`[data-movie-anchor="${st.movieId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)

    const url = new URL(window.location.href)
    url.searchParams.delete('date')
    url.searchParams.delete('showtime')
    url.searchParams.delete('movie')
    url.searchParams.delete('time')
    window.history.replaceState({}, '', url.toString())
  }, [dayShowtimes, selectedDate])

  // 영화별로 showtimes 묶기
  const movieShowtimeGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>()
    for (const st of dayShowtimes) {
      if (!map.has(st.movieId)) map.set(st.movieId, [])
      map.get(st.movieId)!.push(st)
    }
    /* 오늘 탭에서 회차가 전부 끝난 영화는 목록 뒤로 — 지금 볼 수 있는 영화가 먼저 온다.
       종료 판정은 ShowtimeCell kind('ended')와 같은 기준(endTime, 없으면 시작+120분). */
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = selectedDate === toKstIsoDate(now)
    const allEnded = (sts: Showtime[]) => isToday && sts.every((st) => {
      const [sh, sm] = st.showTime.split(':').map(Number)
      const endMin = st.endTime
        ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })()
        : sh * 60 + sm + 120
      return endMin <= nowMinutes
    })
    /* 정렬 등급: 0 지금 볼 수 있는 회차 있음 → 1 남은 회차가 전부 매진 → 2 전부 상영 완료 */
    const rank = (sts: Showtime[]) => {
      if (allEnded(sts)) return 2
      const notEnded = sts.filter((st) => {
        if (!isToday) return true
        const [sh, sm] = st.showTime.split(':').map(Number)
        const endMin = st.endTime
          ? (() => { const [eh, em] = st.endTime!.split(':').map(Number); return eh * 60 + em })()
          : sh * 60 + sm + 120
        return endMin > nowMinutes
      })
      if (notEnded.length > 0 && notEnded.every((st) => st.seatAvailable === 0)) return 1
      return 0
    }
    return dayMovies.map((m) => ({ movie: m, showtimes: map.get(m.id) ?? [] }))
      .filter((g) => g.showtimes.length > 0)
      .sort((a, b) => {
        const d = rank(a.showtimes) - rank(b.showtimes)
        if (d !== 0) return d
        return (a.showtimes[0]?.showTime ?? '') < (b.showtimes[0]?.showTime ?? '') ? -1 : 1
      })
  }, [dayMovies, dayShowtimes, selectedDate])

  const selectedShowtimeData = useMemo(() => {
    if (!selectedShowtimeId || !selectedMovieTitle) return null
    const st = dayShowtimes.find((s) => s.id === selectedShowtimeId)
    if (!st) return null
    return { st, movieTitle: selectedMovieTitle }
  }, [selectedShowtimeId, selectedMovieTitle, dayShowtimes])

  // 회차가 선택돼있으면 그 회차(영화+날짜+시간)까지 실어서 지도로 — 선택 안 돼있으면 극장만
  function mapUrlWithSelection() {
    // '/map' — 지도 파라미터는 '/map'에서만 마운트되는 MapView가 읽는다 (#262 이후)
    const url = new URL('/map', window.location.origin)
    url.searchParams.set('theater', theater.id)
    if (selectedShowtimeData) {
      url.searchParams.set('movie', selectedShowtimeData.st.movieId)
      url.searchParams.set('date', selectedDate)
      url.searchParams.set('showtime', selectedShowtimeData.st.id)
    }
    return url.pathname + url.search
  }

  const shareSelectedShowtime = () => {
    if (!selectedShowtimeData) return
    const url = new URL(window.location.href)
    url.searchParams.set('date', selectedDate)
    url.searchParams.set('showtime', selectedShowtimeData.st.id)
    void shareAndTrack({
      payload: {
        title: `${theater.name} - ${selectedShowtimeData.movieTitle} ${selectedShowtimeData.st.showTime.slice(0, 5)}`,
        url: url.toString(),
      },
      source: 'films_theater_detail',
      scope: 'showtime',
      properties: {
        theater_id: theater.id,
        theater_name: theater.name,
        movie_id: selectedShowtimeData.st.movieId,
        movie_title: selectedShowtimeData.movieTitle,
        showtime_id: selectedShowtimeData.st.id,
      },
    })
  }

  function copyAddress() {
    navigator.clipboard.writeText(theater.address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const content = (
    <div style={{ paddingBottom: isDesktop ? (selectedShowtimeData ? 220 : 64) : (selectedShowtimeData ? 148 : 80) }}>
      {/* 헤더 */}
      {/* 그라데이션 밴드는 뺐다 (2026-08-24) — 다른 상세(영화·감독)는 민 배경이라 혼자 튀었다 */}
      <div style={{ padding: isDesktop ? '28px 28px 24px' : '20px 16px 20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 9999, border: '1px solid color-mix(in srgb, var(--color-primary-base) 55%, transparent)', backgroundColor: 'var(--color-primary-subtle-l)', marginBottom: 12 }}>
          <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, lineHeight: 1, color: 'var(--color-primary-base)' }}>독립·예술영화관</span>
        </div>
        <h2 className="display-h1" style={{ margin: '0 0 12px', color: 'var(--color-text-primary)' }}>
          {theater.name}
        </h2>
        {/* 주소 + 복사 */}
        <button
          onClick={copyAddress}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-sub)', fontSize: 13, marginBottom: 20, minHeight: 'auto' }}
        >
          <Icon name="map-pin" size={12} />
          <span>{theater.address}</span>
          <span style={{ marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4, color: copied ? 'var(--color-primary-base)' : 'var(--color-text-caption)', fontSize: 'var(--text-badge)', fontWeight: 500 }}>
            <Icon name="copy" size={14} />
            {copied ? '복사됨' : '복사'}
          </span>
        </button>

        {/* 액션 2행 (2026-08-24 확정): [관심 극장 등록(회색)][공유(회색)] / [지도에서 보기(파랑 전폭)].
            md 버튼 셋은 한 줄에 안 들어가고(실측 391 > 343), 길찾기는 극장 시트와 중복이라 뺐다. */}
        {/* PC 순서: 지도 → 공유 → 관심 (2026-08-24 확정). 모바일은 [관심][공유] / [지도 전폭] 2행 유지 */}
        <div style={{ display: 'flex', flexDirection: isDesktop ? 'row-reverse' : 'column', gap: 8, alignItems: isDesktop ? 'center' : undefined, justifyContent: isDesktop ? 'flex-end' : undefined }}>
          <div style={{ display: 'flex', flexDirection: isDesktop ? 'row-reverse' : 'row', gap: 8, alignItems: 'center' }}>
            <FavoriteActionButton type="theater" id={theater.id} label={theater.name} style={{ flex: isDesktop ? undefined : 1, whiteSpace: 'nowrap' }} />
            <Button
              variant="tertiary"
              size="md"
              aria-label="공유"
              onClick={() => {
                void shareAndTrack({
                  payload: { title: theater.name, url: window.location.href },
                  source: 'films_theater_detail',
                  scope: 'page',
                  properties: { theater_id: theater.id, theater_name: theater.name },
                })
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Icon name="share-2" size={16} />
              공유
            </Button>
          </div>
          <MapCtaButton fullWidth={!isDesktop} style={isDesktop ? { whiteSpace: 'nowrap' } : undefined} onClick={() => router.push(mapUrlWithSelection())}>
            지도에서 보기
          </MapCtaButton>
        </div>
      </div>

      {/* 날짜 탭 */}
      <div style={{
        position: 'sticky', top: 52, zIndex: 20,
        backgroundColor: 'var(--color-surface-bg)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <DetailDateTabs dates={dates} selectedDate={selectedDate} activeDates={activeDates} onSelect={setSelectedDate} />
      </div>

      {/* 현재 상영중 */}
      <div style={{ padding: isDesktop ? '20px 28px 0' : '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 미래 날짜에 "현재 상영중"은 거짓말 — 오늘만 현재고, 나머지는 그 날의 목록이다 (2026-08-24) */}
            {selectedDate === dates[0] ? '현재 상영중' : '이 날의 상영작'}{' '}
            <span style={{ fontSize: 16, color: 'var(--color-primary-base)' }}>{movieShowtimeGroups.length}편</span>
          </span>
        </div>

        {isLoading ? (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, columnGap: 16 } : {}}>
            {[0, 1, 2].map((i) => <MovieShowtimeCardSkeleton key={i} isDesktop={isDesktop} />)}
          </div>
        ) : movieShowtimeGroups.length === 0 ? (
          <EmptyState message="이 날 상영 정보가 없어요" paddingY={40} />
        ) : (
          <div className="reveal-rise" style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, columnGap: 16 } : {}}>
            {movieShowtimeGroups.map(({ movie, showtimes }) => (
              <div key={movie.id} data-movie-anchor={movie.id}>
              <MovieShowtimeCard
                movie={movie}
                showtimes={showtimes}
                isDesktop={isDesktop}
                isTodaySelected={selectedDate === dates[0]}
                onMovieClick={(id) => router.push(`/films/movie/${id}`)}
                onChipClick={(st, movieTitle) => {
                  trackEvent('showtime selected', {
                    theater_id: theater.id,
                    theater_name: theater.name,
                    movie_id: st.movieId,
                    movie_title: movieTitle,
                    showtime_id: st.id,
                    show_date: st.showDate,
                    show_time: st.showTime,
                    seat_available: st.seatAvailable,
                    seat_total: st.seatTotal,
                    has_booking_url: Boolean(st.bookingUrl),
                    source: 'films_theater_detail',
                  })
                  setSelectedShowtimeId(st.id); setSelectedMovieTitle(movieTitle)
                }}
                selectedShowtimeId={selectedShowtimeId}
              />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        <DetailTopBar crumbLabel="영화" crumbHref="/films" title={theater.name} isDesktop trailing={<RegionFilterWidget />} />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {content}
        </div>
        {selectedShowtimeData && (
          <div style={{ position: 'fixed', right: 32, bottom: 32, width: 300, zIndex: 100, borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-primary-base) 55%, transparent)', overflow: 'hidden' }}>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-caption)' }}>회차 선택됨</span>
                <CloseRoundButton variant="card" onClick={() => { setSelectedShowtimeId(null); setSelectedMovieTitle(null) }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{selectedShowtimeData.movieTitle}</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-primary-base)' }}>{theater.name}</div>
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
                    theater_id: theater.id,
                    theater_name: theater.name,
                    movie_id: selectedShowtimeData.st.movieId,
                    movie_title: selectedShowtimeData.movieTitle,
                    showtime_id: selectedShowtimeData.st.id,
                    show_date: selectedShowtimeData.st.showDate,
                    show_time: selectedShowtimeData.st.showTime,
                    source: 'films_theater_detail',
                  })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-slide-in" style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
      <DetailTopBar crumbLabel="영화" crumbHref="/films" title={theater.name} isDesktop={false} trailing={<RegionFilterWidget />} />
      {content}
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
                {selectedShowtimeData.movieTitle}
                {selectedShowtimeData.st.screenName ? ` · ${selectedShowtimeData.st.screenName}` : ''}
                {selectedShowtimeData.st.seatTotal > 0 ? ` · 잔여 ${selectedShowtimeData.st.seatAvailable}석` : ''}
              </div>
            </div>
            <div style={{ marginLeft: 12 }}>
              <CloseRoundButton variant="bar" onClick={() => { setSelectedShowtimeId(null); setSelectedMovieTitle(null) }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <ShareScheduleButton variant="bar" onClick={shareSelectedShowtime} />
            <BookingCtaButton
              variant="bar"
              bookingUrl={selectedShowtimeData.st.bookingUrl}
              onClick={() => trackEvent('booking clicked', {
                theater_id: theater.id,
                theater_name: theater.name,
                movie_id: selectedShowtimeData.st.movieId,
                movie_title: selectedShowtimeData.movieTitle,
                showtime_id: selectedShowtimeData.st.id,
                show_date: selectedShowtimeData.st.showDate,
                show_time: selectedShowtimeData.st.showTime,
                source: 'films_theater_detail',
              })}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
