import type { GvEvent } from '@/data/gv-events'

const GV_AMBER = '#D97706'

export const GV_PIN_W = 148
export const GV_PIN_CALLOUT_H = 66
export const GV_PIN_STEM_H = 32
export const GV_PIN_DOT_D = 10
export const GV_PIN_H = GV_PIN_CALLOUT_H + GV_PIN_STEM_H + GV_PIN_DOT_D

interface GvPinProps {
  ev: GvEvent
  selected?: boolean
}

// Pure function — no hooks. Safe for renderToStaticMarkup.
export function GvPin({ ev, selected = false }: GvPinProps) {
  const firstGuest = ev.guest?.split(' · ')[0] ?? ''

  const bubbleBorder = selected
    ? '1.5px solid var(--color-primary-base)'
    : '1px solid var(--color-border)'
  const bubbleShadow = selected
    ? '0 4px 20px rgba(20,15,10,0.18),0 0 0 2.5px rgba(74,99,128,0.2)'
    : '0 2px 8px rgba(20,15,10,0.10)'
  const stemColor = selected ? 'var(--color-primary-base)' : 'var(--color-border)'
  const dotBg = selected ? 'var(--color-primary-base)' : 'var(--color-text-caption)'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: GV_PIN_W,
    }}>
      {/* Callout bubble */}
      <div style={{
        display: 'flex',
        width: GV_PIN_W,
        height: GV_PIN_CALLOUT_H,
        background: 'var(--color-surface-card)',
        border: bubbleBorder,
        borderRadius: 11,
        boxShadow: bubbleShadow,
        overflow: 'hidden',
      }}>
        {/* Poster placeholder */}
        <div style={{
          width: 30,
          height: 44,
          margin: '11px 0 11px 8px',
          background: `oklch(35% 0.08 ${ev.hue})`,
          borderRadius: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}>
            {ev.label}
          </span>
        </div>
        {/* Content */}
        <div style={{
          flex: 1,
          padding: '9px 8px 9px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minWidth: 0,
        }}>
          {/* Badge + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              background: GV_AMBER,
              color: '#fff',
              fontSize: 8,
              fontWeight: 800,
              borderRadius: 3,
              padding: '1.5px 4px',
              letterSpacing: '0.3px',
              lineHeight: 1.3,
              flexShrink: 0,
            }}>{ev.type}</span>
            <span style={{
              fontSize: 9,
              color: 'var(--color-text-caption)',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{ev.time}</span>
          </div>
          {/* Movie title */}
          <div style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{ev.movie}</div>
          {/* Guest */}
          <div style={{
            fontSize: 9.5,
            color: 'var(--color-text-caption)',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{firstGuest}</div>
        </div>
      </div>
      {/* Stem */}
      <div style={{
        width: 1.5,
        height: GV_PIN_STEM_H,
        background: stemColor,
      }} />
      {/* Dot */}
      <div style={{
        width: GV_PIN_DOT_D,
        height: GV_PIN_DOT_D,
        borderRadius: '50%',
        background: dotBg,
        border: '2px solid var(--color-surface-bg, #fff)',
      }} />
    </div>
  )
}
