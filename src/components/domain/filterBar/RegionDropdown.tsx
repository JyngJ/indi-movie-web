import { REGIONS } from '@/lib/regions'
import { DropdownRow } from './DropdownRow'

/* -- RegionDropdown ----------------------------------------------- */
export function RegionDropdown({ selectedId, onSelect, style }: {
  selectedId: string | null
  onSelect: (id: string | null) => void
  style?: React.CSSProperties
}) {
  const METRO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
  const PROVINCES = REGIONS.filter(r => !METRO.includes(r.id))
  const metros = REGIONS.filter(r => METRO.includes(r.id))

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
      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px' }}>
        광역시
      </div>
      {metros.map((r, i) => (
        <DropdownRow
          key={r.id}
          kind="radio"
          label={r.label}
          selected={selectedId === r.id}
          onClick={() => onSelect(selectedId === r.id ? null : r.id)}
          isLast={false}
        />
      ))}
      <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-caption)', letterSpacing: '0.5px', borderTop: '1px solid var(--color-border)' }}>
        도·특별자치도
      </div>
      {PROVINCES.map((r, i) => (
        <DropdownRow
          key={r.id}
          kind="radio"
          label={r.label}
          selected={selectedId === r.id}
          onClick={() => onSelect(selectedId === r.id ? null : r.id)}
          isLast={i === PROVINCES.length - 1}
        />
      ))}
    </div>
  )
}
