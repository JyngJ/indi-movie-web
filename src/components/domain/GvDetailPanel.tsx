'use client'

import type { GvEvent } from '@/data/gv-events'

const GV_AMBER = '#D97706'

interface GvDetailPanelProps {
  ev: GvEvent
  onClose: () => void
  onCloseAll?: () => void
}

export function GvDetailPanel({ ev, onClose, onCloseAll }: GvDetailPanelProps) {
  const statusColor = ev.status === '매진' ? '#b91c1c' : ev.status === '매진 임박' ? '#ea580c' : '#16a34a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-surface-card)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 12px 12px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {/* 뒤로 — 영화관 상세로 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="뒤로"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--color-text-body)', flexShrink: 0, padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 브레드크럼 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <span style={{
            fontSize: 16, fontWeight: 700, color: 'var(--color-text-sub)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1,
          }}>{ev.theaterName}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-caption)', flexShrink: 0 }}>/</span>
          <span style={{
            background: GV_AMBER, color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: 3,
            padding: '2px 5px', letterSpacing: '0.3px', lineHeight: 1.4, flexShrink: 0,
          }}>{ev.type}</span>
        </div>

        {/* 닫기 — 시트 전체 닫기 */}
        {onCloseAll && (
          <button
            type="button"
            onClick={onCloseAll}
            aria-label="닫기"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--color-text-body)', flexShrink: 0, padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="themed-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Hero — poster + movie info */}
        <div style={{ display: 'flex', gap: 14, padding: '16px 16px 16px' }}>
          <div style={{
            width: 80, height: 120, borderRadius: 8, flexShrink: 0,
            background: `oklch(35% 0.08 ${ev.hue})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
          }}>
            <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
              {ev.label}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {ev.movie}
            </h2>
            {ev.movieNote && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
                {ev.movieNote}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-block',
                fontSize: 11, fontWeight: 600, color: statusColor,
                background: `${statusColor}18`, borderRadius: 4, padding: '2px 7px',
              }}>
                {ev.status}
              </span>
              {ev.status === '매진 임박' && ev.seatTotal != null && ev.seatAvailable != null && (
                <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>
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
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.5px', marginBottom: 10 }}>
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
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', letterSpacing: '0.5px', marginBottom: 8 }}>
              안내
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.65 }}>
              {ev.gvNote}
            </p>
          </div>
        )}

        {/* Spacer for footer */}
        <div style={{ height: 88 }} />
      </div>

      {/* CTA footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px max(16px, env(safe-area-inset-bottom))',
        background: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: 8,
      }}>
        {ev.bookingUrl ? (
          <a
            href={ev.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, height: 50,
              background: 'var(--color-primary-base)',
              color: '#fff', borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.2px',
            }}
          >
            예매하러 가기
          </a>
        ) : (
          <div style={{
            flex: 1, height: 50,
            background: 'var(--color-border)',
            color: 'var(--color-text-caption)', borderRadius: 'var(--radius-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 600,
          }}>
            예매 준비 중
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', width: 28, flexShrink: 0 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--color-primary-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, opacity: 0.85,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {name.charAt(0)}
        </span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--color-text-body)' }}>{name}</span>
    </div>
  )
}
