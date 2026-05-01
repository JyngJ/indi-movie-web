'use client'

export type ShowtimeKind = 'normal' | 'low' | 'soldout' | 'late'

interface ShowtimeCellProps {
  startTime: string
  endTime: string
  seatAvailable: number
  seatTotal: number
  screenName?: string
  promo?: string
  kind?: ShowtimeKind
  selected?: boolean
  onClick?: () => void
}

/* 인라인 배지 — 심야 전용 */
function InlineBadge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center flex-shrink-0"
      style={{
        height: 18,
        padding: '0 6px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: color,
        color: '#FFFFFF',
        fontSize: 'var(--text-badge)',
        fontWeight: 700,
        letterSpacing: '0.4px',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}

export function ShowtimeCell({
  startTime, endTime, seatAvailable, seatTotal, screenName, promo,
  kind = 'normal', selected = false, onClick,
}: ShowtimeCellProps) {
  const isSoldout   = kind === 'soldout'
  const isLate      = kind === 'late'
  const isLow       = kind === 'low'
  const isClickable = onClick && !isSoldout

  const seatColor = isSoldout
    ? 'var(--color-text-primary)'
    : isLow
    ? 'var(--color-warning)'
    : 'var(--color-primary-base)'

  return (
    <div
      style={{
        minWidth: 112,
        paddingTop: 'var(--comp-showtime-p)',
        paddingBottom: 'var(--comp-showtime-p)',
        paddingLeft: 'var(--comp-showtime-p)',
        paddingRight: 'var(--comp-showtime-p)',
        borderRadius: 'var(--comp-showtime-radius)',
        backgroundColor: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-card)',
        border: selected
          ? '1.5px solid var(--color-primary-base)'
          : '1px solid var(--color-border)',
        position: 'relative',
        opacity: isSoldout ? 0.45 : 1,
        fontFamily: 'var(--font-sans)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'border-color 150ms ease, background-color 150ms ease',
      }}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >

      {/* 시간 */}
      <div className="flex items-baseline gap-1" style={{ color: 'var(--color-text-primary)' }}>
        <span style={{ fontSize: 'var(--text-time)', fontWeight: 700, fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
          {startTime}
        </span>
        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-sub)', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
          -{endTime}
        </span>
      </div>

      {/* 잔여석 */}
      <div
        className="mt-[6px]"
        style={{
          fontSize: 'var(--text-seat)',
          fontFeatureSettings: '"tnum"',
          textDecoration: isSoldout ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: seatColor, fontWeight: 600 }}>{seatAvailable}</span>
        <span style={{ color: 'var(--color-text-sub)' }}>/{seatTotal}석</span>
      </div>

      {/* 상영관 + 심야 배지 같은 줄 */}
      {(screenName || isLate) && (
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          {screenName && (
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-sub)', flexShrink: 1, minWidth: 0 }}>
              {screenName}
            </span>
          )}
          {isLate && <InlineBadge text="심야" color="var(--color-primary-base)" />}
        </div>
      )}

      {/* 프로모션 */}
      {promo && (
        <div className="mt-[6px]" style={{ fontSize: 10, color: 'var(--color-primary-base)', fontWeight: 500 }}>
          {promo}
        </div>
      )}
    </div>
  )
}
