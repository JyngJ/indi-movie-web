import type { GvEvent } from '@/data/gv-events'
import { isFestivalGroup } from '@/data/gv-events'
import { gvEventTypeColor } from '@/lib/gv/adapter'

const GV_AMBER = '#D97706'
const GV_PURPLE = '#7C3AED'
const SLOT_W = 130

export const GV_MARKER_STEM_H = 28
export const GV_MARKER_DOT_D = 8

// Heights/widths must match actual rendered sizes — used for iconAnchor offset calculation
export const GV_CHIP_H = 22
export const GV_FESTIVAL_CHIP_H = 42 // 영화제 배지 — 제목/구분선/개수 3줄
export const GV_STACK_HDR_H = 32
export const GV_STACK_ROW_H = 50
export const GV_CALLOUT_H = 62
export const GV_CALLOUT_W = 148
export const GV_CALLOUT_GAP = 4
export const GV_CALLOUT_COL_GAP = 4  // horizontal gap between 2-column bubbles
export const GV_DS_CARD_H = 52
export const GV_DS_GAP = 6
export const GV_OVERFLOW_H = 24
// 콜아웃 그리드(zoom 14+ 다건)에서 한 번에 보여줄 최대 슬롯 수 — 포스터 그리드와 동일하게 나머지는 "+N개 이벤트"로 묶는다
export const GV_MAX_VISIBLE = 4
// 확장 스택(zoom ≤13)에서 스크롤 없이 보이는 최대 행 수 — 초과분은 스택 내부 스크롤로
export const GV_STACK_MAX_VISIBLE = 5

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

export function computeGvSlotH(count: number, zoom: number, expanded: boolean, selected = false, isFestival = false): number {
  if (zoom <= 13) {
    if (!expanded) return isFestival ? GV_FESTIVAL_CHIP_H : GV_CHIP_H
    // 5개 초과는 스택 내부 스크롤 — 슬롯 높이는 5행에서 고정 (화면 밖으로 뚫고 나가는 것 방지)
    return GV_STACK_HDR_H + Math.min(count, GV_STACK_MAX_VISIBLE) * GV_STACK_ROW_H
  }
  const n = Math.min(count, GV_MAX_VISIBLE)
  const { h } = calloutSize(zoom)
  if (!shouldStack(n, zoom, selected)) return h
  if (shouldTwoCol(n, zoom, selected)) {
    const rows = Math.ceil(n / 2)
    return rows * h + (rows - 1) * GV_CALLOUT_GAP
  }
  return n * h + (n - 1) * GV_CALLOUT_GAP
}

export function computeGvSlotW(count: number, zoom: number, expanded: boolean, selected = false, isFestival = false): number {
  if (zoom <= 13) return isFestival && !expanded ? 150 : SLOT_W
  const n = Math.min(count, GV_MAX_VISIBLE)
  const { w } = calloutSize(zoom)
  if (shouldTwoCol(n, zoom, selected)) return w * 2 + GV_CALLOUT_COL_GAP
  return w
}

// ── Collapsed chip ────────────────────────────────────────────────
function GvCollapsedChip({ count, theaterName, selected, festivalTitle }: { count: number; theaterName: string; selected?: boolean; festivalTitle?: string }) {
  if (festivalTitle) {
    // 보라(GV_PURPLE)만 색상 예외 — 나머지(spacing/radius/shadow/타입)는 docs/DESIGN.md 토큰 사용
    return (
      <div
        data-gv-toggle={theaterName}
        style={{
          height: GV_FESTIVAL_CHIP_H,
          display: 'flex',
          flexDirection: 'column',
          // alignItems 기본값(stretch) 그대로 둔다 — flex item은 태그와 무관하게 block화되므로
          // center로 바꾸면 자식이 콘텐츠 폭으로 줄어들어 구분선(너비 100% 필요)이 찌그러진다
          justifyContent: 'center',
          gap: 'var(--spacing-1)',
          padding: 'var(--spacing-1) var(--spacing-2-5)',
          borderRadius: 'var(--radius-lg)', // 지도 팝업 용도 — docs/DESIGN.md 반경 토큰
          background: GV_PURPLE,
          cursor: 'pointer',
          boxShadow: selected
            ? '0 0 0 2px #fff, 0 0 0 4px #4A6380'
            : '0 2px 6px rgba(0,0,0,0.18)', // shadow.pin (docs/DESIGN.md)
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{festivalTitle}</span>
        <div style={{ width: '100%', height: 1, background: '#fff', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>이벤트 {count}개</span>
      </div>
    )
  }
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
function GvExpandedStack({ events, theaterName, festivalTitle }: { events: GvEvent[]; theaterName: string; festivalTitle?: string }) {
  const accent = festivalTitle ? GV_PURPLE : GV_AMBER
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
        background: `${accent}14`,
      }}>
        {festivalTitle ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {festivalTitle} · {events.length}개
          </span>
        ) : (
          <>
            <span style={{ fontSize: 8, fontWeight: 900, color: GV_AMBER, letterSpacing: '0.3px' }}>GV</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
              GV {events.length}개
            </span>
          </>
        )}
        <span style={{ fontSize: 10, color: 'var(--color-text-caption)' }}>▲</span>
      </div>
      <div
        data-gv-scroll
        style={{
          maxHeight: GV_STACK_MAX_VISIBLE * GV_STACK_ROW_H,
          overflowY: events.length > GV_STACK_MAX_VISIBLE ? 'auto' : 'visible',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {events.map((ev) => <GvStackRow key={ev.id} ev={ev} />)}
      </div>
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
      <div style={{ width: 3, alignSelf: 'stretch', background: gvEventTypeColor(ev.type), flexShrink: 0 }} />
      <div style={{
        width: 24, height: 34, margin: '0 6px 0 6px', borderRadius: 3, flexShrink: 0,
        background: `oklch(35% 0.08 ${ev.hue})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{ev.label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
          <span style={{ background: gvEventTypeColor(ev.type), color: '#fff', fontSize: 7, fontWeight: 800, borderRadius: 2, padding: '0.5px 3px' }}>{ev.type}</span>
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
function GvCalloutBubble({ ev, extraCount = 0, overlayCount, selected, size }: { ev: GvEvent; extraCount?: number; overlayCount?: number; selected?: boolean; size: { w: number; h: number } }) {
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
          <span style={{ background: gvEventTypeColor(ev.type), color: '#fff', fontSize: 7.5, fontWeight: 800, borderRadius: 3, padding: '1px 3px', letterSpacing: '0.3px', lineHeight: 1.3, flexShrink: 0 }}>{ev.type}</span>
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
      {/* 포스터 오버플로우와 동일한 패턴 — 마지막 슬롯에 어두운 오버레이 + "+N개 이벤트" */}
      {overlayCount != null && overlayCount > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,12,9,0.62)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700,
        }}>
          +{overlayCount}개 이벤트
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
  const festivalTitle = isFestivalGroup(events) ? events[0].movie : undefined
  if (zoom <= 13) {
    if (!expanded) return <GvCollapsedChip count={events.length} theaterName={theaterName} selected={selected} festivalTitle={festivalTitle} />
    return <GvExpandedStack events={events} theaterName={theaterName} festivalTitle={festivalTitle} />
  }
  const size = calloutSize(zoom)
  // zoom 15+: stack all bubbles; zoom 14 + selected: also stack; otherwise single + extra count
  const stack = (zoom >= 15 || (zoom === 14 && selected)) && events.length > 1
  if (stack) {
    const visibleEvents = events.slice(0, GV_MAX_VISIBLE)
    const overflowCount = events.length - visibleEvents.length
    const twoCol = visibleEvents.length > 3
    const totalW = twoCol ? size.w * 2 + GV_CALLOUT_COL_GAP : size.w
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
        gap: twoCol ? `${GV_CALLOUT_GAP}px ${GV_CALLOUT_COL_GAP}px` : GV_CALLOUT_GAP,
        width: totalW,
      }}>
        {visibleEvents.map((ev, i) => {
          const isLast = i === visibleEvents.length - 1
          const isLastOdd = twoCol && overflowCount === 0 && visibleEvents.length % 2 === 1 && isLast
          if (isLastOdd) return (
            <div key={ev.id} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: size.w }}><GvCalloutBubble ev={ev} selected={selected} size={size} /></div>
            </div>
          )
          return (
            <GvCalloutBubble
              key={ev.id}
              ev={ev}
              selected={selected}
              size={size}
              overlayCount={isLast && overflowCount > 0 ? overflowCount : undefined}
            />
          )
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
