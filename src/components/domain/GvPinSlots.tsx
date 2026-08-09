import type { GvEvent } from '@/data/gv-events'
import { isFestivalGroup } from '@/data/gv-events'

/* 피그마 2.0/GvPin · 2.0/GvChip (2026-08-10 확정)
   지도 위에 표(카드 그리드·확장 스택)를 띄우던 방식을 폐지하고,
   다건이어도 카드는 한 장 — 개수는 우상단 +N 배지 하나로 끝낸다. */

export const GV_MARKER_STEM_H = 28
export const GV_MARKER_DOT_D = 8

/** 카드: 패딩 12 · 행 간격 4 · 상단행 22 + 제목 21 + 부가 18 */
const CARD_PAD = 12
const ROW_GAP = 4
const CARD_H = CARD_PAD * 2 + 22 + ROW_GAP + 21 + ROW_GAP + 18   // 93
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

export function computeGvSlotH(_count: number, zoom: number, expanded: boolean, _selected = false, _isFestival = false): number {
  if (zoom <= 13 && !expanded) return CHIP_H
  return CARD_H
}

export function computeGvSlotW(_count: number, zoom: number, expanded: boolean, _selected = false, isFestival = false): number {
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

/* ── 배지 ────────────────────────────────────────────────────── */
const badgeBase: React.CSSProperties = {
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
}

function GvBadge({ children }: { children: React.ReactNode }) {
  return <span style={{ ...badgeBase, flexShrink: 0 }}>{children}</span>
}

/** 개수 배지 — 카드 우상단 코너. 포스터 핀 코너 칩과 같은 규격
 *  (offset -8 · 보더 1.5 surface-bg · shadow) */
function GvCountBadge({ count }: { count: number }) {
  return (
    <span style={{
      ...badgeBase,
      position: 'absolute',
      top: -8,
      right: -8,
      zIndex: 1,
      border: '1.5px solid var(--color-surface-bg)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    }}>
      +{count}
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
        position: 'relative',
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
      {extra > 0 && <GvCountBadge count={extra} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GvBadge>{ev.type}</GvBadge>
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', ...ellipsis }}>
          {ev.time}
        </span>
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

  /* 다건도 카드는 한 장 — 개수는 우상단 +N 배지가 말한다.
     쌓인 실루엣은 지도 위(이미 포스터 카드가 떠 있다)에서 그림자 층만 늘려 노이즈가 됐다. */
  return <GvCard ev={events[0]} extra={events.length - 1} selected={selected} width={cardWidth(zoom)} />
}
