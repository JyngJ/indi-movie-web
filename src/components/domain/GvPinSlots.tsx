import type { GvEvent } from '@/data/gv-events'
import { isFestivalGroup } from '@/data/gv-events'

/* 피그마 2.0/GvPin · 2.0/GvChip (2026-08-10 확정)
   지도 위에 표(카드 그리드·확장 스택)를 띄우던 방식을 폐지하고,
   다건은 "카드가 여러 장 쌓인" 모습 + 우상단 +N 배지 하나로 끝낸다. */

export const GV_MARKER_STEM_H = 28
export const GV_MARKER_DOT_D = 8

/** 카드: 패딩 12 · 행 간격 4 · 상단행 22 + 제목 21 + 부가 18 */
const CARD_PAD = 12
const ROW_GAP = 4
const CARD_H = CARD_PAD * 2 + 22 + ROW_GAP + 21 + ROW_GAP + 18   // 93
/** 쌓임: 뒤 카드 2장이 아래로 6px씩 내려가며 좌우로 8px씩 좁아진다 */
const STACK_STEP_Y = 6
const STACK_INSET_X = 8
const GHOST_H = 40
const CHIP_H = 30

/** 카드 폭 — 지도 밀도를 위해 줌이 낮을수록 좁게 (문자 크기는 고정) */
function cardWidth(zoom: number): number {
  if (zoom >= 17) return 168
  if (zoom === 16) return 160
  if (zoom === 15) return 152
  return 144
}
/** 접힘 칩은 내용 폭이지만 아이콘 박스는 고정이어야 앵커가 안 흔들린다 */
function chipWidth(isFestival: boolean): number {
  return isFestival ? 160 : 112
}

const isStacked = (count: number) => count > 1

export function computeGvSlotH(count: number, zoom: number, expanded: boolean, _selected = false, isFestival = false): number {
  if (zoom <= 13 && !expanded) return isFestival ? CHIP_H : CHIP_H
  return isStacked(count) ? CARD_H + STACK_STEP_Y * 2 : CARD_H
}

export function computeGvSlotW(count: number, zoom: number, expanded: boolean, _selected = false, isFestival = false): number {
  if (zoom <= 13 && !expanded) return chipWidth(isFestival)
  return cardWidth(zoom)
}

/* ── 접힘 칩 (zoom ≤ 13) ─────────────────────────────────────── */
function GvCollapsedChip({ count, theaterName, selected, festivalTitle }: {
  count: number
  theaterName: string
  selected?: boolean
  festivalTitle?: string
}) {
  return (
    <div
      data-gv-toggle={theaterName}
      style={{
        height: CHIP_H,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 12px',
        borderRadius: 9999,
        background: 'var(--color-gv)',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 2px var(--color-surface-bg), 0 0 0 4px var(--color-primary-base)'
          : '0 2px 6px rgba(0,0,0,0.18)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 'var(--text-badge)', fontWeight: 500, color: 'var(--color-on-accent)' }}>
        {festivalTitle ? `${festivalTitle} · ${count}` : `GV ${count}개`}
      </span>
    </div>
  )
}

/* ── 배지 (GV · +N) ──────────────────────────────────────────── */
function GvBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: 9999,
      background: 'var(--color-gv)',
      color: 'var(--color-on-accent)',
      fontSize: 'var(--text-badge)',
      fontWeight: 500,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

/* ── 카드 ────────────────────────────────────────────────────── */
function GvCard({ ev, extra, selected, width }: {
  ev: GvEvent
  extra: number
  selected?: boolean
  width: number
}) {
  const subLine = ev.subtitle ? `— ${ev.subtitle}` : (ev.guest?.split(' · ')[0] ?? '')
  const ellipsis: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  return (
    <div
      data-gv-row={ev.id}
      style={{
        width,
        height: CARD_H,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: ROW_GAP,
        padding: CARD_PAD,
        borderRadius: 'var(--radius-control)',
        background: 'var(--color-surface-card)',
        border: selected ? '2px solid var(--color-primary-base)' : '1.5px solid var(--color-border)',
        boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GvBadge>{ev.type}</GvBadge>
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', ...ellipsis }}>
          {ev.time}
        </span>
        {extra > 0 && <GvBadge>+{extra}</GvBadge>}
      </div>
      <div style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.5, ...ellipsis }}>
        {ev.movie}
      </div>
      <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.5, ...ellipsis }}>
        {subLine}
      </div>
    </div>
  )
}

/** 뒤에 깔리는 실루엣 — 내용 없이 카드 모양만 */
function GvGhostCard({ width, offsetY, selected }: { width: number; offsetY: number; selected?: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      top: CARD_H - GHOST_H + offsetY,
      width,
      height: GHOST_H,
      borderRadius: 'var(--radius-control)',
      background: 'var(--color-surface-card)',
      border: selected ? '2px solid var(--color-primary-base)' : '1.5px solid var(--color-border)',
      boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    }} />
  )
}

/* ── 메인 ────────────────────────────────────────────────────── */
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

  if (zoom <= 13 && !expanded) {
    return <GvCollapsedChip count={events.length} theaterName={theaterName} selected={selected} festivalTitle={festivalTitle} />
  }

  const width = cardWidth(zoom)
  const stacked = isStacked(events.length)
  const card = <GvCard ev={events[0]} extra={events.length - 1} selected={selected} width={width} />
  if (!stacked) return card

  return (
    <div style={{ position: 'relative', width, height: CARD_H + STACK_STEP_Y * 2 }}>
      <GvGhostCard width={width - STACK_INSET_X * 2} offsetY={STACK_STEP_Y * 2} selected={selected} />
      <GvGhostCard width={width - STACK_INSET_X} offsetY={STACK_STEP_Y} selected={selected} />
      <div style={{ position: 'relative' }}>{card}</div>
    </div>
  )
}
