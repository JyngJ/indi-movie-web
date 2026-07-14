'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useMovieTheaterShowtimes, useDirectorProfile } from '@/lib/supabase/queries'
import type { MovieDetail } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'
import type { Showtime } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { getStoredRegion } from '@/lib/regionStorage'
import { getRegionFromAddress } from '@/lib/regions'
import { trackEvent } from '@/lib/analytics/client'
import { MapPin } from 'lucide-react'

function useIsDesktop() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1280px)')
    const fn = () => setV(m.matches); fn()
    m.addEventListener('change', fn); return () => m.removeEventListener('change', fn)
  }, [])
  return v
}

/* ── 날짜 유틸 ─────────────────────────────────────────────────── */
function getDateRange(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}
function formatDateTab(dateStr: string) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00'); const dow = d.getDay()
  return { day: DOW[dow], date: d.getDate(), isHoliday: dow === 0 }
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
const IcoChevronRight = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
const IcoMap = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
const IcoShare = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
const IcoPin = () => <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
const IcoUser = () => <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
const IcoX = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>

/* ── ShowtimeChip ──────────────────────────────────────────────── */
function ShowtimeChip({ st, selected, onClick }: { st: Showtime; selected?: boolean; onClick?: () => void }) {
  const soldout = st.seatAvailable === 0
  const low = !soldout && st.seatTotal > 0 && st.seatAvailable <= 20
  const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
  return (
    <div
      onClick={!soldout && onClick ? onClick : undefined}
      style={{
        padding: '10px 14px', borderRadius: 10, minWidth: 100,
        border: selected ? '2px solid var(--color-primary-base)' : '1px solid var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-raised)',
        opacity: soldout ? 0.5 : 1,
        cursor: !soldout && onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>{st.showTime.slice(0, 5)}</span>
        {st.endTime && <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>-{st.endTime.slice(0, 5)}</span>}
      </div>
      {st.seatTotal > 0 && (
        <div style={{ marginTop: 3, fontSize: 11, fontFeatureSettings: '"tnum"' }}>
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
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', borderRadius: 999, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', cursor: 'pointer', minHeight: 'auto' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)' }}>
        {photoUrl ? <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : <IcoUser />}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</span>
      <span style={{ fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 →</span>
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
  const [regionId, setRegionId] = useState<string | null>(() => getStoredRegion())
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null)
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | null>(null)

  const { data: theaterEntries = [], isLoading } = useMovieTheaterShowtimes(movie.id)

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

  // 날짜 변경 시 선택 회차 초기화
  useEffect(() => {
    setSelectedShowtimeId(null)
    setSelectedTheaterId(null)
  }, [selectedDate])

  // 선택 날짜에 상영하는 극장+시간표만
  const dayTheaters = useMemo(() => {
    return theaterEntries
      .map((entry) => ({
        ...entry,
        showtimes: entry.dateGroups.find((g) => g.date === selectedDate)?.showtimes ?? [],
      }))
      .filter((entry) => entry.showtimes.length > 0)
  }, [theaterEntries, selectedDate])

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

  const meta = [
    movie.nation ? withFlagsRaw(movie.nation) : undefined,
    movie.year,
    movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined,
  ].filter(Boolean).join(' · ')

  /* ── 공통 섹션들 ──────────────────────────────────────────────── */
  const heroSection = (
    <div style={{
      background: 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      padding: isDesktop ? '32px 0 28px' : '24px 16px 20px',
      display: 'flex', gap: isDesktop ? 32 : 16, alignItems: 'flex-start',
    }}>
      {/* 포스터 */}
      <div style={{ flexShrink: 0, position: 'relative', width: isDesktop ? 200 : 100, height: isDesktop ? 300 : 150 }}>
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={`${movie.title} 포스터`} fill priority sizes={isDesktop ? '200px' : '100px'} style={{ borderRadius: isDesktop ? 12 : 8, objectFit: 'cover', boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', borderRadius: isDesktop ? 12 : 8, backgroundColor: 'var(--color-surface-raised)', background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)' }} />
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isDesktop ? 34 : 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          {movie.title}
        </h1>
        {movie.originalTitle && (
          <div style={{ marginTop: 5, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: isDesktop ? 14 : 12, color: 'var(--color-text-caption)' }}>
            {movie.originalTitle}
          </div>
        )}
        {movie.genre.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {movie.genre.map((g) => (
              <span key={g} style={{ height: 24, padding: '0 10px', display: 'inline-flex', alignItems: 'center', borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: 'var(--color-primary-subtle-l)', border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)', color: 'var(--color-primary-base)' }}>
                {g}
              </span>
            ))}
          </div>
        )}
        {meta && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-sub)' }}>{meta}</div>
        )}
        {movie.director.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {movie.director.map((name) => (
              <DirectorChipLoader key={name} name={name} onClick={() => router.push(`/films/director/${encodeURIComponent(name)}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const ctaButtons = (
    <div style={{ padding: isDesktop ? '0 0 20px' : '12px 16px', display: 'flex', gap: 8 }}>
      <button
        onClick={() => router.push(`/?movie=${movie.id}`)}
        style={{ flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, border: '1px solid var(--color-primary-base)', backgroundColor: 'var(--color-primary-base)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        <IcoMap /> 지도에서 상영관 필터로 보기
      </button>
      <button
        onClick={() => {
          trackEvent('share clicked', { movie_id: movie.id, movie_title: movie.title, source: 'films_movie_detail' })
          navigator.share?.({ title: movie.title, url: window.location.href }).catch(() => {})
        }}
        style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', cursor: 'pointer', flexShrink: 0 }}
      >
        <IcoShare />
      </button>
    </div>
  )

  const synopsisSection = movie.synopsis ? (
    <div style={{ padding: isDesktop ? '0 0 20px' : '0 16px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>시놉시스</p>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>
        {movie.synopsis}
      </p>
    </div>
  ) : null

  function renderTheaterCard(entry: (typeof dayTheaters)[number]) {
    return (
      <div key={entry.theaterId} style={{ borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', overflow: 'hidden' }}>
        <button
          onClick={() => router.push(`/films/theater/${entry.theaterId}`)}
          style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 16px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', borderBottom: '1px solid var(--color-border)' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3 }}>{entry.theaterName}</span>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 3, color: 'var(--color-text-sub)', fontSize: 12 }}>
              <IcoPin /><span style={{ wordBreak: 'keep-all', lineHeight: 1.45 }}>{entry.theaterAddress}</span>
            </div>
          </div>
          <IcoChevronRight />
        </button>
        <div style={{ padding: '10px 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {entry.showtimes.map((st) => (
            <ShowtimeChip
              key={st.id} st={st}
              selected={selectedShowtimeId === st.id}
              onClick={() => { setSelectedShowtimeId(st.id); setSelectedTheaterId(entry.theaterId) }}
            />
          ))}
        </div>
      </div>
    )
  }

  const showtimesSection = (
    <div style={{ paddingTop: 8 }}>
      <div style={{ padding: isDesktop ? '16px 0 0' : '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={20} strokeWidth={2} color="var(--color-primary-base)" /> 상영 영화관 및 일정
        </span>
        <button
          onClick={() => router.push(`/?movie=${movie.id}`)}
          style={{ height: 30, padding: '0 12px', borderRadius: 99, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 'auto' }}
        >
          <IcoMap /> 지도에서 필터로 보기
        </button>
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

      {/* 날짜 탭 */}
      <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: 12 }}>
        <div style={{ display: 'flex', overflowX: 'auto', padding: '0 4px' }} className="no-scrollbar">
          {dates.map((d, i) => {
            const { day, date, isHoliday } = formatDateTab(d)
            const isSelected = d === selectedDate
            const hasShows = activeDates.has(d)
            return (
              <button
                key={d}
                onClick={() => hasShows && setSelectedDate(d)}
                style={{ flexShrink: 0, width: 56, height: 58, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'none', cursor: hasShows ? 'pointer' : 'default', opacity: hasShows ? 1 : 0.35, borderBottom: isSelected ? '2px solid var(--color-primary-base)' : '2px solid transparent', minHeight: 'auto' }}
                disabled={!hasShows}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-caption)' }}>{i === 0 ? '오늘' : day}</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFeatureSettings: '"tnum"', color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-primary)' }}>{date}</span>
              </button>
            )
          })}
        </div>
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
                  <span style={{ fontSize: 11, color: 'var(--color-text-caption)', fontWeight: 500, whiteSpace: 'nowrap' }}>{regionId} 외 지역 영화관</span>
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
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
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
    <div style={{ borderRadius: 14, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-primary-base) 55%, transparent)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-caption)' }}>회차 선택됨</span>
          <button onClick={() => { setSelectedShowtimeId(null); setSelectedTheaterId(null) }} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', borderRadius: 99, cursor: 'pointer', color: 'var(--color-text-caption)', padding: 0, minHeight: 'auto' }}>
            <IcoX />
          </button>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>{movie.title}</div>
          <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: 'var(--color-primary-base)' }}>{selectedShowtimeData.theaterName}</div>
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
              theater_id: selectedTheaterId ?? undefined,
              theater_name: selectedShowtimeData.theaterName,
              movie_id: movie.id,
              movie_title: movie.title,
              showtime_id: selectedShowtimeData.st.id,
              show_date: selectedShowtimeData.st.showDate,
              show_time: selectedShowtimeData.st.showTime,
              source: 'films_movie_detail',
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
  ) : null

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        {/* NavBar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 12, gap: 6, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <button onClick={() => router.back()} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}><IcoChevronLeft /></button>
              <button onClick={() => router.push('/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto' }}>영화</button>
              <span style={{ color: 'var(--color-text-caption)', fontSize: 13 }}>&gt;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</span>
            </div>
            <RegionFilterWidget onRegionChange={setRegionId} />
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
          {/* hero */}
          {heroSection}
          {ctaButtons}

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
      <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-primary-subtle-l)' }}>
          <button onClick={() => router.back()} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}><IcoChevronLeft /></button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, minWidth: 0 }}>
            <button onClick={() => router.push('/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto', padding: 0, flexShrink: 0 }}>영화</button>
            <span style={{ color: 'var(--color-text-caption)', flexShrink: 0 }}>&gt;</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</span>
          </div>
          <div style={{ paddingRight: 10, flexShrink: 0 }}><RegionFilterWidget onRegionChange={setRegionId} /></div>
        </div>
      </div>
      {heroSection}
      {ctaButtons}
      {synopsisSection}
      {showtimesSection}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      {selectedShowtimeData && typeof document !== 'undefined' && createPortal(
        // .page-slide-in의 transform이 컨테이닝 블록을 만들어 fixed가 페이지 하단(전체 콘텐츠 끝)에
        // 붙어버리는 문제 — 뷰포트 기준으로 뜨도록 body에 직접 포탈로 렌더한다.
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'var(--color-surface-card)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                {selectedShowtimeData.st.showTime.slice(0, 5)}
                {selectedShowtimeData.st.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-caption)', marginLeft: 6, fontWeight: 400 }}>→ {selectedShowtimeData.st.endTime.slice(0, 5)}</span>}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedShowtimeData.theaterName}
                {selectedShowtimeData.st.screenName ? ` · ${selectedShowtimeData.st.screenName}` : ''}
                {selectedShowtimeData.st.seatTotal > 0 ? ` · 잔여 ${selectedShowtimeData.st.seatAvailable}석` : ''}
              </div>
            </div>
            <button onClick={() => { setSelectedShowtimeId(null); setSelectedTheaterId(null) }} style={{ marginLeft: 12, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--color-surface-raised)', borderRadius: 99, cursor: 'pointer', color: 'var(--color-text-caption)', flexShrink: 0, minHeight: 'auto' }}>
              <IcoX />
            </button>
          </div>
          {selectedShowtimeData.st.bookingUrl ? (
            <a href={selectedShowtimeData.st.bookingUrl} target="_blank" rel="noopener noreferrer"
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: 'var(--color-primary-base)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              예매하러 가기 →
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-caption)', fontSize: 13, border: '1px solid var(--color-border)' }}>
              예매 링크 없음
            </div>
          )}
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
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', cursor: 'pointer', textAlign: 'left', minHeight: 'auto', marginBottom: 8 }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)' }}>
        {profile?.photoUrl ? <img src={profile.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : <IcoUser />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}>{name}</div>
        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 페이지 보기 →</div>
      </div>
      <IcoChevronRight />
    </button>
  )
}
