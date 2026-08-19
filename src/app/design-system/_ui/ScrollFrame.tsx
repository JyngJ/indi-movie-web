'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { animate } from 'motion'

/** 문서 카드 = 스크롤 프레임.
 *
 *  끝에 닿은 뒤에도 계속 굴리면 내용이 조금 딸려오다가 스프링으로 돌아온다.
 *  브라우저의 rubber band는 최상위 스크롤에만 붙고 내부 컨테이너에는 안 붙어서 직접 만든다.
 *
 *  당김 곡선은 UIScrollView의 고무줄 공식을 그대로 쓴다(popmotion의 rubberband와 같은 식):
 *    f(x) = (1 − 1 / (x·c/d + 1)) · d
 *  거리가 늘수록 저항이 커져 d에 수렴한다. 선형으로 밀면 고무줄이 아니라 미끄러짐처럼 느껴진다.
 *
 *  d는 컨테이너 높이가 아니라 최대 당김 거리(120px)로 둔다 — 손가락 이동량을 쓰는 터치와 달리
 *  휠 delta는 한 번에 수백씩 들어와서, 높이를 그대로 쓰면 화면 절반이 밀린다.
 *  놓을 때는 스프링으로 되돌린다. */

const MAX_PULL = 120
const ELASTICITY = 0.25
const RELEASE_MS = 80

export function ScrollFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // 페이지를 옮기면 맨 위에서 시작한다. 스크롤이 window가 아니라 이 카드에 있어서
  // Next의 스크롤 복원이 닿지 않는다.
  useEffect(() => {
    frameRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let accum = 0
    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    let running: { stop: () => void } | undefined

    const rubberband = (distance: number) => {
      const d = MAX_PULL
      const x = Math.abs(distance)
      const pulled = (1 - 1 / ((x * ELASTICITY) / d + 1)) * d
      return Math.sign(distance) * pulled
    }

    const release = () => {
      accum = 0
      running = animate(
        inner,
        { y: 0 },
        { type: 'spring', stiffness: 420, damping: 34, mass: 0.9, restDelta: 0.2 },
      )
    }

    const onWheel = (e: WheelEvent) => {
      const atTop = frame.scrollTop <= 0
      const atBottom = frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1
      const pulling = (atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)

      if (!pulling) {
        if (accum !== 0) release()
        return
      }

      // 더 스크롤할 곳이 없으니 브라우저가 페이지를 밀지 않게 막는다
      e.preventDefault()
      running?.stop()
      accum -= e.deltaY
      inner.style.transform = `translate3d(0, ${rubberband(accum)}px, 0)`

      clearTimeout(releaseTimer)
      releaseTimer = setTimeout(release, RELEASE_MS)
    }

    // 탭을 벗어나면 rAF가 멈춰 스프링이 진행하지 못한다. 당겨진 채로 얼지 않게 즉시 되돌린다.
    const onHide = () => {
      if (!document.hidden) return
      clearTimeout(releaseTimer)
      running?.stop()
      accum = 0
      inner.style.transform = ''
    }

    frame.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('visibilitychange', onHide)
    return () => {
      frame.removeEventListener('wheel', onWheel)
      document.removeEventListener('visibilitychange', onHide)
      clearTimeout(releaseTimer)
      running?.stop()
    }
  }, [])

  return (
    <div className="ds-card" ref={frameRef}>
      <div className="ds-card-inner" ref={innerRef}>{children}</div>
    </div>
  )
}
