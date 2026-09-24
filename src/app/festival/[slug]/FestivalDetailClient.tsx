'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge, Button, Icon, SectionHeader, ScrollNavButton } from '@/components/primitives'
import { DetailTopBar } from '@/components/navigation/DetailTopBar'
import { DetailKeyPanel } from '@/components/navigation/DetailKeyPanel'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useFavorites } from '@/hooks/useFavorites'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { getFestivalDateLabel, getFestivalStatus, type FestivalStatus } from '@/lib/festival/status'
import { buildFestivalVenueMap } from '@/lib/festival/venueMap'
import { isMultiplexVenue, multiplexNotice } from '@/lib/festival/venue'
import { toKstIsoDate } from '@/lib/date'
import { scrollRailBy } from '@/lib/ui/railScroll'
import type { FestivalDetail } from '@/types/festival'
import { FestivalTimetable } from './FestivalTimetable'

// Leaflet은 window를 만진다 — 서버 렌더에서 빼고 자리만 잡아 둔다
const FestivalVenueMap = dynamic(() => import('./FestivalVenueMap'), {
  ssr: false,
  loading: () => <div style={{ height: 320, margin: 'var(--spacing-3) var(--gutter-sheet) 0', borderRadius: 'var(--radius-control)', backgroundColor: 'var(--color-surface-raised)' }} />,
})

// http:// 원본(예: jiff.kr — HTTPS 인증서가 깨져있음)을 브라우저가 직접 요청하면 mixed-content
// 자동 https 승격 때문에 깨진다. Next 이미지 최적화 엔드포인트를 거치면 서버가 대신
// http로 fetch해서 우리 도메인(https)으로 내려주므로 브라우저 정책을 안 탄다.
function proxiedImageUrl(url: string, width: number) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
}

const STATUS_LABEL: Record<FestivalStatus, string> = { upcoming: '예정', ongoing: '진행 중', ended: '종료' }
const STATUS_BADGE: Record<FestivalStatus, 'warning' | 'success' | 'default'> = { upcoming: 'warning', ongoing: 'success', ended: 'default' }

// 라인업 그리드 접힌 상태 노출 개수 — 지도 큐레이션 탭(CurationSheet)과 같은 더보기 패턴,
// 컬럼 수와 무관하게 고정 개수로 자른다(그쪽도 SECTION_COLLAPSED_COUNT=6 고정값 사용)
const LINEUP_COLLAPSED_COUNT = 6

const DOW = ['일', '월', '화', '수', '목', '금', '토']
function timetableCaption(dayDate: string | null, label: string | null): string {
  const dayLabel = dayDate
    ? `${Number(dayDate.slice(5, 7))}월 ${Number(dayDate.slice(8, 10))}일 (${DOW[new Date(`${dayDate}T12:00:00`).getDay()]})`
    : '전체'
  return label ? `${dayLabel} · ${label}` : dayLabel
}

function fullDateLabel(date: string): string {
  const [, month, day] = date.split('-')
  const dow = DOW[new Date(`${date}T12:00:00`).getDay()]
  return `${Number(month)}월 ${Number(day)}일 (${dow})`
}

function FestivalInfo({ festival, status, dateLabel, isDesktop }: {
  festival: FestivalDetail
  status: FestivalStatus
  dateLabel: string
  isDesktop: boolean
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
        <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontWeight: 600 }}>{dateLabel}</span>
      </div>
      <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)', wordBreak: 'keep-all', textWrap: 'balance' }}>
        {festival.name}
      </h1>
      <div style={{ marginTop: 'var(--spacing-2)', display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-1)', fontSize: 'var(--text-meta)', lineHeight: 1.5, color: 'var(--color-text-caption)' }}>
        <Icon name="map-pin" size={14} strokeWidth={1.75} color="currentColor" style={{ marginTop: 'var(--spacing-1)', flexShrink: 0 }} />
        <span>
          {fullDateLabel(festival.startDate)} ~ {fullDateLabel(festival.endDate)} · {festival.city}
          {festival.venueText ? ` · ${festival.venueText}` : ''}
        </span>
      </div>
      {festival.description && (
        <p style={{ margin: 'var(--spacing-4) 0 0', color: 'var(--color-text-body)', fontSize: 'var(--text-body)', lineHeight: 1.7, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>
          {festival.description}
        </p>
      )}
      {festival.linkUrl && (
        <div style={{ display: 'flex', marginTop: isDesktop ? 'auto' : 'var(--spacing-4)', paddingTop: isDesktop ? 'var(--spacing-5)' : 0 }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.open(festival.linkUrl!, '_blank', 'noopener,noreferrer')}
            style={{ flex: isDesktop ? '0 0 auto' : 1, minWidth: isDesktop ? 200 : undefined }}
          >
            공식 사이트
            <Icon name="external-link" size={16} strokeWidth={1.75} color="currentColor" />
          </Button>
        </div>
      )}
    </>
  )
}

/* ── 라인업 그리드 포스터 — PosterThumb은 고정 px 크기라 반응형 그리드엔 안 맞아 별도 작성 ── */
function LineupPoster({ src, alt }: { src?: string; alt: string }) {
  return (
    <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 'var(--radius-button)', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
      {src ? (
        <Image src={proxiedImageUrl(src, 280)} alt={alt} fill sizes="140px" style={{ objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-1) var(--spacing-2)' }}>
          <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {alt}
          </span>
        </div>
      )}
    </div>
  )
}

export function FestivalDetailClient({ festival }: { festival: FestivalDetail }) {
  const router = useRouter()
  // SSR은 window가 없어 항상 모바일 레이아웃으로 렌더 — useIsDesktopLayout을 마운트 전에
  // 그대로 쓰면 데스크톱 뷰포트에서 첫 클라이언트 렌더가 SSR 결과와 달라져 하이드레이션
  // 에러가 난다(films/page.tsx의 mounted 게이트와 동일 패턴).
  const [mounted, setMounted] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)   // 외부 배너·포스터 로드 실패 시 이름 폴백
  useEffect(() => setMounted(true), [])
  const isDesktopLayout = useIsDesktopLayout()
  const isDesktop = mounted && isDesktopLayout
  // 한국 서비스라 항상 KST 기준 "오늘" — formatLocalDate는 SSR(Vercel UTC)에서
  // 자정~오전 9시 사이 날짜가 하루 밀리는 버그가 있어 toKstIsoDate를 쓴다.
  const today = toKstIsoDate(new Date())
  const status = getFestivalStatus(festival.startDate, festival.endDate, today)
  const dateLabel = getFestivalDateLabel(status, festival.startDate, festival.endDate, today)
  const { isFavorite } = useFavorites()

  const [ttIndex, setTtIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const timetables = festival.timetables
  const currentTimetable = timetables[ttIndex]
  const hasScreenings = festival.screenings.length > 0

  // 극장 지도 ↔ 시간표: 지도 카드의 "시간표 보기"가 시간표를 그 극장으로 맞춘다
  const venueMap = useMemo(() => buildFestivalVenueMap(festival.theaters, festival.screenings), [festival.theaters, festival.screenings])
  const [mapVenue, setMapVenue] = useState<string | null>(() => venueMap.pinned[0]?.name ?? null)
  const [focusRequest, setFocusRequest] = useState<{ venue: string; at: number } | null>(null)

  // 라인업은 회차 표가 없는 영화제만 — 회차 표가 있으면 표가 곧 라인업이다(요청 2026-09-21)
  const showLineup = !hasScreenings && festival.movies.length > 0
  const [lineupExpanded, setLineupExpanded] = useState(false)
  const lineupRef = useRef<HTMLDivElement | null>(null)
  const [lineupCanL, setLineupCanL] = useState(false)
  const [lineupCanR, setLineupCanR] = useState(false)
  const updateLineupEdge = () => {
    const el = lineupRef.current
    if (!el) return
    setLineupCanL(el.scrollLeft > 4)
    setLineupCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => { updateLineupEdge() }, [festival.movies.length, mounted, isDesktop])
  const scrollLineup = (dir: -1 | 1) => {
    const el = lineupRef.current
    if (el) scrollRailBy(el, dir * Math.max(320, el.clientWidth * 0.8))
  }

  const sectionStyle: React.CSSProperties = { paddingTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)' }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 'var(--spacing-24)' }}>
      {/* 상세 공통 상단 바 — 레일·하단 탭바는 festival/layout의 DetailShell이 띄운다 */}
      <DetailTopBar crumbLabel="영화제" crumbHref="/films" title={festival.name} isDesktop={isDesktop} />

      <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, paddingTop: isDesktop ? 'var(--spacing-6)' : 0 }}>
        {/* 상단 — 세로 포스터가 있으면 영화 상세처럼 포스터 + 흰 패널, 가로 배너만 있으면 배너 띠 + 정보 */}
        {festival.posterUrl ? (
          <DetailKeyPanel isDesktop={isDesktop}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: isDesktop ? 'var(--spacing-8)' : 'var(--spacing-4)', padding: isDesktop ? 'var(--spacing-8) 0' : 'var(--spacing-6) var(--gutter)' }}>
              <div style={{ position: 'relative', flexShrink: 0, width: isDesktop ? 200 : 100, height: isDesktop ? 300 : 150, borderRadius: 'var(--radius-poster)', overflow: 'hidden', backgroundColor: 'var(--color-surface-raised)', boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)' }}>
                {!imageFailed ? (
                  <Image
                    src={festival.posterUrl}
                    alt={`${festival.name} 공식 포스터`}
                    fill
                    priority
                    sizes={isDesktop ? '200px' : '100px'}
                    onError={() => setImageFailed(true)}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-2)', color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', textAlign: 'center' }}>
                    {festival.name} 포스터
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 300 : 150 }}>
                <FestivalInfo festival={festival} status={status} dateLabel={dateLabel} isDesktop={isDesktop} />
              </div>
            </div>
          </DetailKeyPanel>
        ) : (
          <>
            {/* 가로 배너는 원본 비율 그대로 — 21:4처럼 납작한 배너를 박스에 맞추면 좌우가 잘린다 */}
            {festival.bannerUrl && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxiedImageUrl(festival.bannerUrl, 1920)}
                alt={festival.name}
                onError={() => setImageFailed(true)}
                style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: 'var(--color-surface-raised)', borderRadius: isDesktop ? 'var(--radius-sheet)' : 0 }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '21/4', backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 var(--spacing-6)', borderRadius: isDesktop ? 'var(--radius-sheet)' : 0 }}>
                <span className="display-h2" style={{ color: 'var(--color-text-primary)', textAlign: 'center' }}>{festival.name}</span>
              </div>
            )}
            <div style={{ padding: 'var(--spacing-5) var(--gutter) 0' }}>
              <FestivalInfo festival={festival} status={status} dateLabel={dateLabel} isDesktop={isDesktop} />
            </div>
          </>
        )}

        {/* 극장 지도 — 좌표가 있는 극장은 핀으로. 좌표 없는 행사장은 지도 아래 이름만 */}
        {festival.theaters.length > 0 && (
          <section style={sectionStyle}>
            <SectionHeader title={`극장 지도 (${festival.theaters.length}곳)`} isDesktop={isDesktop} />
            {venueMap.pinned.length > 0 ? (
              <FestivalVenueMap
                venues={venueMap.pinned}
                selected={mapVenue}
                onSelect={setMapVenue}
                onShowTimetable={(venue) => setFocusRequest({ venue, at: Date.now() })}
                isFavoriteTheater={(id) => isFavorite('theater', id)}
                isDesktop={isDesktop}
                hasScreenings={hasScreenings}
              />
            ) : null}
            {venueMap.unpinned.length > 0 && (
              <div style={{ margin: 'var(--spacing-3) var(--gutter-sheet) 0', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                {venueMap.unpinned.map((name) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', wordBreak: 'keep-all' }}>
                    <Icon name="map-pin" size={14} strokeWidth={1.75} color="var(--color-text-caption)" style={{ marginTop: 'var(--spacing-1)', flexShrink: 0 }} />
                    <span>
                      {name}
                      {isMultiplexVenue(name) && <span style={{ color: 'var(--color-text-caption)' }}> — {multiplexNotice(name, hasScreenings)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 상영 시간표 — 구조화된 회차가 있으면 바둑판, 없으면 영화제가 배포한 이미지,
            둘 다 없으면 "공개 전" 자리. 섹션을 통째로 감추지는 않는다. */}
        {!hasScreenings && timetables.length > 0 && currentTimetable ? (
          <section style={sectionStyle}>
            <SectionHeader title="상영 시간표" description="영화제 공식 배포 기준 — 정확한 회차는 공식 사이트에서 확인해 주세요" isDesktop={isDesktop} />
            <div style={{ margin: 'var(--spacing-3) var(--gutter)' }}>
              {timetables.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
                  <span style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>
                    {ttIndex + 1} / {timetables.length}
                  </span>
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                    {timetableCaption(currentTimetable.dayDate, currentTimetable.label)}
                  </span>
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setLightboxOpen(true)}
                  style={{ position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 'var(--radius-control)', overflow: 'hidden', cursor: 'zoom-in', backgroundColor: 'var(--color-surface-raised)' }}
                >
                  <Image src={proxiedImageUrl(currentTimetable.imageUrl, 1200)} alt={timetableCaption(currentTimetable.dayDate, currentTimetable.label)} fill sizes="600px" style={{ objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', bottom: 'var(--spacing-3)', right: 'var(--spacing-3)', width: 32, height: 32, borderRadius: 'var(--radius-pill)', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-accent)' }}>
                    <Icon name="zoom-in" size={16} strokeWidth={1.75} className="text-current" />
                  </div>
                </div>
                {timetables.length > 1 && (
                  <>
                    <ScrollNavButton direction="left" size={36} style={{ boxShadow: 'none' }} onClick={() => setTtIndex((i) => (i - 1 + timetables.length) % timetables.length)} />
                    <ScrollNavButton direction="right" size={36} style={{ boxShadow: 'none' }} onClick={() => setTtIndex((i) => (i + 1) % timetables.length)} />
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <FestivalTimetable
            screenings={festival.screenings}
            theaters={festival.theaters}
            startDate={festival.startDate}
            endDate={festival.endDate}
            today={today}
            isDesktop={isDesktop}
            officialUrl={festival.linkUrl}
            focusRequest={focusRequest}
          />
        )}

        {showLineup && (
          <section style={sectionStyle}>
            <SectionHeader title={`상영작 라인업 (${festival.movies.length}편)`} isDesktop={isDesktop} />
            {isDesktop ? (
              /* 웹: 좌우 넘김 캐러셀 — 더보기 없이 전체 라인업 */
              <div style={{ position: 'relative' }}>
                <div ref={lineupRef} className="no-scrollbar" onScroll={updateLineupEdge} style={{ display: 'flex', gap: 'var(--spacing-4)', overflowX: 'auto', padding: 'var(--spacing-3) var(--gutter)' }}>
                  {festival.movies.map((link) => (
                    <div
                      key={link.id}
                      onClick={link.movie ? () => router.push(`/movie/${link.movie!.id}`) : undefined}
                      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', width: 140, flexShrink: 0, cursor: link.movie ? 'pointer' : 'default' }}
                    >
                      <LineupPoster src={link.movie?.posterUrl} alt={normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)} />
                      <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                        {normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)}
                      </span>
                    </div>
                  ))}
                </div>
                {lineupCanL && <ScrollNavButton direction="left" onClick={() => scrollLineup(-1)} />}
                {lineupCanR && <ScrollNavButton direction="right" onClick={() => scrollLineup(1)} />}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--gutter)' }}>
                  {(lineupExpanded ? festival.movies : festival.movies.slice(0, LINEUP_COLLAPSED_COUNT)).map((link) => (
                    <div
                      key={link.id}
                      onClick={link.movie ? () => router.push(`/movie/${link.movie!.id}`) : undefined}
                      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', cursor: link.movie ? 'pointer' : 'default' }}
                    >
                      <LineupPoster src={link.movie?.posterUrl} alt={normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)} />
                      <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                        {normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)}
                      </span>
                    </div>
                  ))}
                </div>
                {festival.movies.length > LINEUP_COLLAPSED_COUNT && (
                  <Button variant="tertiary" size="sm" onClick={() => setLineupExpanded((v) => !v)} style={{ width: 'calc(100% - var(--gutter) - var(--gutter))', maxWidth: 360, margin: 'var(--spacing-1) auto 0' }}>
                    {lineupExpanded ? '접기' : '더보기'}
                    <Icon name="chevron-down" size={14} strokeWidth={1.75} color="currentColor" style={{ transform: lineupExpanded ? 'rotate(180deg)' : undefined }} />
                  </Button>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* 라이트박스 — body 포탈: transform 있는 조상이 fixed의 컨테이닝 블록이 되어 잘리는 걸 피한다 */}
      {lightboxOpen && currentTimetable && createPortal(
        <div
          onClick={() => setLightboxOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-6)' }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="닫기"
            style={{ position: 'absolute', top: 'var(--spacing-4)', right: 'var(--spacing-4)', width: 36, height: 36, borderRadius: 'var(--radius-pill)', backgroundColor: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 'auto', color: 'var(--color-on-accent)' }}
          >
            <Icon name="x" size={18} strokeWidth={1.75} className="text-current" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentTimetable.imageUrl}
            alt={timetableCaption(currentTimetable.dayDate, currentTimetable.label)}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', touchAction: 'pinch-zoom' }}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}
