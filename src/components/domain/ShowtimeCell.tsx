'use client'

export type ShowtimeKind = 'normal' | 'low' | 'soldout' | 'late' | 'nowplaying' | 'ended'

interface ShowtimeCellProps {
  startTime: string
  endTime: string
  seatAvailable: number
  seatTotal: number
  promo?: string
  kind?: ShowtimeKind
  selected?: boolean
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onUnavailableClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function ShowtimeCell({
  startTime, endTime, seatAvailable, seatTotal, promo,
  kind = 'normal', selected = false, onClick, onUnavailableClick,
}: ShowtimeCellProps) {
  const isSoldout    = kind === 'soldout'
  const isLate       = kind === 'late'
  const isLow        = kind === 'low'
  const isNowPlaying = kind === 'nowplaying'
  const isEnded      = kind === 'ended'
  const isPast       = isNowPlaying || isEnded
  const isClickable  = onClick && !isSoldout && !isPast

  const seatColor = isSoldout || isEnded
    ? 'var(--color-text-placeholder)'
    : isLow
    ? 'var(--color-warning)'
    : isNowPlaying
    ? 'var(--color-primary-base)'
    : 'var(--color-primary-base)'

  return (
    <div
      style={{
        minWidth: 0,
        paddingTop: 'var(--comp-showtime-p)',
        paddingBottom: 'var(--comp-showtime-p)',
        paddingLeft: 'var(--comp-showtime-p)',
        paddingRight: 'var(--comp-showtime-p)',
        borderRadius: 'var(--comp-showtime-radius)',
        /* 2.0 반전 수법: 죽은 회차 = 틴트로 가라앉히고, 살아있는 회차만 흰 카드로 띄움 */
        backgroundColor: (isSoldout || isEnded)
          ? 'var(--color-surface-raised)'
          : selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-card)',
        border: selected
          ? '1.5px solid var(--color-primary-base)'
          : (isSoldout || isEnded) ? '1px solid transparent' : '1px solid var(--color-border)',
        position: 'relative',
        fontFamily: 'var(--font-sans)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'border-color 150ms ease, background-color 150ms ease',
      }}
      onClick={isClickable ? onClick : (isSoldout || isPast) ? onUnavailableClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >

      {/* 시간 */}
      <div className="flex items-baseline gap-1 flex-wrap" style={{ color: (isSoldout || isEnded) ? 'var(--color-text-placeholder)' : 'var(--color-text-primary)' }}>
        <span style={{
          fontSize: 'var(--text-time)', fontWeight: 700, fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap',
          textDecoration: isEnded ? 'line-through' : 'none',
        }}>
          {startTime}
        </span>
        {endTime && (
          <span style={{ fontSize: 10, color: 'var(--color-text-sub)', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
            -{endTime}
          </span>
        )}
        {/* 2.0: 심야 = 시간 줄 인라인 달 — 배지(라벨+배경)는 정보 중복이라 강등 */}
        {isLate && !isPast && (
          <svg width={11} height={11} viewBox="0 0 24 24" fill="var(--color-primary-base)" style={{ flexShrink: 0 }} aria-label="심야 상영">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </div>

      {/* 잔여석 / 상태 */}
      <div
        className="mt-[6px]"
        style={{
          fontSize: 'var(--text-seat)',
          fontFeatureSettings: '"tnum"',
          whiteSpace: 'nowrap',
        }}
      >
        {isNowPlaying ? (
          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>상영중</span>
        ) : isEnded ? (
          <span style={{ color: 'var(--color-text-caption)', fontWeight: 600 }}>상영 완료</span>
        ) : (
          <>
            <span style={{ color: seatColor, fontWeight: 600, textDecoration: isSoldout ? 'line-through' : 'none' }}>{seatAvailable}</span>
            <span style={{ color: 'var(--color-text-sub)', textDecoration: isSoldout ? 'line-through' : 'none' }}>/{seatTotal}석</span>
          </>
        )}
      </div>

      {promo && (
        <div className="mt-[6px]" style={{ fontSize: 10, color: 'var(--color-primary-base)', fontWeight: 500 }}>
          {promo}
        </div>
      )}
    </div>
  )
}
