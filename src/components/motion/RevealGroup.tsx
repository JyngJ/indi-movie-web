'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { registerRevealRescue } from './revealRescue'

/**
 * 가로 캐러셀 행처럼 "묶음 단위로 한 번에" 등장시켜야 하는 곳의 트리거.
 *
 * 왜 항목별 IntersectionObserver로는 안 되는가:
 * IO는 교차 상태가 바뀔 때만 콜백을 준다. 행의 오른쪽 화면 밖에 있는 카드는 스크롤로 행이
 * 지나가는 동안 한 번도 교차하지 않으므로 콜백이 아예 오지 않고, 영영 숨은 채 남는다.
 * 그래서 행 컨테이너 하나만 관찰하고 그 결과를 자식 전부가 공유한다.
 */
const RevealGroupContext = createContext<boolean | null>(null)

export function useRevealGroup(): boolean | null {
  return useContext(RevealGroupContext)
}

export function RevealGroup({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(
      ([e]) => {
        /* 위로 이미 지나간 경우(top < 0)도 노출로 친다 — 앵커 점프·스크롤 복원 대비 */
        if (e.boundingClientRect.top < 0) { setVisible(true); io.disconnect(); return }
        /* 행이 (rootMargin 적용된) 루트보다 크면 비율이 0.1에 못 닿는 게 아니라,
           애초에 임계 교차가 안 일어나 콜백이 한 번도 안 오는 창 비율이 있다.
           threshold에 0을 함께 넣어 콜백을 받고, 도달 가능한 상한으로 임계를 보정한다. */
        const rootH = e.rootBounds ? e.rootBounds.height : 0
        const h = e.boundingClientRect.height
        const cap = h > 0 && rootH > 0 ? Math.min(1, rootH / h) : 1
        if (e.isIntersecting && e.intersectionRatio >= Math.min(0.1, cap * 0.6)) { setVisible(true); io.disconnect() }
      },
      { threshold: [0, 0.1], rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    /* IO 콜백이 아예 안 오는 경우(한 프레임에 지나침·문서 hidden) 대비 — 스크롤이 멎을 때 직접 확인 */
    const unregister = registerRevealRescue(el, () => setVisible(true))
    return () => { io.disconnect(); unregister() }
  }, [visible])

  return (
    <RevealGroupContext.Provider value={visible}>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </RevealGroupContext.Provider>
  )
}
