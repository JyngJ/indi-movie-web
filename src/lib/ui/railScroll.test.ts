import { describe, expect, it, vi } from 'vitest'

import { scrollRailBy } from './railScroll'

/** scrollTo/scrollLeft만 흉내내는 최소 스텁 — smooth 스크롤이 "진행 중"인 상황을 만든다 */
function makeRail(opts: { scrollWidth: number; clientWidth: number }) {
  const calls: number[] = []
  const el = {
    scrollLeft: 0,
    scrollWidth: opts.scrollWidth,
    clientWidth: opts.clientWidth,
    scrollTo: ({ left }: ScrollToOptions) => {
      calls.push(left ?? 0)
      // 실제 브라우저처럼 즉시 도착하지 않는다 — scrollLeft는 그대로 둔다
    },
  }
  return { el: el as unknown as HTMLElement, calls }
}

describe('scrollRailBy', () => {
  it('애니메이션 중 연타해도 클릭 수만큼 누적해서 목표를 옮긴다', () => {
    const { el, calls } = makeRail({ scrollWidth: 3000, clientWidth: 500 })

    scrollRailBy(el, 400)
    scrollRailBy(el, 400)
    scrollRailBy(el, 400)

    // scrollLeft가 0에 멈춰 있어도(=아직 도착 전) 목표는 400 → 800 → 1200으로 쌓인다
    expect(calls).toEqual([400, 800, 1200])
  })

  it('스크롤 가능 범위를 넘지 않는다', () => {
    const { el, calls } = makeRail({ scrollWidth: 1000, clientWidth: 500 })

    scrollRailBy(el, 400)
    scrollRailBy(el, 400)

    expect(calls).toEqual([400, 500])
  })

  it('역방향 클릭도 같은 목표 위에서 계산된다', () => {
    const { el, calls } = makeRail({ scrollWidth: 3000, clientWidth: 500 })

    scrollRailBy(el, 400)
    scrollRailBy(el, -400)

    expect(calls).toEqual([400, 0])
  })

  it('목표가 만료되면 현재 위치를 다시 기준으로 삼는다', () => {
    vi.useFakeTimers()
    try {
      const { el, calls } = makeRail({ scrollWidth: 3000, clientWidth: 500 })

      scrollRailBy(el, 400)
      // 사용자가 직접 손으로 스크롤해 다른 곳에 가 있는 상태
      vi.advanceTimersByTime(1000)
      el.scrollLeft = 100
      scrollRailBy(el, 400)

      expect(calls).toEqual([400, 500])
    } finally {
      vi.useRealTimers()
    }
  })

  it('el이 없으면 아무 일도 하지 않는다', () => {
    expect(() => scrollRailBy(null, 100)).not.toThrow()
  })
})
