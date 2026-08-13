/** 말풍선 꼬리 — 지역 힌트 툴팁 문법(11×11 · rotate45 · 팁 r4)을 공유한다.
 *
 *  rotate(45deg)를 걸면 정사각형의 각 꼭짓점이 상/우/하/좌로 간다.
 *  방향별 팁이 되는 꼭짓점과, 그 팁에서 만나는 두 변은 다음과 같다.
 *    up    → 좌상단 꼭짓점이 위로  (top·left 변이 노출)
 *    right → 우상단 꼭짓점이 우로  (top·right 변이 노출)
 *    left  → 좌하단 꼭짓점이 좌로  (left·bottom 변이 노출)
 *  보더 있는 말풍선은 `border`를 넘기면 노출되는 두 변에만 같은 보더를 그려
 *  본체 보더와 이어 붙인다. 나머지 변은 본체에 가려지므로 생략한다.
 */
export type BubbleTailDir = 'up' | 'right' | 'left'

interface BubbleTailProps {
  dir?: BubbleTailDir
  /** up: 말풍선 좌측 기준 가로 위치(px 또는 '50%')
   *  left·right: 말풍선 상단 기준 세로 위치. 기본 '50%'(세로 중앙) */
  offset?: number | string
  /** 말풍선 면 색 */
  background: string
  /** 보더 있는 말풍선일 때만 — 본체와 같은 보더 shorthand */
  border?: string
  size?: number
  zIndex?: number
}

/** 회전 사각형의 꼭짓점이 본체 밖으로 실제로 나오는 거리.
 *  말풍선을 "팁이 대상에 닿도록" 놓으려면 이만큼 띄워야 한다. */
export function bubbleTailReach(size = 11): number {
  const protrude = Math.round(size / 2) - 1
  return (size * Math.SQRT2) / 2 - size / 2 + protrude
}

export function BubbleTail({ dir = 'up', offset = '50%', background, border, size = 11, zIndex = 0 }: BubbleTailProps) {
  /* 팁이 본체 밖으로 나오는 깊이 — 툴팁 실측(11px에 -5) 기준 */
  const protrude = Math.round(size / 2) - 1
  /* 팁에서 만나는 두 변에만 보더를 그린다 — 나머지는 본체에 가려진다 */
  const TIP_EDGES: Record<BubbleTailDir, [string, string]> = {
    up:    ['borderTop', 'borderLeft'],
    right: ['borderTop', 'borderRight'],
    left:  ['borderLeft', 'borderBottom'],
  }
  const tip = border ? Object.fromEntries(TIP_EDGES[dir].map((e) => [e, border])) : null

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        background,
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex,
        ...(dir === 'up'
          ? { top: -protrude, left: offset, transform: 'translateX(-50%) rotate(45deg)' }
          : dir === 'right'
            ? { top: offset, right: -protrude, transform: 'translateY(-50%) rotate(45deg)' }
            : { top: offset, left: -protrude, transform: 'translateY(-50%) rotate(45deg)' }),
        ...tip,
      }}
    />
  )
}
