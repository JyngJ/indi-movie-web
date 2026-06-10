import { DropdownRow } from './DropdownRow'

/* -- MultiSelectDropdown ----------------------------------------- */
export function MultiSelectDropdown({ options, selectedValues, setSelectedValues, style }: {
  options: readonly string[]
  selectedValues: string[]
  setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>
  style?: React.CSSProperties
}) {
  const toggle = (value: string) =>
    setSelectedValues(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])

  return (
    <div style={{
      width: 236,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 320,
      ...style,
    }}>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {options.map((option, i) => (
          <DropdownRow
            key={option}
            kind="checkbox"
            label={option}
            selected={selectedValues.includes(option)}
            onClick={() => toggle(option)}
            isLast={i === options.length - 1}
          />
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border)',
        minHeight: 40,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
          {selectedValues.length > 0 ? `${selectedValues.length}개 선택됨` : ''}
        </span>
        {selectedValues.length > 0 && (
          <button
            onClick={() => setSelectedValues([])}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 500, color: 'var(--color-primary-base)',
              cursor: 'pointer', minHeight: 'unset',
            }}
          >
            모두 선택 해제
          </button>
        )}
      </div>
    </div>
  )
}
