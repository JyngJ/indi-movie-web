import type { GvEvent } from '@/data/gv-events'

const GV_AMBER = '#D97706'
const SLOT_W = 130

export const GV_MARKER_STEM_H = 28
export const GV_MARKER_DOT_D = 8

// Heights/widths must match actual rendered sizes — used for iconAnchor offset calculation
export const GV_CHIP_H = 22
export const GV_STACK_HDR_H = 32
export const GV_STACK_ROW_H = 50
export const GV_CALLOUT_H = 62
export const GV_CALLOUT_W = 148
export const GV_CALLOUT_GAP = 4
export const GV_CALLOUT_COL_GAP = 4  // horizontal gap between 2-column bubbles
export const GV_DS_CARD_H = 52
export const GV_DS_GAP = 6
export const GV_OVERFLOW_H = 24

function shouldStack(count: number, zoom: number, selected: boolean): boolean {
  return count > 1 && (zoom >= 15 || (zoom === 14 && selected))
}
function shouldTwoCol(count: number, zoom: number, selected: boolean): boolean {
  return count > 3 && shouldStack(count, zoom, selected)
}

// Zoom 15 → small, grows to full GV_CALLOUT size at zoom 18+
function calloutSize(zoom: number): { w: number; h: number } {
  if (zoom >= 18) return { w: GV_CALLOUT_W, h: GV_CALLOUT_H }
  if (zoom === 17) return { w: 136, h: 58 }
  if (zoom === 16) return { w: 124, h: 54 }
  if (zoom === 15) return { w: 112, h: 48 }
  return { w: GV_CALLOUT_W, h: GV_CALLOUT_H }
}

export function computeGvSlotH(count: number, zoom: number, expanded: boolean, selected = false): number {
  if (zoom <= 13) {
    if (!expanded) return GV_CHIP_H
    return GV_STACK_HDR_H + count * GV_STACK_ROW_H
  }
  const { h } = calloutSize(zoom)
  if (!shouldStack(count, zoom, selected)) return h
  if (shouldTwoCol(count, zoom, selected)) {
    const rows = Math.ceil(count / 2)
    return rows * h + (rows - 1) * GV_CALLOUT_GAP
  }
  return count * h + (count - 1) * GV_CALLOUT_GAP
}

export function computeGvSlotW(count: number, zoom: number, expanded: boolean, selected = false): number {
  if (zoom <= 13) return SLOT_W
  const { w } = calloutSize(zoom)
  if (shouldTwoCol(count, zoom, selected)) return w * 2 + GV_CALLOUT_COL_GAP
  return w
}

// ── Collapsed chip ────────────────────────────────────────────────
function GvCollapsedChip({ count, theaterName, selected }: { count: number; theaterName: string; selected?: boolean }) {
  return (
    <div
      data-gv-toggle={theaterName}
      style={{
        height: GV_CHIP_H,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px 0 5px',
        borderRadius: 12,
        background: GV_AMBER,
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 2px #fff, 0 0 0 4px #4A6380'
          : '0 1px 4px rgba(0,0,0,0.18)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>이벤트 {count}개</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 1 }}>·</span>
    </div>
  )
}

// ── Expanded stack row ─────────────────────────────────────────────
function GvStackRow({ ev }: { ev: GvEvent }) {
  const statusColor = ev.status === '매진' ? '#b91c1c' : ev.status === '매진 임박' ? '#ea580c' : '#16a34a'
  return (
    <div data-gv-row={ev.id} style={{
      display: 'flex',
      alignItems: 'center',
      height: GV_STACK_ROW_H,
      padding: '0 8px',
      gap: 7,
      cursor: 'pointer',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface-card)',
    }}>
      <div style={{
        width: 22, height: 32, borderRadius: 3, flexShrink: 0,
        background: `oklch(35% 0.08 ${ev.hue})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{ev.label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.movie}
        </div>
        <div style={{ fontSize: 9, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.guest?.split(' · ')[0]}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>{ev.time}</div>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: statusColor }}>● {ev.status}</div>
      </div>
    </div>
  )
}

// ── Expanded stack (header + rows) ────────────────────────────────
function GvExpandedStack({ events, theaterName }: { events: GvEvent[]; theaterName: string }) {
  return (
    <div style={{
      width: SLOT_W,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div data-gv-toggle={theaterName} style={{
        height: GV_STACK_HDR_H,
        display: 'flex', alignItems: 'center',
        padding: '0 8px',
        gap: 5,
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        background: `${GV_AMBER}14`,
      }}>
        <span style={{ fontSize: 8, fontWeight: 900, color: GV_AMBER, letterSpacing: '0.3px' }}>GV</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
          GV {events.length}개
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-caption)' }}>▲</span>
      </div>
      {events.map((ev) => <GvStackRow key={ev.id} ev={ev} />)}
    </div>
  )
}

// ── Zoom 14+ DS card ──────────────────────────────────────────────
function GvDsCard({ ev, first }: { ev: GvEvent; first: boolean }) {
  const statusColor = ev.status === '매진' ? '#b91c1c' : ev.status === '매진 임박' ? '#ea580c' : '#16a34a'
  return (
    <div data-gv-row={ev.id} style={{
      width: SLOT_W,
      height: GV_DS_CARD_H,
      display: 'flex', alignItems: 'center',
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      overflow: 'hidden',
      cursor: 'pointer',
      marginTop: first ? 0 : GV_DS_GAP,
    }}>
      <div style={{ width: 3, alignSelf: 'stretch', background: GV_AMBER, flexShrink: 0 }} />
      <div style={{
        width: 24, height: 34, margin: '0 6px 0 6px', borderRadius: 3, flexShrink: 0,
        background: `oklch(35% 0.08 ${ev.hue})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{ev.label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
          <span style={{ background: GV_AMBER, color: '#fff', fontSize: 7, fontWeight: 800, borderRadius: 2, padding: '0.5px 3px' }}>{ev.type}</span>
          <span style={{ fontSize: 9, color: 'var(--color-text-caption)' }}>{ev.time}</span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.movie}
        </div>
        <div style={{ fontSize: 9, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.guest?.split(' · ')[0]}
        </div>
      </div>
      <div style={{ padding: '0 8px 0 4px', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: statusColor }}>● {ev.status}</span>
      </div>
    </div>
  )
}

function GvOverflowChip({ count, theaterName }: { count: number; theaterName: string }) {
  return (
    <div data-gv-toggle={theaterName} style={{
      width: SLOT_W,
      height: GV_OVERFLOW_H,
      marginTop: GV_DS_GAP,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-sub)' }}>+ {count}개 더보기 ›</span>
    </div>
  )
}

// ── Zoom 14+ single event: original GvPin callout bubble shape ────
function GvCalloutBubble({ ev, extraCount = 0, selected, size }: { ev: GvEvent; extraCount?: number; selected?: boolean; size: { w: number; h: number } }) {
  const subLine = ev.subtitle ? `— ${ev.subtitle}` : (ev.guest?.split(' · ')[0] ?? '')
  const vPad = Math.max(5, Math.floor((size.h - 42) / 2))
  return (
    <div data-gv-row={ev.id} style={{ position: 'relative',
      display: 'flex',
      width: '100%',
      height: size.h,
      background: 'var(--color-surface-card)',
      border: selected ? '2px solid #4A6380' : '1px solid var(--color-border)',
      borderRadius: 9,
      boxShadow: selected
        ? '0 0 0 3px rgba(74,99,128,0.28), 0 2px 8px rgba(20,15,10,0.15)'
        : '0 1px 6px rgba(20,15,10,0.10)',
      overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {/* Content */}
      <div style={{ flex: 1, padding: `${vPad}px 7px ${vPad}px 10px`, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ background: GV_AMBER, color: '#fff', fontSize: 7.5, fontWeight: 800, borderRadius: 3, padding: '1px 3px', letterSpacing: '0.3px', lineHeight: 1.3, flexShrink: 0 }}>{ev.type}</span>
          <span style={{ fontSize: 8.5, color: 'var(--color-text-caption)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.time}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.movie}
        </div>
        {subLine && (
          <div style={{ fontSize: 9, color: 'var(--color-text-caption)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subLine}
          </div>
        )}
      </div>
      {extraCount > 0 && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: GV_AMBER,
          color: '#fff',
          fontSize: 9,
          fontWeight: 800,
          borderRadius: 8,
          padding: '1px 5px',
          lineHeight: 1.4,
        }}>
          +{extraCount}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────
interface GvBottomSlotProps {
  events: GvEvent[]
  zoom: number
  expanded: boolean
  theaterName: string
  selected?: boolean
}

// Pure function — no hooks. Safe for renderToStaticMarkup.
export function GvBottomSlot({ events, zoom, expanded, theaterName, selected }: GvBottomSlotProps) {
  if (zoom <= 13) {
    if (!expanded) return <GvCollapsedChip count={events.length} theaterName={theaterName} selected={selected} />
    return <GvExpandedStack events={events} theaterName={theaterName} />
  }
  const size = calloutSize(zoom)
  // zoom 15+: stack all bubbles; zoom 14 + selected: also stack; otherwise single + extra count
  const stack = (zoom >= 15 || (zoom === 14 && selected)) && events.length > 1
  if (stack) {
    const twoCol = events.length > 3
    const totalW = twoCol ? size.w * 2 + GV_CALLOUT_COL_GAP : size.w
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
        gap: twoCol ? `${GV_CALLOUT_GAP}px ${GV_CALLOUT_COL_GAP}px` : GV_CALLOUT_GAP,
        width: totalW,
      }}>
        {events.map((ev, i) => {
          const isLastOdd = twoCol && events.length % 2 === 1 && i === events.length - 1
          if (isLastOdd) return (
            <div key={ev.id} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: size.w }}><GvCalloutBubble ev={ev} selected={selected} size={size} /></div>
            </div>
          )
          return <GvCalloutBubble key={ev.id} ev={ev} selected={selected} size={size} />
        })}
      </div>
    )
  }
  return (
    <div style={{ width: size.w }}>
      <GvCalloutBubble ev={events[0]} extraCount={events.length - 1} selected={selected} size={size} />
    </div>
  )
}
