'use client'

type PinKind = 'indie' | 'cgv' | 'mega' | 'lotte'

interface MapPinProps {
  kind?: PinKind
  selected?: boolean
  label?: string
  onClick?: () => void
}

const PIN_DOT_COLORS: Record<PinKind, string> = {
  indie: 'var(--color-primary-base)',   /* #4A6380 */
  cgv:   'var(--color-cgv)',            /* #E30613 */
  mega:  'var(--color-mega)',           /* #6C1E9F */
  lotte: 'var(--color-lotte)',          /* #ED1C24 */
}

const PIN_RING_COLORS: Record<PinKind, string> = {
  indie: 'rgba(74,99,128,0.25)',
  cgv:   'rgba(227,6,19,0.25)',
  mega:  'rgba(108,30,159,0.25)',
  lotte: 'rgba(237,28,36,0.25)',
}

export function MapPin({ kind = 'indie', selected = false, label, onClick }: MapPinProps) {
  const containerSize = selected
    ? 'var(--comp-pin-selected-size)'   /* 44px */
    : 'var(--comp-pin-base-size)'       /* 28px */

  return (
    <div
      className="inline-flex flex-col items-center gap-1"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {selected && (
          <div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: PIN_RING_COLORS[kind] }}
          />
        )}
        <div
          className="rounded-full"
          style={{
            width: 'var(--comp-pin-dot-size)',    /* 22px */
            height: 'var(--comp-pin-dot-size)',
            backgroundColor: PIN_DOT_COLORS[kind],
            border: '2px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        />
      </div>

      {label && (
        <div
          className="text-[11px] font-semibold whitespace-nowrap"
          style={{
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',   /* 4px */
            color: '#1A1714',
            backgroundColor: 'rgba(255,255,255,0.85)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
