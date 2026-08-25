import { useEffect, useRef } from 'react'
import { REGIONS } from '@/lib/regions'
import { DropdownRow } from '@/components/primitives/DropdownRow'

/* -- RegionDropdown ----------------------------------------------- */
export function RegionDropdown({ selectedId, currentLocationId, onSelect, style }: {
  selectedId: string | null
  /** 접속 위치로 추정된 지역 — 해당 행에 "현재 위치" 배지를 달고 열릴 때 그 행으로 스크롤 */
  currentLocationId?: string | null
  onSelect: (id: string | null) => void
  style?: React.CSSProperties
}) {
  const METRO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
  const PROVINCES = REGIONS.filter(r => !METRO.includes(r.id))
  const metros = REGIONS.filter(r => METRO.includes(r.id))

  /* 열릴 때 현재 위치 행이 보이게 스크롤 — 단 사용자가 이미 고른 지역이 있으면
     그쪽이 관심사이므로 선택 행을 우선한다 */
  const scrollTargetRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    scrollTargetRef.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  const scrollTargetId = selectedId ?? currentLocationId ?? null

  const renderRow = (r: { id: string; label: string }, isLast: boolean) => (
    <DropdownRow
      key={r.id}
      kind="radio"
      label={r.label}
      badge={r.id === currentLocationId ? '현재 위치' : undefined}
      selected={selectedId === r.id}
      onClick={() => onSelect(selectedId === r.id ? null : r.id)}
      isLast={isLast}
      rowRef={r.id === scrollTargetId ? scrollTargetRef : undefined}
    />
  )

  return (
    <div style={{
      width: 220,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      maxHeight: 'min(420px, 70vh)',
      overflowY: 'auto',
      ...style,
    }}>
      <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px' }}>
        광역시
      </div>
      {metros.map((r) => renderRow(r, false))}
      <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px', borderTop: '1px solid var(--color-border)' }}>
        도·특별자치도
      </div>
      {PROVINCES.map((r, i) => renderRow(r, i === PROVINCES.length - 1))}
    </div>
  )
}
