'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** 문서 카드 = 스크롤 프레임.
 *
 *  끝에 닿은 뒤 더 굴리면 내용이 조금 딸려오다가 제자리로 돌아온다. 브라우저의 rubber band는
 *  최상위 스크롤에만 붙고 내부 컨테이너에는 없어서 직접 만든다.
 *
 *  모델: 임펄스 + 스프링.
 *  - 휠은 "밀어주는 힘"으로 받아 속도에 더한다(위치를 직접 누적하지 않는다).
 *    트랙패드는 손을 뗀 뒤에도 관성 delta를 1초 가까이 보내는데, 위치를 누적하면
 *    그 관성까지 그대로 쌓여 한참 밀렸다가 뒤늦게 튕긴다 — 예전 구현이 어색했던 이유다.
 *  - 매 프레임 스프링(당김 -k·x, 감쇠 -c·v)으로 0을 향해 되돌린다. 타이머로 "놓음"을
 *    판정하지 않으므로 입력이 끊겨도 자연스럽게 수렴한다.
 *  - 화면에 그릴 때는 UIScrollView의 고무줄 공식으로 눌러 준다:
 *      f(x) = (1 − 1/(x·c/d + 1))·d,  c = 0.55   (Apple UIScrollView 상수)
 *    거리가 커질수록 저항이 붙어 MAX_PULL에 수렴한다.
 */

const APPLE_C = 0.55      // UIScrollView 고무줄 상수
const MAX_PULL = 96       // 최대 당김(px)
const IMPULSE = 0.7       // 휠 delta 1 → 속도(px/frame). 휠 한 칸(≈100)에 30px 남짓 딸려온다
const STIFFNESS = 0.3     // 스프링 당김
const DAMPING = 0.75      // 프레임당 속도 감쇠 — 튕김 없이 0.5초 안에 붙는다
const REST = 0.4          // 이 아래는 눈에 안 보이므로 멈춘다(꼬리 끊기)

export function ScrollFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // 스크롤이 window가 아니라 이 카드에 있어 Next의 스크롤 복원이 닿지 않는다.
  useEffect(() => {
    frameRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let offset = 0        // 스프링이 다루는 값(감쇠 전)
    let velocity = 0
    let raf = 0
    let last = 0

    const rubberband = (x: number) =>
      Math.sign(x) * (1 - 1 / ((Math.abs(x) * APPLE_C) / MAX_PULL + 1)) * MAX_PULL

    const draw = () => {
      const y = rubberband(offset)
      inner.style.transform = y === 0 ? '' : `translate3d(0, ${y}px, 0)`
    }

    const tick = (now: number) => {
      // 60fps 기준으로 정규화 — 120Hz 화면에서 두 배 빨리 돌아가지 않게
      const dt = last ? Math.min((now - last) / 16.67, 3) : 1
      last = now

      velocity += -STIFFNESS * offset * dt
      velocity *= Math.pow(DAMPING, dt)
      offset += velocity * dt
      draw()

      if (Math.abs(offset) < REST && Math.abs(velocity) < REST) {
        offset = 0
        velocity = 0
        draw()
        raf = 0
        last = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onWheel = (e: WheelEvent) => {
      const atTop = frame.scrollTop <= 0
      const atBottom = frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1
      const pulling = (atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)
      if (!pulling) return

      // 더 스크롤할 곳이 없으니 브라우저가 페이지를 밀지 않게 막는다
      e.preventDefault()
      velocity += -e.deltaY * IMPULSE
      start()
    }

    // 탭을 벗어나면 rAF가 멈춘다 — 당겨진 채 얼지 않게 즉시 되돌린다.
    const onHide = () => {
      if (!document.hidden) return
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      offset = 0
      velocity = 0
      draw()
    }

    frame.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('visibilitychange', onHide)
    return () => {
      frame.removeEventListener('wheel', onWheel)
      document.removeEventListener('visibilitychange', onHide)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="ds-card" ref={frameRef}>
      <div className="ds-card-inner" ref={innerRef}>{children}</div>
    </div>
  )
}
