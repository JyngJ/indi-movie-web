'use client'

import type { CSSProperties, ReactNode } from 'react'

/** 상세 화면 '핵심 정보' 패널 — 상단바 아래 헤더 덩어리를 흰 면 하나로 묶는다.
 *  피그마 '상영작 상세 실측 (2026-09-17)' 확정 규칙:
 *   · 담는 것 — 영화·감독: 히어로 + 액션 행 / 극장: 극장 헤더 + 액션 + 지도 CTA + 날짜탭
 *   · PC: 카드처럼 `--radius-sheet`(20) + 좌우 32
 *   · 모바일: 풀블리드라 모서리 없음. 좌우 패딩도 없다(자식이 16 거터를 갖는다)
 *
 *  영화 상세의 날짜탭은 이 패널에 넣지 않는다 — 그건 '상영 영화관 및 일정' 섹션 소속이다.
 *  `overflow: hidden`을 걸지 않는다 — 극장 상세의 날짜탭이 sticky라 잘라내면 안 붙는다.
 *
 *  481~1023px에서는 `.mobile-container`가 앱을 480 컬럼으로 가두고 바깥이 회색이라
 *  흰 면이 컬럼 경계에서 끊겨 보인다. 모서리를 깎거나 흰 면을 좌우로 흘리는 수법은
 *  둘 다 물렸다(2026-09-17) — 그 구간은 끊긴 채로 둔다. */
export function DetailKeyPanel({
  isDesktop,
  corners = 'all',
  style,
  children,
}: {
  isDesktop: boolean
  /** 패널을 두 조각으로 나눠 쌓을 때(극장 상세: 헤더 + sticky 날짜탭) 모서리를 갈라 준다 */
  corners?: 'all' | 'top' | 'bottom'
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div
      className={corners === 'all' ? 'detail-key-panel' : `detail-key-panel detail-key-panel--${corners}`}
      style={{
        backgroundColor: 'var(--color-surface-card)',
        /* 모서리는 globals.css `.detail-key-panel`이 갖는다 — 인라인이면 미디어 쿼리가 못 이긴다 */
        paddingLeft: isDesktop ? 32 : 0,
        paddingRight: isDesktop ? 32 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
