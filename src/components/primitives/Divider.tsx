import type { CSSProperties } from 'react'

/**
 * Divider — 내용 사이를 가르는 1px 선.
 *
 * 컨테이너의 테두리(borderTop/Bottom)는 이 컴포넌트가 아니다. 그건 면의 경계이고,
 * 여기서 말하는 구분선은 형제 요소 사이에 홀로 서는 선이다. 예전에는 그 선이
 * `<div style={{ height: 1, background: ... }} />`로 열몇 군데에 흩어져 있었고,
 * 어떤 곳은 background, 어떤 곳은 backgroundColor를 써서 검색조차 잘 안 걸렸다.
 */

export interface DividerProps {
  /** 기본 가로. 세로로 세우면 부모 높이를 따라 늘어난다. */
  orientation?: 'horizontal' | 'vertical'
  /** 선 양끝 여백(px). 카드 안에서 좌우를 띄울 때 쓴다. */
  inset?: number
  /** 남는 가로 공간을 채운다 — "구분선 + 글자 + 구분선" 조합에서 쓴다. */
  flex?: boolean
  /** 가로 구분선의 위아래 여백(px). */
  gap?: number
  color?: string
  style?: CSSProperties
}

export function Divider({
  orientation = 'horizontal',
  inset = 0,
  flex = false,
  gap = 0,
  color = 'var(--color-border)',
  style,
}: DividerProps) {
  const vertical = orientation === 'vertical'

  return (
    <div
      aria-hidden="true"
      style={{
        flexShrink: 0,
        backgroundColor: color,
        ...(vertical
          ? { width: 1, alignSelf: 'stretch', margin: `${inset}px ${gap}px` }
          : { height: 1, margin: `${gap}px ${inset}px`, ...(flex ? { flex: 1 } : { width: `calc(100% - ${inset * 2}px)` }) }),
        ...style,
      }}
    />
  )
}
