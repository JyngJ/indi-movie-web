import L, { type LatLngBounds, type Map as LeafletMap } from 'leaflet'

// Apple UIKit dampingRatio=0.825 기준: ζ = d/(2√k) ≈ 0.822
const STIFFNESS = 120
const DAMPING = 21  // ζ = 21/(2√120) ≈ 0.96 — 오버슈트 거의 없는 ease-out

let activeRaf: number | null = null
let activeMap: LeafletMap | null = null
let savedZoomSnap: number | null = null

/** true인 동안 Leaflet moveend 이벤트에서 React 상태 업데이트를 건너뜀 */
export let springActive = false

/** 스프링 정착 시 즉시 호출할 콜백 (MapView에서 recompute 등록) */
let settledCallback: (() => void) | null = null
export function setSpringSettledCallback(cb: () => void) {
  settledCallback = cb
}

function stopActive() {
  if (activeRaf !== null) {
    cancelAnimationFrame(activeRaf)
    activeRaf = null
  }
  // 중단 시 zoomSnap 복원
  if (activeMap !== null && savedZoomSnap !== null) {
    ;(activeMap.options as any).zoomSnap = savedZoomSnap
    activeMap = null
    savedZoomSnap = null
  }
  springActive = false
}

export function springFlyTo(map: LeafletMap, latlng: [number, number], zoom: number): void {
  stopActive()
  // Leaflet 내부 애니메이션 취소 (map.stop()의 setZoom 부작용 없이)
  ;(map as any)._stop()

  const startLat = map.getCenter().lat
  const startLng = map.getCenter().lng
  const startZoom = map.getZoom()

  // 줌 변화가 있을 때 fractional zoom 보간을 위해 zoomSnap 일시 해제
  if (startZoom !== zoom) {
    savedZoomSnap = (map.options as any).zoomSnap as number
    activeMap = map
    ;(map.options as any).zoomSnap = 0
  }

  let t = 0
  let v = 0
  let lastTime: number | null = null
  springActive = true

  const tick = (time: number) => {
    const dt = Math.min((time - (lastTime ?? time)) / 1000, 0.05)
    lastTime = time

    v += (-STIFFNESS * (t - 1) - DAMPING * v) * dt
    t += v * dt

    map.setView(
      [startLat + t * (latlng[0] - startLat), startLng + t * (latlng[1] - startLng)],
      startZoom + t * (zoom - startZoom),
      { animate: false },
    )

    if (Math.abs(1 - t) < 0.0005 && Math.abs(v) < 0.005) {
      springActive = false
      activeRaf = null
      if (savedZoomSnap !== null) {
        ;(map.options as any).zoomSnap = savedZoomSnap
        savedZoomSnap = null
        activeMap = null
      }
      map.setView(latlng, zoom, { animate: false })
      settledCallback?.()
      return
    }

    activeRaf = requestAnimationFrame(tick)
  }

  activeRaf = requestAnimationFrame(tick)
}

export function springFlyToBounds(
  map: LeafletMap,
  bounds: LatLngBounds,
  options?: { padding?: [number, number]; maxZoom?: number },
): void {
  const pad = options?.padding ?? [80, 80]
  const zoom = Math.min(
    map.getBoundsZoom(bounds, false, L.point(pad[0], pad[1])),
    options?.maxZoom ?? 18,
  )
  const center = bounds.getCenter()
  springFlyTo(map, [center.lat, center.lng], zoom)
}
