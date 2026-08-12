'use client'

// ================================
// dead click 계측 — "눌렀는데 아무 일도 안 일어난 클릭"만 골라 잡는다.
//
// rage click(연타)은 PostHog autocapture가 이미 잡지만, 그 직전에 일어나는
// "무반응 1회 클릭"은 어디에도 안 남는다. 무반응의 원인은 대부분 셋 중 하나:
//   1. disabled 버튼 — 브라우저가 이벤트 자체를 안 쏴서 흔적이 0
//   2. aria-disabled 버튼 — 이벤트는 오지만 핸들러가 없음
//   3. 오버레이 스크림 — 닫기 핸들러가 없어 탭이 그냥 먹힘
// 이 모듈은 document 레벨에서 세 경우를 잡아 'dead click' 이벤트로 올린다.
//
// disabled 요소는 click 이벤트의 target이 조상으로 바뀌므로 e.target을 믿으면 안 된다.
// 좌표로 elementFromPoint를 다시 찍어야 진짜 눌린 요소가 나온다.
// ================================

import { trackEvent } from './client'

/** 계측 대상 표식 — 컴포넌트 이름. rage click 집계 키와 동일한 값을 쓴다. */
const RC_ATTR = 'data-rc'
/** 스크림처럼 "자기 자신이 눌렸을 때만 dead"인 요소 표식. */
const DEAD_ATTR = 'data-rc-dead'

/** 같은 컴포넌트가 폭주해 이벤트를 도배하지 않게 상한을 둔다. */
const WINDOW_MS = 30_000
const MAX_PER_WINDOW = 10

/** 연타 상관관계를 보려면 "몇 번째 연속 dead click인지"가 필요하다. */
const STREAK_RESET_MS = 2_000

interface DeadClickTarget {
  rc: string
  reason: 'disabled' | 'aria-disabled' | 'scrim'
}

function classify(node: HTMLElement, hit: Element | null): DeadClickTarget | null {
  const rc = node.getAttribute(RC_ATTR)
  if (!rc) return null

  // 스크림류: 자식(카드 내부)이 아니라 스크림 자신이 눌렸을 때만 dead로 본다
  if (node.getAttribute(DEAD_ATTR) === 'scrim') {
    return node === hit ? { rc, reason: 'scrim' } : null
  }

  if (node.hasAttribute('disabled')) return { rc, reason: 'disabled' }
  if (node.getAttribute('aria-disabled') === 'true') return { rc, reason: 'aria-disabled' }

  return null
}

/** pointer-events:none 폴백 스캔 상한 — 컨테이너가 커도 비용이 튀지 않게. */
const MAX_SCAN = 40

/**
 * Button 2.0은 disabled일 때 pointer-events:none을 건다. 그러면 elementFromPoint가
 * 버튼을 아예 건너뛰고 부모를 돌려줘 위 경로로는 잡히지 않는다.
 * 부모 서브트리에서 좌표를 품는 disabled 계측 노드를 직접 찾아 보완한다.
 */
function scanInertDescendant(container: Element, x: number, y: number): DeadClickTarget | null {
  const nodes = container.querySelectorAll<HTMLElement>(`[${RC_ATTR}]`)
  const limit = Math.min(nodes.length, MAX_SCAN)
  for (let i = 0; i < limit; i += 1) {
    const node = nodes[i]
    const r = node.getBoundingClientRect()
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const target = classify(node, node)
    if (target) return target
  }
  return null
}

function resolveTarget(hit: Element | null, x: number, y: number): DeadClickTarget | null {
  if (!hit) return null

  const node = hit.closest(`[${RC_ATTR}]`)
  if (node instanceof HTMLElement) {
    const target = classify(node, hit)
    if (target) return target
  }

  return scanInertDescendant(hit, x, y)
}

/* ── no-op click ──────────────────────────────────────────────────
 * disabled가 아닌데도 눌러서 아무 일이 안 일어나는 클릭. 실제 rage click의 대부분이
 * 여기 있었다(온보딩 smooth scroll 무시, 캐러셀 애니메이션 중 클릭 흡수 등).
 * 클릭 후 짧은 창 동안 DOM 변화·URL 변화·스크롤 변화가 하나도 없으면 무반응으로 본다.
 * ---------------------------------------------------------------- */

/** 반응을 기다리는 시간 — 트랜지션(≈400ms)보다 넉넉히 길게 */
const NOOP_WINDOW_MS = 700

function watchForResponse(rc: string, path: string): void {
  const startUrl = window.location.href
  const startScrollY = window.scrollY
  const startScrollX = window.scrollX
  let changed = false

  const observer = new MutationObserver(() => {
    changed = true
    observer.disconnect()
  })
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })

  window.setTimeout(() => {
    observer.disconnect()
    if (changed) return
    if (window.location.href !== startUrl) return
    if (window.scrollY !== startScrollY || window.scrollX !== startScrollX) return

    trackEvent('no-op click', { rc, path })
  }, NOOP_WINDOW_MS)
}

export function installDeadClickTracking(): () => void {
  if (typeof document === 'undefined') return () => {}

  const emitted = new Map<string, number[]>()
  let streakRc: string | null = null
  let streakCount = 0
  let streakAt = 0

  const allow = (rc: string, now: number) => {
    const hits = (emitted.get(rc) ?? []).filter((t) => now - t < WINDOW_MS)
    if (hits.length >= MAX_PER_WINDOW) {
      emitted.set(rc, hits)
      return false
    }
    hits.push(now)
    emitted.set(rc, hits)
    return true
  }

  const onClick = (e: MouseEvent) => {
    // 키보드로 발생한 합성 클릭은 좌표가 (0,0) — elementFromPoint가 무의미
    if (e.detail === 0) return

    const hit = document.elementFromPoint(e.clientX, e.clientY)
    const target = resolveTarget(hit, e.clientX, e.clientY)
    if (!target) {
      // disabled는 아니지만 계측 표식이 있는 요소 — 반응이 있었는지 지켜본다
      const node = hit?.closest(`[${RC_ATTR}]`)
      const rc = node?.getAttribute(RC_ATTR)
      if (rc && allow(`noop:${rc}`, Date.now())) {
        watchForResponse(rc, window.location.pathname)
      }
      return
    }

    const now = Date.now()
    if (streakRc === target.rc && now - streakAt < STREAK_RESET_MS) {
      streakCount += 1
    } else {
      streakRc = target.rc
      streakCount = 1
    }
    streakAt = now

    if (!allow(target.rc, now)) return

    trackEvent('dead click', {
      rc: target.rc,
      reason: target.reason,
      streak: streakCount,
      path: window.location.pathname,
    })
  }

  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
