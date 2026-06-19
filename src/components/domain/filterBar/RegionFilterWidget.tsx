'use client'

import { useState, useRef, useEffect } from 'react'
import { FilterChip } from './FilterChip'
import { RegionDropdown } from './RegionDropdown'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'

export function RegionFilterWidget({ onRegionChange }: { onRegionChange?: (id: string | null) => void } = {}) {
  const [region, setRegion] = useState<string | null>(() => getStoredRegion())
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
          style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 200 }}
        >
          <RegionDropdown selectedId={region} onSelect={pickRegion} />
        </div>
      )}
    </div>
  )
}
