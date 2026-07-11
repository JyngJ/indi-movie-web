'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheaterShowtimes, useTheaterAllMovies } from '@/lib/supabase/queries'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlagsRaw } from '@/lib/nations'
import type { Theater, Movie, Showtime } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { trackEvent } from '@/lib/analytics/client'
import { Clapperboard } from 'lucide-react'

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1280px)')
    const fn = () => setV(m.matches)
    fn(); m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  return v
}

/* ── 날짜 유틸 ─────────────────────────────────────────────────── */
function getDateRange(days = 7): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

function formatDateTab(dateStr: string): { day: string; date: number; isHoliday: boolean } {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  return { day: DOW[dow], date: d.getDate(), isHoliday: dow === 0 }
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoMap = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const IcoNav = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
)
const IcoShare = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)
const IcoCopy = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoX = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>

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
        padding: '10px 14px', borderRadius: 10, minWidth: 110,
        border: selected ? '2px solid var(--color-primary-base)' : '1px solid var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        opacity: soldout ? 0.5 : 1,
        cursor: !soldout && onClick ? 'pointer' : 'default',
      }}>
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
      {st.seatTotal > 0 && (
        <div style={{ marginTop: 3, fontSize: 11, fontFeatureSettings: '"tnum"' }}>
          <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
          <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
          {low && !soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-warning)', fontWeight: 600 }}>잔여↓</span>}
          {soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
        </div>
      )}
      {label && (
        <div style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-caption)' }}>{label}</div>
      )}
    </div>
  )
}

/* ── MovieShowtimeCard ─────────────────────────────────────────── */
function MovieShowtimeCard({
  movie,
  showtimes,
  isDesktop,
  onMovieClick,
  onChipClick,
  selectedShowtimeId,
}: {
  movie: Movie
  showtimes: Showtime[]
  isDesktop: boolean
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
      borderRadius: 14, border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* 영화 헤더 */}
      <button
        onClick={() => onMovieClick(movie.id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 14,
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', minHeight: 'auto',
        }}
      >
        {/* 포스터 */}
        <div style={{ width: posterW, height: posterH, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
          {movie.posterUrl ? (
            <Image src={movie.posterUrl} alt={movie.title} fill sizes={`${posterW}px`} style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)' }} />
          )}
        </div>

        {/* 텍스트 */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)', display: 'block', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {normalizeTitle(movie.title)}
          </span>
          {meta && (
            <span style={{ marginTop: 5, display: 'block', fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.5 }}>
              {meta}
            </span>
          )}
          {movie.genre.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {movie.genre.slice(0, 2).map((g) => (
                <span key={g} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid var(--color-border)', color: 'var(--color-text-caption)', backgroundColor: 'var(--color-surface-raised)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        <IcoChevronRight />
      </button>

      {/* 상영시간 */}
      <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {showtimes.map((st) => (
          <ShowtimeChip
            key={st.id} st={st}
            selected={selectedShowtimeId === st.id}
            onClick={() => onChipClick?.(st, movie.title)}
          />
        ))}
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

  const { data: allMovies = [] } = useTheaterAllMovies(theater.id)
  const { data: dayData, isLoading } = useTheaterShowtimes(theater.id, selectedDate)

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

  // 날짜 변경 시 선택 회차 초기화
  useEffect(() => {
    setSelectedShowtimeId(null)
    setSelectedMovieTitle(null)
  }, [selectedDate])

  // 영화별로 showtimes 묶기
  const movieShowtimeGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>()
    for (const st of dayShowtimes) {
      if (!map.has(st.movieId)) map.set(st.movieId, [])
      map.get(st.movieId)!.push(st)
    }
    return dayMovies.map((m) => ({ movie: m, showtimes: map.get(m.id) ?? [] }))
      .sort((a, b) => (a.showtimes[0]?.showTime ?? '') < (b.showtimes[0]?.showTime ?? '') ? -1 : 1)
  }, [dayMovies, dayShowtimes])

  const selectedShowtimeData = useMemo(() => {
    if (!selectedShowtimeId || !selectedMovieTitle) return null
    const st = dayShowtimes.find((s) => s.id === selectedShowtimeId)
    if (!st) return null
    return { st, movieTitle: selectedMovieTitle }
  }, [selectedShowtimeId, selectedMovieTitle, dayShowtimes])

  function copyAddress() {
    navigator.clipboard.writeText(theater.address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, padding: '0 16px', borderRadius: 10,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-card)',
    color: 'var(--color-text-body)',
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', minHeight: 'auto', flexShrink: 0,
  }

  const content = (
    <div style={{ paddingBottom: isDesktop ? (selectedShowtimeData ? 220 : 64) : (selectedShowtimeData ? 148 : 80) }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
        padding: isDesktop ? '28px 28px 24px' : '20px 16px 20px',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, border: '1px solid color-mix(in srgb, var(--color-primary-base) 55%, transparent)', backgroundColor: 'var(--color-primary-subtle-l)', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-base)' }}>독립·예술영화관</span>
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: isDesktop ? 32 : 24, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          {theater.name}
        </h1>
        {/* 주소 + 복사 */}
        <button
          onClick={copyAddress}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-sub)', fontSize: 13, marginBottom: 18, minHeight: 'auto' }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span>{theater.address}</span>
          <span style={{ marginLeft: 2, display: 'flex', alignItems: 'center', gap: 3, color: copied ? 'var(--color-primary-base)' : 'var(--color-text-caption)', fontSize: 11, fontWeight: 500 }}>
            <IcoCopy />
            {copied ? '복사됨' : '복사'}
          </span>
        </button>

        {/* CTA 버튼 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...btnBase, backgroundColor: 'var(--color-primary-base)', color: '#fff', border: 'none', flex: isDesktop ? undefined : 1 }}
            onClick={() => router.push(`/?theater=${theater.id}`)}
          >
            <IcoMap />
            지도에서 보기
          </button>
          {theater.address && (
            <button
              style={btnBase}
              onClick={() => window.open(`https://map.naver.com/p/search/${encodeURIComponent(theater.address)}`, '_blank')}
            >
              <IcoNav />
              길찾기
            </button>
          )}
          <button
            style={btnBase}
            onClick={() => {
              trackEvent('share clicked', { theater_id: theater.id, theater_name: theater.name, source: 'films_theater_detail' })
              navigator.share?.({ title: theater.name, url: window.location.href }).catch(() => {})
            }}
          >
            <IcoShare />
            공유
          </button>
        </div>
      </div>

      {/* 날짜 탭 */}
      <div style={{
        position: 'sticky', top: 52, zIndex: 20,
        backgroundColor: 'var(--color-surface-bg)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', overflowX: 'auto', padding: '0 4px' }} className="no-scrollbar">
          {dates.map((d, i) => {
            const { day, date, isHoliday } = formatDateTab(d)
            const isSelected = d === selectedDate
            const hasShows = activeDates.has(d)
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                style={{
                  flexShrink: 0, width: 56, height: 60,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  border: 'none', background: 'none', cursor: hasShows ? 'pointer' : 'default',
                  opacity: hasShows ? 1 : 0.35,
                  borderBottom: isSelected ? '2px solid var(--color-primary-base)' : '2px solid transparent',
                  minHeight: 'auto',
                }}
                disabled={!hasShows}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-caption)' }}>
                  {i === 0 ? '오늘' : day}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFeatureSettings: '"tnum"', color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                  {date}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 현재 상영중 */}
      <div style={{ padding: isDesktop ? '20px 28px 0' : '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clapperboard size={20} strokeWidth={2} color="var(--color-primary-base)" /> 현재 상영중{' '}
            <span style={{ fontSize: 16, color: 'var(--color-primary-base)' }}>{movieShowtimeGroups.length}편</span>
          </span>
        </div>

        {isLoading ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', fontSize: 13 }}>
            불러오는 중…
          </div>
        ) : movieShowtimeGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
            이 날 상영 정보가 없습니다
          </div>
        ) : (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, columnGap: 16 } : {}}>
            {movieShowtimeGroups.map(({ movie, showtimes }) => (
              <MovieShowtimeCard
                key={movie.id}
                movie={movie}
                showtimes={showtimes}
                isDesktop={isDesktop}
                onMovieClick={(id) => router.push(`/films/movie/${id}`)}
                onChipClick={(st, movieTitle) => { setSelectedShowtimeId(st.id); setSelectedMovieTitle(movieTitle) }}
                selectedShowtimeId={selectedShowtimeId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        {/* 상단 NavBar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 12, gap: 6, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <button onClick={() => router.back()} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}><IcoChevronLeft /></button>
              <button onClick={() => router.push('/films')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto', flexShrink: 0 }}>영화</button>
              <span style={{ color: 'var(--color-text-caption)', fontSize: 13, flexShrink: 0 }}>&gt;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theater.name}</span>
            </div>
            <RegionFilterWidget />
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {content}
        </div>
        {selectedShowtimeData && (
          <div style={{ position: 'fixed', right: 32, bottom: 32, width: 300, zIndex: 100, borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-primary-base) 55%, transparent)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-caption)' }}>회차 선택됨</span>
                <button onClick={() => { setSelectedShowtimeId(null); setSelectedMovieTitle(null) }} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', borderRadius: 99, cursor: 'pointer', color: 'var(--color-text-caption)', padding: 0, minHeight: 'auto' }}>
                  <IcoX />
                </button>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>{selectedShowtimeData.movieTitle}</div>
                <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: 'var(--color-primary-base)' }}>{theater.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>{selectedShowtimeData.st.showTime.slice(0, 5)}</span>
                {selectedShowtimeData.st.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>→ {selectedShowtimeData.st.endTime.slice(0, 5)}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
              {selectedShowtimeData.st.bookingUrl ? (
                <a href={selectedShowtimeData.st.bookingUrl} target="_blank" rel="noopener noreferrer"
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 10, backgroundColor: 'var(--color-primary-base)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>
                  예매하러 가기 →
                </a>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-caption)', fontSize: 12, border: '1px solid var(--color-border)', marginTop: 4 }}>
                  예매 링크 없음
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-slide-in" style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
      {/* 모바일 NavBar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-primary-subtle-l)' }}>
          <button
            onClick={() => router.back()}
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}
          >
            <IcoChevronLeft />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, minWidth: 0 }}>
            <button onClick={() => router.push('/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto', padding: 0, flexShrink: 0 }}>영화</button>
            <span style={{ color: 'var(--color-text-caption)', flexShrink: 0 }}>&gt;</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theater.name}</span>
          </div>
          <div style={{ paddingRight: 10, flexShrink: 0 }}><RegionFilterWidget /></div>
        </div>
      </div>
      {content}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      {selectedShowtimeData && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'var(--color-surface-card)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                {selectedShowtimeData.st.showTime.slice(0, 5)}
                {selectedShowtimeData.st.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-caption)', marginLeft: 6, fontWeight: 400 }}>→ {selectedShowtimeData.st.endTime.slice(0, 5)}</span>}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedShowtimeData.movieTitle}
                {selectedShowtimeData.st.screenName ? ` · ${selectedShowtimeData.st.screenName}` : ''}
                {selectedShowtimeData.st.seatTotal > 0 ? ` · 잔여 ${selectedShowtimeData.st.seatAvailable}석` : ''}
              </div>
            </div>
            <button onClick={() => { setSelectedShowtimeId(null); setSelectedMovieTitle(null) }} style={{ marginLeft: 12, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--color-surface-raised)', borderRadius: 99, cursor: 'pointer', color: 'var(--color-text-caption)', flexShrink: 0, minHeight: 'auto' }}>
              <IcoX />
            </button>
          </div>
          {selectedShowtimeData.st.bookingUrl ? (
            <a href={selectedShowtimeData.st.bookingUrl} target="_blank" rel="noopener noreferrer"
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: 'var(--color-primary-base)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              예매하러 가기 →
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-caption)', fontSize: 13, border: '1px solid var(--color-border)' }}>
              예매 링크 없음
            </div>
          )}
        </div>
      )}
    </div>
  )
}
