'use client'

type PinKind = 'indie' | 'cgv' | 'mega' | 'lotte'

interface MapPinProps {
  kind?: PinKind
  selected?: boolean
  label?: string
  onClick?: () => void
}

const PIN_COLORS: Record<PinKind, { dot: string; aura: string }> = {
  indie: { dot: 'var(--color-primary-base)', aura: 'rgba(74,99,128,0.25)' },
  cgv:   { dot: 'var(--color-cgv)',          aura: 'rgba(227,6,19,0.25)' },
  mega:  { dot: 'var(--color-mega)',         aura: 'rgba(108,30,159,0.25)' },
  lotte: { dot: 'var(--color-lotte)',        aura: 'rgba(237,28,36,0.25)' },
}

const DOT = 22
const AURA = 44

export function MapPin({ kind = 'indie', selected = false, label, onClick }: MapPinProps) {
  const { dot, aura } = PIN_COLORS[kind]

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
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          padding: '2px 6px',
          borderRadius: 4,
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface-card)',
          border: '1.5px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          zIndex: 1,
          isolation: 'isolate',
        }}>
          <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
        </div>
      )}

      {/* dot */}
      <div style={{
        width: DOT,
        height: DOT,
        borderRadius: '50%',
        backgroundColor: dot,
        border: '2px solid var(--color-surface-bg)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        position: 'relative',
        zIndex: 1,
      }} />
    </div>
  )
}
