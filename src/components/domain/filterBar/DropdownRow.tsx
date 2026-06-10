import { IcoCheck } from './icons'

/* -- DropdownRow -------------------------------------------------- */
interface DropdownRowProps {
  kind: 'radio' | 'checkbox'
  label: string
  sub?: string
  selected: boolean
  onClick: () => void
  isLast?: boolean
}

export function DropdownRow({ kind, label, sub, selected, onClick, isLast }: DropdownRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: sub ? 'flex-start' : 'center',
        gap: 12,
        padding: '12px 14px',
        width: '100%',
        background: selected ? 'rgba(74,99,128,0.13)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 'unset',
      }}
    >
      <div style={{
        width: 22, height: 22, flexShrink: 0,
        borderRadius: kind === 'radio' ? '50%' : 5,
        background: selected ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
        border: selected ? 'none' : '1px solid var(--filter-indicator-bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: sub ? 1 : 0,
        transition: 'background 150ms',
      }}>
        {selected && <IcoCheck />}
      </div>
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: selected ? 600 : 500,
          color: selected ? 'var(--filter-row-label-sel)' : 'var(--color-text-body)',
          lineHeight: 1.3,
        }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--color-text-caption)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  )
}
