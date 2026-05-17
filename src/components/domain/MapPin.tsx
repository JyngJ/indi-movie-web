'use client'

type PinKind = 'indie' | 'cgv' | 'mega' | 'lotte'

interface MapPinProps {
  kind?: PinKind
  selected?: boolean
  label?: string
  labelOffset?: { x: number; y: number }
  onClick?: () => void
  dimmed?: boolean
  isDark?: boolean
}

const PIN_COLORS: Record<PinKind, { dot: string; aura: string }> = {
  indie: { dot: 'var(--color-primary-base)', aura: 'rgba(74,99,128,0.25)' },
  cgv:   { dot: 'var(--color-cgv)',          aura: 'rgba(227,6,19,0.25)' },
  mega:  { dot: 'var(--color-mega)',         aura: 'rgba(108,30,159,0.25)' },
  lotte: { dot: 'var(--color-lotte)',        aura: 'rgba(237,28,36,0.25)' },
}

const DOT = 22
const AURA = 44

const DIMMED_DOT_LIGHT = '#6b7280'
const DIMMED_DOT_DARK = '#71717a'

export function MapPin({ kind = 'indie', selected = false, label, labelOffset, onClick, dimmed = false, isDark = false }: MapPinProps) {
  const { dot: activeDot, aura } = PIN_COLORS[kind]
  const dot = dimmed ? (isDark ? DIMMED_DOT_DARK : DIMMED_DOT_LIGHT) : activeDot
  const tailShiftX = labelOffset ? Math.max(-36, Math.min(36, -labelOffset.x)) : 0

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* 오라 — dot 뒤에 absolute로 표시, 레이아웃 영향 없음 */}
      {selected && (
        <div style={{
          position: 'absolute',
          width: AURA,
          height: AURA,
          bottom: -((AURA - DOT) / 2),
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          backgroundColor: aura,
          zIndex: 0,
        }} />
      )}

      {/* 라벨 */}
      {label && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          transform: labelOffset ? `translate(${labelOffset.x}px, ${labelOffset.y}px)` : undefined,
        }}>
          {/* 라벨 꼬리 */}
          <div style={{
            position: 'absolute',
            width: 10,
            height: 10,
            backgroundColor: selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
            borderRight: selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)',
            borderBottom: selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)',
            borderBottomRightRadius: 2,
            bottom: -5,
            left: `calc(50% + ${tailShiftX}px)`,
            transform: 'translateX(-50%) rotate(45deg)',
            zIndex: 0,
            pointerEvents: 'none',
          }} />
          {/* 라벨 버블 */}
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            padding: '3px 7px',
            borderRadius: 5,
            color: selected ? '#fff' : 'var(--color-text-primary)',
            backgroundColor: selected ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
            border: selected ? '1.5px solid rgba(0,0,0,0.14)' : '1.5px solid var(--color-border)',
            boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            position: 'relative',
            zIndex: 1,
          }}>
            {label}
          </div>
        </div>
      )}

      {/* dot */}
      <div style={{
        width: DOT,
        height: DOT,
        borderRadius: '50%',
        backgroundColor: dot,
        border: selected ? '2.5px solid #fff' : '2px solid var(--color-surface-bg)',
        boxShadow: selected
          ? '0 2px 8px rgba(0,0,0,0.28), 0 0 0 2.5px var(--color-primary-base)'
          : '0 2px 6px rgba(0,0,0,0.18)',
        position: 'relative',
        zIndex: 1,
      }} />
    </div>
  )
}
