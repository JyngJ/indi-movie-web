'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** 문서 카드 = 스크롤 프레임.
 *
 *  끝에 닿은 뒤에도 계속 굴리면 내용이 조금 딸려오다가 스프링으로 돌아온다(고무줄).
 *  브라우저의 rubber band는 최상위 스크롤에만 붙고 내부 컨테이너에는 안 붙어서 직접 만든다.
 *  움직이는 건 transform 하나뿐이라 레이아웃 재계산이 없다. */

const MAX_PULL = 72          // 최대로 딸려오는 거리(px)
const RESISTANCE = 340       // 클수록 더 뻑뻑하게 딸려온다
const RELEASE_MS = 90        // 휠이 멈췄다고 보는 시간

export function ScrollFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let accum = 0
    let releaseTimer: ReturnType<typeof setTimeout> | undefined

    // wheel 이벤트는 이미 프레임 단위로 들어온다 — rAF로 한 번 더 미루면
    // 탭이 백그라운드일 때 적용이 밀린다.
    const apply = (offset: number) => {
      inner.style.transform = offset === 0 ? '' : `translate3d(0, ${offset}px, 0)`
    }

    /** 당길수록 덜 딸려오게 — 지수 감쇠. 끝에서 무한정 밀리지 않는다. */
    const damp = (raw: number) => {
      const sign = Math.sign(raw)
      const mag = Math.abs(raw)
      return sign * MAX_PULL * (1 - Math.exp(-mag / RESISTANCE))
    }

    const release = () => {
      accum = 0
      inner.style.transition = 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)'
      apply(0)
      window.setTimeout(() => { inner.style.transition = '' }, 480)
    }

    const onWheel = (e: WheelEvent) => {
      const atTop = frame.scrollTop <= 0
      const atBottom = frame.scrollTop + frame.clientHeight >= frame.scrollHeight - 1
      const pullingUp = atTop && e.deltaY < 0
      const pullingDown = atBottom && e.deltaY > 0

      if (!pullingUp && !pullingDown) {
        if (accum !== 0) release()
        return
      }

      // 스크롤할 곳이 없으니 브라우저가 페이지를 밀지 않게 막는다
      e.preventDefault()
      inner.style.transition = ''
      accum -= e.deltaY
      apply(damp(accum))

      clearTimeout(releaseTimer)
      releaseTimer = setTimeout(release, RELEASE_MS)
    }

    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      frame.removeEventListener('wheel', onWheel)
      clearTimeout(releaseTimer)
    }
  }, [])

  return (
    <div className="ds-card" ref={frameRef}>
      <div className="ds-card-inner" ref={innerRef}>{children}</div>
    </div>
  )
}
