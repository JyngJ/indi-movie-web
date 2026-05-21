'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'

/* ── SVG 아이콘 ─────────────────────────────────────────────────── */
export const IcoPlus = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IcoMinus = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M5 12h14" />
  </svg>
)
export const IcoLocate = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={12} cy={12} r={6.5} />
    <circle cx={12} cy={12} r={1.7} fill="currentColor" stroke="none" />
    <path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4" />
  </svg>
)
export const IcoSun = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </svg>
)
export const IcoMoon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.2 14.4A7.6 7.6 0 0 1 9.6 3.8 8.7 8.7 0 1 0 20.2 14.4z" />
  </svg>
)

/* ── 줌 이벤트 트래커 ───────────────────────────────────────────── */
export function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

/* ── 뷰포트 bounds 트래커 ────────────────────────────────────────── */
export function BoundsTracker({ onBounds }: { onBounds: (b: L.LatLngBounds) => void }) {
  const map = useMap()
  const cbRef = useRef(onBounds)
  cbRef.current = onBounds
  useMapEvents({ moveend: () => cbRef.current(map.getBounds()) })
  useEffect(() => { cbRef.current(map.getBounds()) }, [map])
  return null
}

/* ── 줌 + 뷰포트 bounds 트래커 ───────────────────────────────────── */
export function ViewportTracker({
  onViewport,
}: {
  onViewport: (viewport: { zoom: number; bounds: L.LatLngBounds }) => void
}) {
  const map = useMap()
  const cbRef = useRef(onViewport)
  cbRef.current = onViewport
  const emit = useCallback(() => {
    cbRef.current({ zoom: map.getZoom(), bounds: map.getBounds() })
  }, [map])
  useMapEvents({ moveend: emit, zoomend: emit })
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(emit)
    })
    return () => cancelAnimationFrame(frame)
  }, [emit])
  return null
}

/* ── 선택 극장 화면 이탈 감지 ────────────────────────────────────── */
export function OffScreenTracker({
  theaterLatLng,
  onOffScreen,
}: {
  theaterLatLng: [number, number] | null
  onOffScreen: (v: boolean) => void
}) {
  const map = useMap()
  const cbRef = useRef(onOffScreen)
  cbRef.current = onOffScreen
  useEffect(() => {
    const check = () => {
      if (!theaterLatLng) { cbRef.current(false); return }
      cbRef.current(!map.getBounds().contains(theaterLatLng))
    }
    check()
    map.on('move', check)
    return () => { map.off('move', check) }
  }, [map, theaterLatLng])
  return null
}

/* ── mapRef 주입 ────────────────────────────────────────────────── */
export function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  mapRef.current = useMap()
  return null
}

/* ── PC 줌 슬라이더 ─────────────────────────────────────────────── */
const SLIDER_ZOOM_LEVELS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const SLIDER_SNAP_STEPS = SLIDER_ZOOM_LEVELS.map((_, index) =>
  Math.round((index / (SLIDER_ZOOM_LEVELS.length - 1)) * 100)
)
const SLIDER_TRACK_H = 132

function snapIndexFromZoom(z: number) {
  let best = 0, bestDist = Infinity
  SLIDER_ZOOM_LEVELS.forEach((lv, i) => {
    const d = Math.abs(lv - z)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

export function ZoomSlider({
  zoom,
  mapRef,
}: {
  zoom: number
  mapRef: React.MutableRefObject<LeafletMap | null>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stepIdx = snapIndexFromZoom(zoom)
  const pct = SLIDER_SNAP_STEPS[stepIdx]

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const track = trackRef.current
    if (!track) return
    const move = (ev: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const raw = 1 - (ev.clientY - rect.top) / rect.height
      const pctVal = Math.max(0, Math.min(1, raw)) * 100
      let bestIdx = 0, bestDist = Infinity
      SLIDER_SNAP_STEPS.forEach((s, i) => {
        const d = Math.abs(s - pctVal)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      })
      mapRef.current?.setZoom(SLIDER_ZOOM_LEVELS[bestIdx])
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    move(e.nativeEvent)
  }, [mapRef])

  const thumbTop = (1 - pct / 100) * SLIDER_TRACK_H - 7

  const stepStep = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(SLIDER_SNAP_STEPS.length - 1, stepIdx + delta))
    mapRef.current?.setZoom(SLIDER_ZOOM_LEVELS[next])
  }, [mapRef, stepIdx])

  const btn: React.CSSProperties = {
    width: 34, height: 34, fontSize: 20, fontWeight: 300, lineHeight: 1,
    border: 'none', background: 'none', cursor: 'pointer', minHeight: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-body)', flexShrink: 0,
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 36, borderRadius: 20,
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-card)',
      boxShadow: 'var(--shadow-md)',
      userSelect: 'none',
    }}>
      <button style={btn} onClick={() => stepStep(1)}>+</button>
      <div style={{ width: 20, height: 1, backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
      <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          ref={trackRef}
          onMouseDown={handleTrackMouseDown}
          style={{
            position: 'relative', width: 4, height: SLIDER_TRACK_H,
            borderRadius: 2, backgroundColor: 'var(--color-border)', cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${pct}%`, borderRadius: 2,
            backgroundColor: 'var(--color-primary-base)',
            transition: 'height 0.08s cubic-bezier(0.34,1.4,0.64,1)',
          }} />
          {SLIDER_SNAP_STEPS.map((s, i) => (
            <div key={s} style={{
              position: 'absolute',
              left: '50%', top: (1 - s / 100) * SLIDER_TRACK_H - 1,
              transform: 'translateX(-50%)',
              width: i === stepIdx ? 10 : 6, height: 2,
              borderRadius: 1,
              backgroundColor: s <= pct ? 'rgba(255,255,255,0.55)' : 'var(--color-border)',
              transition: 'width 0.08s',
              zIndex: 2, pointerEvents: 'none',
            }} />
          ))}
          <div style={{
            position: 'absolute', left: '50%',
            top: thumbTop, transform: 'translateX(-50%)',
            width: 14, height: 14, borderRadius: '50%',
            backgroundColor: '#fff',
            border: '2.5px solid var(--color-primary-base)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
            transition: 'top 0.08s cubic-bezier(0.34,1.4,0.64,1)',
            zIndex: 3, cursor: 'grab', pointerEvents: 'none',
          }} />
        </div>
      </div>
      <div style={{ width: 20, height: 1, backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
      <button style={btn} onClick={() => stepStep(-1)}>−</button>
    </div>
  )
}
