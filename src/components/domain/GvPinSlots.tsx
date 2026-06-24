import type { GvEvent } from '@/data/gv-events'
import { gvEventTypeColor } from '@/lib/gv/adapter'

const GV_AMBER = '#D97706'
// 줌 13 이하 펼친 목록/카드 너비 — 130이면 제목이 1~2글자만 보이고 잘려서 적당히 넓힘
const SLOT_W = 200

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
// 콜아웃 그리드(zoom 14+ 다건)에서 페이지당 보여줄 최대 슬롯 수 — 그 이상은 ‹ › 페이지네이션으로 넘김
export const GV_MAX_VISIBLE = 4
// 페이지 인디케이터(점 + N/M) 행 높이
export const GV_PAGE_INDICATOR_H = 22
// 줌 13 이하 펼친 목록에서 한 번에 보여줄 최대 줄 수 — 그 이상은 세로 스크롤
export const GV_EXPANDED_MAX_ROWS = 3

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
    return GV_STACK_HDR_H + Math.min(count, GV_EXPANDED_MAX_ROWS) * GV_STACK_ROW_H
  }
  const n = Math.min(count, GV_MAX_VISIBLE)
  const { h } = calloutSize(zoom)
  if (!shouldStack(n, zoom, selected)) return h
  const indicatorH = count > GV_MAX_VISIBLE ? GV_PAGE_INDICATOR_H : 0
  if (shouldTwoCol(n, zoom, selected)) {
    const rows = Math.ceil(n / 2)
    return rows * h + (rows - 1) * GV_CALLOUT_GAP + indicatorH
  }
  return n * h + (n - 1) * GV_CALLOUT_GAP + indicatorH
}

export function computeGvSlotW(count: number, zoom: number, expanded: boolean, selected = false): number {
  if (zoom <= 13) return SLOT_W
  const n = Math.min(count, GV_MAX_VISIBLE)
  const { w } = calloutSize(zoom)
  if (shouldTwoCol(n, zoom, selected)) return w * 2 + GV_CALLOUT_COL_GAP
  return w
}

// ── 호버 카드(데스크톱) — 포스터 호버 카드(.pm-tip)와 동일한 패턴 ──
function statusDotColor(status: GvEvent['status']): string {
  if (status === '매진') return '#b91c1c'
  if (status === '매진 임박') return '#ea580c'
  return '#16a34a'
}

function GvHoverTip({ ev }: { ev: GvEvent }) {
  return (
    <div className="gv-tip">
      <div className="gv-tip-tail" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ background: gvEventTypeColor(ev.type), color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.3px' }}>{ev.type}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: statusDotColor(ev.status) }}>● {ev.status}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          width: 44, height: 64, borderRadius: 6, flexShrink: 0,
          background: `oklch(35% 0.08 ${ev.hue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{ev.label}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {ev.movie}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ev.theaterName}
          </span>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '10px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', width: 32, flexShrink: 0 }}>일시</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-body)', fontWeight: 600 }}>{ev.time}</span>
        </div>
        {ev.guest && (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-caption)', width: 32, flexShrink: 0 }}>게스트</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-body)' }}>{ev.guest}</span>
          </div>
        )}
      </div>
    </div>
  )
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
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>▼</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>이벤트 {count}개</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 1 }}>·</span>
    </div>
  )
}

// ── Expanded stack row ─────────────────────────────────────────────
function GvStackRow({ ev }: { ev: GvEvent }) {
  return (
    <div data-gv-row={ev.id} className="gv-wrap" style={{
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
        <div style={{ fontSize: 8.5, fontWeight: 600, color: statusDotColor(ev.status) }}>● {ev.status}</div>
      </div>
      <GvHoverTip ev={ev} />
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
        <span style={{ fontSize: 10, color: 'var(--color-text-caption)' }}>▲</span>
        <span style={{ fontSize: 8, fontWeight: 900, color: GV_AMBER, letterSpacing: '0.3px' }}>GV</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
          GV {events.length}개
        </span>
      </div>
      <div className="themed-scrollbar gv-expanded-scroll" style={{ maxHeight: GV_STACK_ROW_H * GV_EXPANDED_MAX_ROWS, overflowY: 'auto' }}>
        {events.map((ev) => <GvStackRow key={ev.id} ev={ev} />)}
      </div>
    </div>
  )
}

// ── Zoom 14+ DS card ──────────────────────────────────────────────
function GvDsCard({ ev, first }: { ev: GvEvent; first: boolean }) {
  return (
    // 바깥 래퍼는 호버 카드 앵커용(overflow 안 자름) — 안쪽 카드만 모서리를 둥글게 잘라낸다
    <div data-gv-row={ev.id} className="gv-wrap" style={{ width: SLOT_W, marginTop: first ? 0 : GV_DS_GAP }}>
      <div style={{
        height: GV_DS_CARD_H,
        display: 'flex', alignItems: 'center',
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        cursor: 'pointer',
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
          <span style={{ fontSize: 9, fontWeight: 600, color: statusDotColor(ev.status) }}>● {ev.status}</span>
        </div>
      </div>
      <GvHoverTip ev={ev} />
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
    // 바깥 래퍼는 호버 카드 앵커용(overflow 안 자름) — 안쪽 카드만 모서리를 둥글게 잘라낸다
    <div data-gv-row={ev.id} className="gv-wrap" style={{ position: 'relative', width: '100%', height: size.h }}>
      <div style={{
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
      </div>
      <GvHoverTip ev={ev} />
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
  /** 콜아웃 그리드(4개 초과) 페이지 — 0-based */
  page?: number
}

const pageNavBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 26, height: 26,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  background: 'var(--color-surface-card)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2,
  padding: 0,
  minHeight: 'unset',
}

// Pure function — no hooks. Safe for renderToStaticMarkup.
export function GvBottomSlot({ events, zoom, expanded, theaterName, selected, page = 0 }: GvBottomSlotProps) {
  if (zoom <= 13) {
    if (!expanded) return <GvCollapsedChip count={events.length} theaterName={theaterName} selected={selected} />
    return <GvExpandedStack events={events} theaterName={theaterName} />
  }
  const size = calloutSize(zoom)
  // zoom 15+: stack all bubbles; zoom 14 + selected: also stack; otherwise single + extra count
  const stack = (zoom >= 15 || (zoom === 14 && selected)) && events.length > 1
  if (stack) {
    const totalPages = Math.ceil(events.length / GV_MAX_VISIBLE)
    const safePage = ((page % totalPages) + totalPages) % totalPages
    const pageEvents = events.slice(safePage * GV_MAX_VISIBLE, safePage * GV_MAX_VISIBLE + GV_MAX_VISIBLE)
    const twoCol = events.length > 3
    const totalW = twoCol ? size.w * 2 + GV_CALLOUT_COL_GAP : size.w
    // 마지막 페이지에 카드가 적게 남아도(예: 4개 중 2개) 그리드 높이를 항상 풀 페이지(4개) 기준으로 고정 —
    // 그래야 화살표가 페이지마다 위/아래로 같이 흔들리지 않는다.
    const fullRows = twoCol ? Math.ceil(GV_MAX_VISIBLE / 2) : GV_MAX_VISIBLE
    const fixedGridH = fullRows * size.h + (fullRows - 1) * GV_CALLOUT_GAP
    return (
      <div style={{ width: totalW }}>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6, height: GV_PAGE_INDICATOR_H - 6 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <div key={i} style={{
                  width: i === safePage ? 14 : 5, height: 4, borderRadius: 2,
                  background: i === safePage ? 'var(--color-primary-base)' : 'var(--color-border)',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-caption)' }}>{safePage + 1}/{totalPages}</span>
          </div>
        )}
        {/* 화살표는 카드 그리드의 세로 중앙에만 맞춤 — 그리드 높이는 페이지마다 흔들리지 않게 고정 */}
        <div style={{ position: 'relative', width: totalW, height: totalPages > 1 ? fixedGridH : undefined }}>
          {totalPages > 1 && (
            <button type="button" data-gv-page-prev={theaterName} aria-label="이전 이벤트" style={{ ...pageNavBtnStyle, left: -32 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          <div style={{
            display: 'grid',
            // 1fr 트랙은 기본 minmax(auto,1fr)이라 긴 제목이 있으면 줄어들지 않고 카드가 넘침 — minmax(0,1fr)로 강제
            gridTemplateColumns: twoCol ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
            gap: twoCol ? `${GV_CALLOUT_GAP}px ${GV_CALLOUT_COL_GAP}px` : GV_CALLOUT_GAP,
            width: totalW,
          }}>
            {pageEvents.map((ev, i) => {
              const isLastOdd = twoCol && pageEvents.length % 2 === 1 && i === pageEvents.length - 1
              if (isLastOdd) return (
                <div key={ev.id} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: size.w }}><GvCalloutBubble ev={ev} selected={selected} size={size} /></div>
                </div>
              )
              return <GvCalloutBubble key={ev.id} ev={ev} selected={selected} size={size} />
            })}
          </div>
          {totalPages > 1 && (
            <button type="button" data-gv-page-next={theaterName} aria-label="다음 이벤트" style={{ ...pageNavBtnStyle, right: -32 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>
      </div>
    )
  }
  return (
    <div style={{ width: size.w }}>
      <GvCalloutBubble ev={events[0]} extraCount={events.length - 1} selected={selected} size={size} />
    </div>
  )
}
