'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, type Transition, type Variants } from 'motion/react'

/**
 * 인덱스가 바뀌면 이전 패널이 나가고 새 패널이 방향을 따라 들어오는 전환 컨테이너.
 * 온보딩·단계형 카드처럼 "한 번에 한 장"만 보이는 화면에 쓴다.
 */

/** 자식 높이를 재서 컨테이너 높이를 함께 애니메이션시키기 위한 측정 훅 */
export function useMeasuredHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(0)
  const nodeRef = useRef<T | null>(null)

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node
    if (node) setHeight(node.getBoundingClientRect().height)
  }, [])

  useEffect(() => {
    const node = nodeRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return [ref, height] as const
}

const DEFAULT_TRANSITION: Transition = {
  x: { type: 'spring', stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
}

/** 좌우 슬라이드 기본 variants — distance는 패널 폭 */
export function slideVariants(distance: number): Variants {
  return {
    enter: (direction: number) => ({
      x: direction > 0 ? distance : -distance,
      opacity: 0,
    }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? distance : -distance,
      opacity: 0,
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
    }),
  }
}

interface TransitionPanelProps {
  /** 보여줄 자식 인덱스 */
  activeIndex: number
  /** 진행 방향 — 1이면 다음(오른쪽에서 들어옴), -1이면 이전 */
  direction?: number
  children: ReactNode[]
  variants?: Variants
  transition?: Transition
  className?: string
  style?: React.CSSProperties
  /** 지정하면 컨테이너 높이를 이 값으로 함께 애니메이션 (useMeasuredHeight와 함께 사용) */
  height?: number
}

export function TransitionPanel({
  activeIndex,
  direction = 1,
  children,
  variants,
  transition = DEFAULT_TRANSITION,
  className,
  style,
  height,
}: TransitionPanelProps) {
  const resolved = variants ?? slideVariants(320)

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{
        ...style,
        /* 높이를 모를 때(측정 전)는 자동 — 첫 프레임 잘림 방지 */
        height: height && height > 0 ? height : undefined,
        transition: height && height > 0 ? 'height 250ms ease' : undefined,
      }}
    >
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={activeIndex}
          custom={direction}
          variants={resolved}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {children[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
