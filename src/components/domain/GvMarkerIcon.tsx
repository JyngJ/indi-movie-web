import type { GvEvent } from '@/data/gv-events'
import { GvBottomSlot, GV_MARKER_STEM_H, GV_MARKER_DOT_D } from './GvPinSlots'

const GV_AMBER = '#D97706'

interface GvMarkerIconProps {
  events: GvEvent[]
  zoom: number
  expanded: boolean
  theaterName: string
  selected?: boolean
  slotW: number
}

// Pure function — no hooks. Safe for renderToStaticMarkup.
export function GvMarkerIcon({ events, zoom, expanded, theaterName, selected, slotW }: GvMarkerIconProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: slotW, overflow: 'visible' }}>
      <GvBottomSlot events={events} zoom={zoom} expanded={expanded} theaterName={theaterName} selected={selected} />
      {/* stem */}
      <div style={{ width: 1.5, height: GV_MARKER_STEM_H, background: GV_AMBER, opacity: 0.75 }} />
      {/* dot */}
      <div style={{
        width: GV_MARKER_DOT_D,
        height: GV_MARKER_DOT_D,
        borderRadius: '50%',
        background: GV_AMBER,
        border: '2px solid var(--color-surface-bg, #fff)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}
