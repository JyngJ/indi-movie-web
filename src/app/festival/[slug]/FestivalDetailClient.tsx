'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ExternalLink, MapPin, X, ZoomIn } from 'lucide-react'
import { SectionHeader, ScrollNavButton } from '@/components/primitives'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { getFestivalDateLabel, getFestivalStatus, type FestivalStatus } from '@/lib/festival/status'
import { toKstIsoDate } from '@/lib/date'
import type { FestivalDetail } from '@/types/festival'

// http:// 원본(예: jiff.kr — HTTPS 인증서가 깨져있음)을 브라우저가 직접 요청하면 mixed-content
// 자동 https 승격 때문에 깨진다. Next 이미지 최적화 엔드포인트를 거치면 서버가 대신
// http로 fetch해서 우리 도메인(https)으로 내려주므로 브라우저 정책을 안 탄다.
function proxiedImageUrl(url: string, width: number) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
}

const STATUS_LABEL: Record<FestivalStatus, string> = { upcoming: '예정', ongoing: '진행중', ended: '종료' }
const STATUS_COLOR: Record<FestivalStatus, string> = { upcoming: '#D97706', ongoing: '#16A34A', ended: 'var(--color-text-caption)' }

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

/* ── 라인업 그리드 포스터 — PosterThumb은 고정 px 크기라 반응형 그리드엔 안 맞아 별도 작성 ── */
function LineupPoster({ src, alt }: { src?: string; alt: string }) {
  return (
    <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', position: 'relative', backgroundColor: 'var(--color-surface-raised)' }}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="140px" style={{ objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>
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
  useEffect(() => setMounted(true), [])
  const isDesktopLayout = useIsDesktopLayout()
  const isDesktop = mounted && isDesktopLayout
  // 한국 서비스라 항상 KST 기준 "오늘" — formatLocalDate는 SSR(Vercel UTC)에서
  // 자정~오전 9시 사이 날짜가 하루 밀리는 버그가 있어 toKstIsoDate를 쓴다.
  const today = toKstIsoDate(new Date())
  const status = getFestivalStatus(festival.startDate, festival.endDate, today)
  const dateLabel = getFestivalDateLabel(status, festival.startDate, festival.endDate, today)

  const [ttIndex, setTtIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lineupExpanded, setLineupExpanded] = useState(false)
  const timetables = festival.timetables
  const currentTimetable = timetables[ttIndex]

  const firstLinkedTheaterId = festival.theaters.find((t) => t.theaterId)?.theaterId

  const sectionStyle: React.CSSProperties = { paddingTop: isDesktop ? 48 : 32 }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-surface-bg)', paddingBottom: 40 }}>
      {/* 상단 NavBar — 이 페이지는 (tabs) 레이아웃 밖이라 GlobalNav(탭바/레일)이 안 뜬다.
          films/theater/[id]와 같은 패턴: 뒤로가기 + 브레드크럼 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: 12, maxWidth: isDesktop ? 1200 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          <button
            onClick={() => router.back()}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}
            aria-label="뒤로"
          >
            <ChevronLeft size={22} strokeWidth={1.75} color="currentColor" />
          </button>
          <button onClick={() => router.push('/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 13, minHeight: 'auto', padding: 0, flexShrink: 0 }}>영화</button>
          <span style={{ color: 'var(--color-text-caption)', fontSize: 13, flexShrink: 0 }}>&gt;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{festival.name}</span>
        </div>
      </div>

      {/* 배너 — 잘리지 않게 원본 비율 그대로 가로에 맞춤(크롭 없음). fill+objectFit:cover였을 땐
          21:4처럼 아주 납작한 배너가 16:9 박스에 눌려 좌우가 크게 잘렸다. */}
      {festival.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxiedImageUrl(festival.bannerUrl, 1920)}
          alt={festival.name}
          style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: 'var(--color-surface-raised)' }}
        />
      ) : (
        <div style={{ width: '100%', aspectRatio: '21/4', position: 'relative', backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', textAlign: 'center' }}>
            {festival.name}
          </span>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', backgroundColor: STATUS_COLOR[status], padding: '3px 10px', borderRadius: 99 }}>
            {STATUS_LABEL[status]}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-caption)', fontWeight: 600 }}>{dateLabel}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: isDesktop ? 26 : 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          {festival.name}
        </h1>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-caption)' }}>
          <MapPin size={14} strokeWidth={1.75} color="currentColor" />
          {festival.region} · {festival.city}
          {festival.venueText ? ` · ${festival.venueText}` : ''}
        </div>

        {/* CTA */}
        {(festival.linkUrl || firstLinkedTheaterId) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {festival.linkUrl && (
              <a
                href={festival.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 44, borderRadius: 10, backgroundColor: 'var(--color-primary-base)', color: '#fff',
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}
              >
                공식 사이트 <ExternalLink size={16} strokeWidth={1.75} color="currentColor" />
              </a>
            )}
            {firstLinkedTheaterId && (
              <button
                onClick={() => router.push(`/?theater=${firstLinkedTheaterId}`)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 44, borderRadius: 10, backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)', color: 'var(--color-text-body)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 'auto',
                }}
              >
                <MapPin size={16} strokeWidth={1.75} color="currentColor" /> 지도에서 보기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 상영 시간표 캐러셀 — 0장이면 섹션 자체 숨김 */}
      {timetables.length > 0 && currentTimetable && (
        <section style={sectionStyle}>
          <SectionHeader
            title="상영 시간표"
            description="영화제 공식 배포 기준 — 정확한 회차는 상영관 상세(실시간 정보)를 확인하세요"
            isDesktop={isDesktop}
          />
          <div style={{ margin: '12px 16px' }}>
            {timetables.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>
                  {ttIndex + 1} / {timetables.length}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
                  {timetableCaption(currentTimetable.dayDate, currentTimetable.label)}
                </span>
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setLightboxOpen(true)}
                style={{
                  position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 12,
                  overflow: 'hidden', cursor: 'zoom-in', backgroundColor: 'var(--color-surface-raised)',
                }}
              >
                <Image src={currentTimetable.imageUrl} alt={timetableCaption(currentTimetable.dayDate, currentTimetable.label)} fill sizes="600px" style={{ objectFit: 'contain' }} />
                <div style={{
                  position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ZoomIn size={16} strokeWidth={1.75} color="#fff" />
                </div>
              </div>
              {timetables.length > 1 && (
                <>
                  <ScrollNavButton
                    direction="left"
                    size={36}
                    style={{ boxShadow: 'none' }}
                    onClick={() => setTtIndex((i) => (i - 1 + timetables.length) % timetables.length)}
                  />
                  <ScrollNavButton
                    direction="right"
                    size={36}
                    style={{ boxShadow: 'none' }}
                    onClick={() => setTtIndex((i) => (i + 1) % timetables.length)}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 상영작 라인업 */}
      <section style={sectionStyle}>
        <SectionHeader title={`상영작 라인업${festival.movies.length > 0 ? ` (${festival.movies.length}편)` : ''}`} isDesktop={isDesktop} />
        {festival.movies.length === 0 ? (
          <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-caption)' }}>
            라인업 준비 중
          </p>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(3, 1fr)',
              gap: isDesktop ? 16 : 10, padding: '12px 16px',
            }}>
              {(lineupExpanded ? festival.movies : festival.movies.slice(0, LINEUP_COLLAPSED_COUNT)).map((link) => (
                <div
                  key={link.id}
                  onClick={link.movie ? () => router.push(`/films/movie/${link.movie!.id}`) : undefined}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: link.movie ? 'pointer' : 'default' }}
                >
                  <LineupPoster src={link.movie?.posterUrl} alt={normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                    {normalizeTitle(link.movie?.title ?? link.movieTitleSnapshot)}
                  </span>
                </div>
              ))}
            </div>
            {festival.movies.length > LINEUP_COLLAPSED_COUNT && (
              <button
                type="button"
                onClick={() => setLineupExpanded((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  width: 'calc(100% - 32px)', margin: '4px 16px 0', padding: '8px 0',
                  border: 'none', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-raised)',
                  color: 'var(--color-text-caption)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 'auto',
                }}
              >
                {lineupExpanded ? '접기' : '더보기'}
                <ChevronDown size={14} strokeWidth={1.75} color="currentColor" style={{ transform: lineupExpanded ? 'rotate(180deg)' : undefined }} />
              </button>
            )}
          </>
        )}
      </section>

      {/* 상영관 */}
      <section style={sectionStyle}>
        <SectionHeader title={`상영관${festival.theaters.length > 0 ? ` (${festival.theaters.length}곳)` : ''}`} isDesktop={isDesktop} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {festival.theaters.map((link) => (
            link.theaterId && link.theater ? (
              <button
                key={link.id}
                onClick={() => router.push(`/films/theater/${link.theaterId}`)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                  borderRadius: 10, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-card)',
                  cursor: 'pointer', textAlign: 'left', minHeight: 'auto',
                }}
              >
                <MapPin size={16} strokeWidth={1.75} color="var(--color-primary-base)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{link.theater.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-caption)', marginTop: 2 }}>{link.theater.address}</div>
                </div>
              </button>
            ) : (
              <div
                key={link.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                  borderRadius: 10, border: '1px dashed var(--color-border)',
                }}
              >
                <MapPin size={16} strokeWidth={1.75} color="var(--color-text-caption)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 14, color: 'var(--color-text-body)' }}>{link.venueText ?? '임시 상영장'}</div>
              </div>
            )
          ))}
        </div>
      </section>

      {/* 소개 */}
      {festival.description && (
        <section style={sectionStyle}>
          <SectionHeader title="소개" isDesktop={isDesktop} />
          <p style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-body)', whiteSpace: 'pre-wrap' }}>
            {festival.description}
          </p>
        </section>
      )}

      {/* 라이트박스 — 기존 극장 상세/CurationSectionRow의 body 포탈 패턴과 동일:
          transform 있는 조상(슬라이드 패널)이 fixed의 컨테이닝 블록이 되어 잘리는 걸 피하려고
          document.body로 포탈한다. */}
      {lightboxOpen && currentTimetable && createPortal(
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="닫기"
            style={{
              position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 'auto',
            }}
          >
            <X size={18} strokeWidth={1.75} color="#fff" />
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
