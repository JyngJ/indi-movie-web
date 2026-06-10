import { buildDateOptions, type DateId } from './dateHelpers'
import { DropdownRow } from './DropdownRow'
import { IcoCalendar, IcoArrowRight } from './icons'

/* -- DateDropdown ------------------------------------------------- */
export function DateDropdown({ selectedId, onSelect, onPickCustom, style }: {
  selectedId: DateId
  onSelect: (id: DateId) => void
  onPickCustom: () => void
  style?: React.CSSProperties
}) {
  const options = buildDateOptions()
  return (
    <div style={{
      width: 252,
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      ...style,
    }}>
      {options.map((opt) => (
        <DropdownRow
          key={opt.id}
          kind="radio"
          label={opt.label}
          sub={opt.sub}
          selected={selectedId === opt.id}
          onClick={() => onSelect(opt.id as DateId)}
          isLast={false}
        />
      ))}
      <button
        onClick={onPickCustom}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 14px', width: '100%',
          background: 'var(--color-surface-raised)',
          border: 'none', borderTop: '1px solid var(--color-border)',
          cursor: 'pointer', minHeight: 'unset',
          color: 'var(--color-text-body)',
        }}
      >
        <IcoCalendar />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, textAlign: 'left' }}>
          날짜 직접 선택
        </span>
        <IcoArrowRight />
      </button>
    </div>
  )
}
