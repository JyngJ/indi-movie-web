'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** 문서 카드 = 스크롤 프레임.
 *
 *  끝에 닿은 뒤 더 굴리면 내용이 조금 딸려오다가 제자리로 돌아온다. 브라우저의 rubber band는
 *  최상위 스크롤에만 붙고 내부 컨테이너에는 없어서 직접 만든다.
 *
 *  모델: 감쇠하는 목표값 + 임계 감쇠 추종.
 *  - 휠은 목표 당김에 더하고, 목표는 매 프레임 스스로 줄어든다. 트랙패드가 손을 뗀 뒤에도
 *    보내는 관성 delta가 쌓이지 않아 "한참 밀렸다가 뒤늦게 튕기는" 일이 없다.
 *  - 표시값은 목표를 지수 보간으로 따라간다. 스프링을 속도로 풀면 진동이 남아 되돌아올 때
 *    덜그럭거리는데, 임계 감쇠 추종은 한 방향으로만 수렴한다.
 *  - 그릴 때는 UIScrollView 고무줄 공식으로 눌러 준다:
 *      f(x) = (1 − 1/(x·c/d + 1))·d,  c = 0.55   (Apple UIScrollView 상수)
 */

const APPLE_C = 0.55      // UIScrollView 고무줄 상수
const MAX_PULL = 96       // 화면에 보이는 최대 당김(px)
const GAIN = 2            // 휠 delta → 목표 당김. 휠 한 칸(≈100)에 31px
const TARGET_DECAY = 0.75 // 프레임당 목표 감소 — 입력이 멎으면 스스로 0으로 간다
const FOLLOW = 0.4        // 프레임당 추종 비율(임계 감쇠, 오버슈트 없음)
const REST = 0.3

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

    let target = 0     // 당기려는 양(감쇠 전)
    let current = 0    // 실제로 그리는 양
    let raf = 0
    let last = 0

    const rubberband = (x: number) =>
      Math.sign(x) * (1 - 1 / ((Math.abs(x) * APPLE_C) / MAX_PULL + 1)) * MAX_PULL

    const draw = () => {
      const y = rubberband(current)
      inner.style.transform = Math.abs(y) < 0.05 ? '' : `translate3d(0, ${y.toFixed(2)}px, 0)`
    }

    const tick = (now: number) => {
      // 60fps 기준 정규화 — 120Hz에서 두 배 빨라지거나 프레임이 튀어도 같은 속도로 수렴한다
      const dt = last ? Math.min((now - last) / 16.67, 3) : 1
      last = now

      target *= Math.pow(TARGET_DECAY, dt)
      current += (target - current) * (1 - Math.pow(1 - FOLLOW, dt))
      draw()

      if (Math.abs(current) < REST && Math.abs(target) < REST) {
        target = 0
        current = 0
        draw()
        raf = 0
        last = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(tick)
      }
    }

    const onWheel = (e: WheelEvent) => {
      const atTop = frame.scrollTop <= 0
      const atBottom = frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1
      const pulling = (atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)
      if (!pulling) return

      // 더 스크롤할 곳이 없으니 브라우저가 페이지를 밀지 않게 막는다
      e.preventDefault()
      target += -e.deltaY * GAIN
      start()
    }

    // 탭을 벗어나면 rAF가 멈춘다 — 당겨진 채 얼지 않게 즉시 되돌린다.
    const onHide = () => {
      if (!document.hidden) return
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      target = 0
      current = 0
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
