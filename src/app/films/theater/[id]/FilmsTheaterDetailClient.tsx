'use client'

import { useState, useEffect, useRef } from 'react'
import { DetailBottomAd } from '@/components/ads/DetailBottomAd'
import { createPortal } from 'react-dom'
import { useProgressRouter } from '@/hooks/useProgressRouter'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { DetailKeyPanel } from '@/components/navigation/DetailKeyPanel'
import { FavoriteActionButton } from '@/components/domain/favorites/FavoriteActionRow'
import { GLOBAL_NAV_DESKTOP_WIDTH } from '@/components/navigation/GlobalNav'
import { useTheaterSchedule } from '@/hooks/useTheaterSchedule'
import { TheaterScheduleBody } from '@/components/domain/theaterSchedule/TheaterScheduleBody'
import type { TheaterInitialShowtimes } from '@/lib/catalog/getTheaterShowtimesCached'
import type { Theater } from '@/types/api'
import { RegionFilterWidget } from '@/components/domain/filterBar/RegionFilterWidget'
import { classifySessionIntent, trackEvent } from '@/lib/analytics/client'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { BookingCtaButton, ShareScheduleButton, CloseRoundButton } from '@/components/domain/booking/BookingActions'
import { Button, Icon } from '@/components/primitives'
import { DetailDateTabs } from '@/components/domain/DetailDateTabs'
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

/* ── 메인 ────────────────────────────────────────────────────────── */
export function FilmsTheaterDetailClient({ theater, initialSelection, initialShowtimes }: {
  theater: Theater
  /** 회차 공유 링크(/films/theater/[id]/s/[showtimeId])로 들어온 경우의 초기 선택 */
  initialSelection?: { date: string; showtimeId: string; movieTitle: string }
  /** 서버가 미리 읽은 오늘 시간표 — 첫 화면에서 API를 다시 부르지 않게 한다 */
  initialShowtimes?: TheaterInitialShowtimes | null
}) {
  const router = useProgressRouter()
  const isDesktop = useIsDesktop()

  /* 시간표 — 지도 극장 시트와 같은 훅·본문을 쓴다(2026-11). 그릇(페이지·시트)만 다르다 */
  const schedule = useTheaterSchedule({
    theaterId: theater.id,
    initialDate: initialSelection?.date,
    initialShowtimeId: initialSelection?.showtimeId,
    seed: initialShowtimes,
  })
  const selectedDate = schedule.selectedDate
  const [copied, setCopied] = useState(false)
  const restoredShareRef = useRef(false)

  /* ── analytics: 극장을 영화 경유 없이 직접 본 흐름 — TheaterSheet의 type_c 패턴 미러링 ── */
  useEffect(() => {
    classifySessionIntent('type_c', {
      source: 'films_theater_detail',
      theater_id: theater.id,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater.id])

  // 공유 링크·큐레이션 캡션(?date=&showtime= 또는 ?movie=&time=) 진입 시 회차 복원 + 그 영화 카드로 스크롤
  useEffect(() => {
    if (restoredShareRef.current) return
    // useSearchParams suspend → ISR 미완성 shell 캐시 → hydration 정지 방지 (영화 상세와 동일)
    const searchParams = new URLSearchParams(window.location.search)
    const dateParam = searchParams.get('date')
    const showtimeParam = searchParams.get('showtime')
    const movieParam = searchParams.get('movie')
    const timeParam = searchParams.get('time')
    if (!dateParam || (!showtimeParam && !(movieParam && timeParam))) return
    if (selectedDate !== dateParam) {
      // 그 날짜로 먼저 옮긴다 — 그날 시간표가 다시 들어오면 이 effect가 재실행된다
      schedule.selectDate(dateParam, { keepShowtime: true })
      return
    }
    const st = showtimeParam
      ? schedule.dayShowtimes.find((s) => s.id === showtimeParam)
      : schedule.dayShowtimes.find((s) => s.movieId === movieParam && s.showTime.startsWith(timeParam!))
    if (!st) return

    restoredShareRef.current = true
    schedule.selectShowtime(st.id)
    setTimeout(() => {
      document.querySelector(`[data-movie-anchor="${st.movieId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)

    const url = new URL(window.location.href)
    for (const key of ['date', 'showtime', 'movie', 'time']) url.searchParams.delete(key)
    window.history.replaceState({}, '', url.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.dayShowtimes, selectedDate])

  const selectedShowtimeData = schedule.selectedShowtime
    ? { st: schedule.selectedShowtime, movieTitle: schedule.selectedShowtime.movieTitle }
    : null

  // 회차가 선택돼있으면 그 회차(영화+날짜+시간)까지 실어서 지도로 — 선택 안 돼있으면 극장만
  function mapUrlWithSelection() {
    // '/map' — 지도 파라미터는 '/map'에서만 마운트되는 MapView가 읽는다 (#262 이후)
    const url = new URL('/map', window.location.origin)
    url.searchParams.set('theater', theater.id)
    // 지도가 영화 상세 진입과 구분해 받는다 — 시트를 접어 열고, 영화 필터를 걸지 않고, 뒤로가기를 이 페이지로
    url.searchParams.set('from', 'theater')
    if (selectedShowtimeData) {
      url.searchParams.set('movie', selectedShowtimeData.st.movieId)
      url.searchParams.set('date', selectedDate)
      url.searchParams.set('showtime', selectedShowtimeData.st.id)
    }
    return url.pathname + url.search
  }

  const shareSelectedShowtime = () => {
    if (!selectedShowtimeData) return
    /* 회차는 경로로 싣는다 — 쿼리로 실으면 OG 카드를 굽느라 극장 상세가 매 요청
       동적으로 굳는다(2026-09-17). 구 쿼리 링크는 위 복원 effect가 계속 받아준다. */
    const url = new URL(`/films/theater/${theater.id}/s/${selectedShowtimeData.st.id}`, window.location.origin)
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
      {/* 핵심 정보 패널 — 헤더 + 액션 + 지도 CTA + 날짜탭 (피그마 2026-09-17 확정) */}
      {/* 그라데이션 밴드는 뺐다 (2026-08-24) — 다른 상세(영화·감독)는 민 배경이라 혼자 튀었다 */}
      <DetailKeyPanel isDesktop={isDesktop} corners="top">
      <div style={{ padding: isDesktop ? '28px 0 24px' : '20px 16px 20px' }}>
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
          <MapCtaButton fullWidth={!isDesktop} style={isDesktop ? { whiteSpace: 'nowrap' } : undefined} onClick={() => {
            trackEvent('theater map opened', {
              theater_id: theater.id,
              theater_name: theater.name,
              has_showtime: Boolean(selectedShowtimeData),
              source: 'films_theater_detail',
            })
            router.push(mapUrlWithSelection())
          }}>
            지도에서 보기
          </MapCtaButton>
        </div>
      </div>

      </DetailKeyPanel>

      {/* 날짜 탭 — 패널의 아랫단. 패널 *안*에 넣으면 sticky가 패널 높이에 갇혀 목록을 스크롤할 때
          따라오지 못한다(2026-09-17 확인). 그래서 sticky 요소 자신이 패널 조각이 된다. */}
      <DetailKeyPanel
        isDesktop={isDesktop}
        corners="bottom"
        style={{
          position: 'sticky', top: 52, zIndex: 20,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <DetailDateTabs dates={schedule.dates} selectedDate={selectedDate} activeDates={schedule.activeDates} onSelect={(date) => schedule.selectDate(date)} />
      </DetailKeyPanel>

      {/* 그날 상영작 — 지도 극장 시트와 같은 본문 */}
      <div style={{ padding: isDesktop ? '20px 0 0' : 'var(--gutter) var(--gutter) 0' }}>
        <TheaterScheduleBody
          schedule={schedule}
          columns={isDesktop ? 2 : 1}
          onMovieOpen={(id) => router.push(`/movie/${id}`)}
          onShowtimeSelected={(st) => trackEvent('showtime selected', {
            theater_id: theater.id,
            theater_name: theater.name,
            movie_id: st.movieId,
            movie_title: st.movieTitle,
            showtime_id: st.id,
            show_date: st.showDate,
            show_time: st.showTime,
            seat_available: st.seatAvailable,
            seat_total: st.seatTotal,
            has_booking_url: Boolean(st.bookingUrl),
            source: 'films_theater_detail',
          })}
        />
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}>
        <DetailTopBar crumbLabel="영화" crumbHref="/films" title={theater.name} isDesktop trailing={<RegionFilterWidget />} />
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 0' }}>
          {content}
          <DetailBottomAd />
        </div>
        {selectedShowtimeData && (
          <div style={{ position: 'fixed', right: 32, bottom: 32, width: 300, zIndex: 100, borderRadius: 16, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-primary-base) 55%, transparent)', overflow: 'hidden' }}>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-badge)', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--color-text-caption)' }}>회차 선택됨</span>
                <CloseRoundButton variant="card" onClick={() => { schedule.selectShowtime(null) }} />
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
      <DetailBottomAd />
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      {selectedShowtimeData && typeof document !== 'undefined' && createPortal(
        // .page-slide-in의 transform이 컨테이닝 블록을 만들어 fixed가 페이지 하단(전체 콘텐츠 끝)에
        // 붙어버리는 문제 — 뷰포트 기준으로 뜨도록 body에 직접 포탈로 렌더한다.
        <div style={{ position: 'fixed', bottom: isDesktop ? 0 : 'var(--nav-mobile-offset)', left: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0, right: 0, zIndex: 100, backgroundColor: 'var(--color-surface-card)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', paddingBottom: isDesktop ? 'max(16px, env(safe-area-inset-bottom))' : '16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' }}>
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
              <CloseRoundButton variant="bar" onClick={() => { schedule.selectShowtime(null) }} />
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
