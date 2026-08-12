/**
 * 가로 레일(포스터 행) 넘김 스크롤 — 연타를 삼키지 않는다.
 *
 * `el.scrollBy({ behavior: 'smooth' })`는 애니메이션이 진행 중인 동안 다시 호출하면
 * "지금 눈에 보이는 위치"를 기준으로 다시 계산한다. 그래서 빠르게 3번 누르면 3칸이 아니라
 * 1.2칸쯤 가고, 사용자는 클릭이 씹혔다고 읽는다(PostHog rage click 2위 원인).
 *
 * 진행 중인 목표 위치를 기억했다가 그 위에 delta를 더해 절대 좌표로 스크롤한다.
 * 사용자가 직접 손으로 스크롤하면 목표가 만료되어(TTL) 다시 현재 위치를 기준으로 잡는다.
 */
const pendingTargets = new WeakMap<Element, { target: number; expiresAt: number }>()

/** 목표 좌표 유효 시간 — smooth 스크롤 1회가 끝나기에 충분한 길이 */
const TARGET_TTL_MS = 600

export function scrollRailBy(el: HTMLElement | null | undefined, delta: number): void {
  if (!el) return

  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  const now = Date.now()
  const pending = pendingTargets.get(el)
  const base = pending && now < pending.expiresAt ? pending.target : el.scrollLeft
  const target = Math.max(0, Math.min(max, base + delta))

  pendingTargets.set(el, { target, expiresAt: now + TARGET_TTL_MS })
  el.scrollTo({ left: target, behavior: 'smooth' })
}
