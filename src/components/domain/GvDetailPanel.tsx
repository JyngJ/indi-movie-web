'use client'

import type { GvEvent } from '@/data/gv-events'
import { gvEventTypeColor } from '@/lib/gv/adapter'
import { trackEvent } from '@/lib/analytics/client'
import { shareAndTrack } from '@/lib/analytics/shareTracking'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { IconButton } from '@/components/primitives'
import { BookingCtaButton, ShareScheduleButton } from './booking/BookingActions'

interface GvDetailPanelProps {
  ev: GvEvent
  onClose: () => void
  onCloseAll?: () => void
  /** 데스크톱 독/플로팅 패널 모드 — true면 하단 탭바가 없어 GLOBAL_NAV_MOBILE_HEIGHT 여백이 필요 없다 */
  panelMode?: boolean
}

export function GvDetailPanel({ ev, onClose, onCloseAll, panelMode }: GvDetailPanelProps) {
  const statusColor = ev.status === '매진' ? 'var(--color-error)' : ev.status === '매진 임박' ? 'var(--color-warning)' : 'var(--color-success)'

  const shareEvent = () => {
    // '/map' — 지도 파라미터는 '/map'에서만 마운트되는 MapView가 읽는다 (#262 이후)
    const url = new URL('/map', window.location.origin)
    if (ev.theaterId) url.searchParams.set('theater', ev.theaterId)
    if (ev.movieId) url.searchParams.set('movie', ev.movieId)
    if (ev.eventDate) url.searchParams.set('date', ev.eventDate)

    void shareAndTrack({
      payload: { title: `${ev.theaterName} - ${ev.movie}`, url: url.toString() },
      source: 'gv_detail',
      scope: 'page',
      properties: {
        // 이름만 실으면 다른 이벤트와 조인이 안 된다 — 아이디도 함께 남긴다
        theater_id: ev.theaterId ?? null,
        theater_name: ev.theaterName,
        movie_id: ev.movieId ?? null,
        movie_title: ev.movie,
        gv_event_id: ev.id,
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-surface-card)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px var(--gutter-md)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {/* 뒤로 — 영화관 상세로 */}
        <IconButton variant="ghost" size={32} onClick={onClose} aria-label="뒤로가기">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>

        {/* 브레드크럼 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          <span style={{
            fontSize: 16, fontWeight: 700, color: 'var(--color-text-sub)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1,
          }}>{ev.theaterName}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-caption)', flexShrink: 0 }}>/</span>
          <span style={{
            background: gvEventTypeColor(ev.type), color: 'var(--color-on-accent)',
            fontSize: 'var(--text-badge)', fontWeight: 800, borderRadius: 4,
            padding: 4, letterSpacing: '0.3px', lineHeight: 1, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{ev.type}</span>
        </div>

        {/* 닫기 — 시트 전체 닫기 */}
        {onCloseAll && (
          <IconButton variant="ghost" size={32} onClick={onCloseAll} aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}
      </div>

      {/* Scrollable body */}
      <div className="themed-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Hero — poster + movie info */}
        <div style={{ display: 'flex', gap: 16, padding: '16px var(--gutter)' }}>
          <div style={{
            width: 80, height: 120, borderRadius: 8, flexShrink: 0,
            background: `oklch(35% 0.08 ${ev.hue})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
          }}>
            <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
              {ev.label}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {ev.movie}
            </h2>
            {ev.movieNote && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
                {ev.movieNote}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                fontSize: 'var(--text-badge)', fontWeight: 600, color: statusColor,
                background: `${statusColor}18`, borderRadius: 4, padding: '4px 8px',
              }}>
                {ev.status}
              </span>
              {ev.status === '매진 임박' && ev.seatTotal != null && ev.seatAvailable != null && (
                <span style={{ fontSize: 'var(--text-badge)', color: statusColor, fontWeight: 500 }}>
                  {ev.seatTotal}석 중 {ev.seatAvailable}석 남음
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <InfoRow label="일시" value={ev.time} />
          <InfoRow label="장소" value={ev.theaterName} last />
        </div>

        {/* Guests */}
        {ev.guest && (
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px var(--gutter)' }}>
            <div style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.5px', marginBottom: 12 }}>
              참석 게스트
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ev.guest.split(' · ').map((g) => (
                <GuestRow key={g} name={g} />
              ))}
            </div>
          </div>
        )}

        {/* GV note */}
        {ev.gvNote && (
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px var(--gutter)' }}>
            <div style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.5px', marginBottom: 8 }}>
              안내
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {ev.gvNote}
            </p>
          </div>
        )}

        {/* Spacer for footer */}
        <div style={{ height: panelMode ? 88 : 88 + GLOBAL_NAV_MOBILE_HEIGHT }} />
      </div>

      {/* CTA footer — 모바일에서는 하단 탭바에 가리지 않도록 GLOBAL_NAV_MOBILE_HEIGHT만큼 띄운다 */}
      <div style={{
        position: 'absolute',
        bottom: panelMode ? 0 : GLOBAL_NAV_MOBILE_HEIGHT,
        left: 0, right: 0,
        padding: '12px var(--gutter) max(16px, env(safe-area-inset-bottom))',
        background: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: 12,
      }}>
        <ShareScheduleButton variant="bar" onClick={shareEvent} />
        <BookingCtaButton
          variant="bar"
          bookingUrl={ev.bookingUrl}
          onClick={() => trackEvent('booking clicked', {
            theater_name: ev.theaterName,
            movie_title: ev.movie,
            gv_event_id: ev.id,
            source: 'gv_detail',
          })}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px var(--gutter)',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)', width: 28, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-body)', flex: 1 }}>
        {value}
      </span>
    </div>
  )
}

function GuestRow({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--color-primary-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, opacity: 0.85,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-on-accent)' }}>
          {name.charAt(0)}
        </span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--color-text-body)' }}>{name}</span>
    </div>
  )
}
