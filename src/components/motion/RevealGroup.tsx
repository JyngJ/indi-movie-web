'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

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
        if (e.isIntersecting || e.boundingClientRect.top < 0) { setVisible(true); io.disconnect() }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <RevealGroupContext.Provider value={visible}>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </RevealGroupContext.Provider>
  )
}
