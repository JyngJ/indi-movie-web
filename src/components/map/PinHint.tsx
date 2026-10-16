'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HintBubble } from '@/components/domain/onboarding/HintBubble'

const BUBBLE_WIDTH = 276
const EDGE = 8          // 화면 가장자리 여백
const GAP = 10          // 포스터 아래와 말풍선 사이
const TAIL_HALF = 6     // 꼬리(11px) 절반 — 꼬리 중심을 포스터 중심에 맞춘다
const SAFE_TOP = 120    // 위쪽 검색창·필터 바 아래만 고른다
const SAFE_BOTTOM = 160 // 아래쪽 큐레이션 시트·메뉴 바 위만, 말풍선이 들어갈 자리까지
const GIVE_UP_MS = 8000 // 이만큼 기다려도 보이는 포스터 핀이 없으면(줌이 멀거나 포스터 로딩이 느림) 접고 지역 안내로 넘긴다

interface Placement { top: number; left: number; tailLeft: number }

/** 지금 화면에 온전히 보이고 다른 층에 가리지 않은 포스터 핀 이미지 중 지도 중앙에 가장 가까운 것 */
function pickPosterPin(): HTMLImageElement | null {
  const container = document.querySelector<HTMLElement>('.leaflet-container')
  if (!container) return null
  const c = container.getBoundingClientRect()
  const cx = c.left + c.width / 2
  const cy = c.top + c.height / 2
  let best: HTMLImageElement | null = null
  let bestDist = Infinity
  for (const img of document.querySelectorAll<HTMLImageElement>('.leaflet-marker-pane .leaflet-marker-icon img')) {
    if (!isUsable(img, c)) continue
    const r = img.getBoundingClientRect()
    const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy)
    if (d < bestDist) { bestDist = d; best = img }
  }
  return best
}

function isUsable(img: HTMLImageElement, c: DOMRect): boolean {
  const r = img.getBoundingClientRect()
  if (r.width < 20 || r.height < 20) return false
  if (r.left < c.left + EDGE || r.right > c.right - EDGE) return false
  if (r.top < c.top + SAFE_TOP || r.bottom > c.bottom - SAFE_BOTTOM) return false
  /* 시트·팝업 등 다른 층에 가려졌으면 쓰지 않는다 */
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return !!hit && !!img.closest('.leaflet-marker-icon')?.contains(hit)
}

function place(img: HTMLImageElement): Placement {
  const r = img.getBoundingClientRect()
  const center = r.left + r.width / 2
  const left = Math.min(Math.max(center - 24 - TAIL_HALF, EDGE), window.innerWidth - BUBBLE_WIDTH - EDGE)
  return { top: r.bottom + GAP, left, tailLeft: center - left - TAIL_HALF }
}

/**
 * 지도 첫 방문 핀 안내 — 실제 포스터 핀 하나를 골라 그 아래에 말풍선을 붙인다(2026-10).
 * 핀은 Leaflet이 정적 HTML로 그려 React 참조를 걸 수 없어 DOM에서 고르고, 지도가 움직이면
 * 매 프레임 그 핀을 따라간다. 핀이 화면에서 벗어나거나 가려지면 다른 핀을 다시 고른다.
 */
export function PinHint({ onDismiss }: { onDismiss: () => void }) {
  const [placement, setPlacement] = useState<Placement | null>(null)
  const targetRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    let raf = 0
    const startedAt = performance.now()
    let everShown = false
    const tick = () => {
      const container = document.querySelector<HTMLElement>('.leaflet-container')
      const c = container?.getBoundingClientRect()
      let target = targetRef.current
      if (!target || !target.isConnected || !c || !isUsable(target, c)) {
        target = pickPosterPin()
        targetRef.current = target
      }
      if (target) {
        everShown = true
        const next = place(target)
        setPlacement((prev) =>
          prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.tailLeft - next.tailLeft) < 0.5
            ? prev
            : next,
        )
      } else {
        setPlacement(null)
        if (!everShown && performance.now() - startedAt > GIVE_UP_MS) {
          onDismiss()
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDismiss])

  if (!placement) return null
  return createPortal(
    <HintBubble
      icon="film"
      tail="left"
      tailLeft={placement.tailLeft}
      confirmLabel="알겠어요!"
      onDismiss={onDismiss}
      style={{ position: 'fixed', top: placement.top, left: placement.left, width: BUBBLE_WIDTH, zIndex: 'var(--z-map-popup)' as unknown as number }}
    >
      이 포스터처럼, 핀의 포스터는 지금 그 극장에서 상영 중인 영화예요
    </HintBubble>,
    document.body,
  )
}
