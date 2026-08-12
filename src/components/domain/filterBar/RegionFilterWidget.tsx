'use client'

import { useState, useRef, useEffect } from 'react'
import { FilterChip } from './FilterChip'
import { RegionDropdown } from './RegionDropdown'
import { getStoredRegion, setStoredRegion, subscribeStoredRegion } from '@/lib/regionStorage'
import { useCurrentLocationRegion } from '@/hooks/useCurrentLocationRegion'

export function RegionFilterWidget({ onRegionChange }: { onRegionChange?: (id: string | null) => void } = {}) {
  // localStorage 초기화 금지 — SSR(null)과 갈려 hydration mismatch 나던 자리 (effect에서 로드)
  const [region, setRegion] = useState<string | null>(null)
  const currentLocationRegion = useCurrentLocationRegion()
  useEffect(() => { setRegion(getStoredRegion()) }, [])
  // 지도 탭 등 다른 화면에서 지역이 바뀌면 이벤트로 동기 — persistent 탭 마운트라 재마운트가 없음.
  // onRegionChange는 부르지 않는다(부모 핸들러가 setStoredRegion을 다시 불러 이벤트 루프가 됨).
  useEffect(() => subscribeStoredRegion(setRegion), [])
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!chipRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function pickRegion(id: string | null) {
    setRegion(id)
    setStoredRegion(id)
    setOpen(false)
    onRegionChange?.(id)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <FilterChip
        label="검색 지역"
        value={region ?? undefined}
        open={open}
        selected={!!region}
        hasDropdown
        onClick={() => setOpen((v) => !v)}
        onClear={region ? () => pickRegion(null) : undefined}
        chipRef={chipRef}
      />
      {open && (
        <div
          ref={dropdownRef}
          style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 200 }}
        >
          <RegionDropdown selectedId={region} currentLocationId={currentLocationRegion} onSelect={pickRegion} />
        </div>
      )}
    </div>
  )
}
