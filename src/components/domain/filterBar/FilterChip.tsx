import { IcoClose, IcoChevron } from './icons'

/* -- FilterChip --------------------------------------------------- */
interface FilterChipProps {
  label: string
  value?: string
  open?: boolean
  selected?: boolean
  hasDropdown?: boolean
  onClick: () => void
  onClear?: () => void
  chipRef?: React.Ref<HTMLButtonElement>
  separator?: string
  /** rage/dead click 집계 키 — 라벨은 한글·동적이라 별도 식별자를 둔다 */
  rc?: string
}

export function FilterChip({ label, value, open, selected, hasDropdown, onClick, onClear, chipRef, separator = '·', rc }: FilterChipProps) {
  /* 피그마 2.0/Chip 정합 (2026-08-09): off = neutral/200 면(무보더), on = primary/100 + primary/700 1px */
  let bg = 'var(--color-surface-raised)'
  let border = '1px solid transparent'
  let pl = '14px'
  let pr = hasDropdown ? '10px' : '14px'

  if (open && !selected) {
    bg = 'var(--color-primary-subtle-l)'
    border = '1px solid var(--color-primary-hover-l)'
  } else if (selected) {
    bg = 'var(--color-primary-subtle-l)'
    border = '1px solid var(--color-primary-base)'
    if (onClear) pr = '6px'
  }

  return (
    <button className="hover-raise"
      ref={chipRef}
      data-rc={rc ? `filter-chip-${rc}` : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        height: 'var(--filter-chip-height)', paddingLeft: pl, paddingRight: pr,
        borderRadius: 'var(--radius-pill)', background: bg, border,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        gap: 4, minHeight: 'unset',
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      {selected && value ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-sub)' }}>
            {label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>&nbsp;{separator}&nbsp;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--filter-chip-value)' }}>
            {value}
          </span>
        </>
      ) : (
        <span style={{
          fontSize: 13,
          fontWeight: open ? 600 : 500,
          color: open ? 'var(--filter-chip-open-text)' : 'var(--color-text-body)',
        }}>
          {label}
        </span>
      )}
      {selected && onClear ? (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{
            width: 20, height: 20, minWidth: 20, minHeight: 20,
            borderRadius: '50%',
            background: 'var(--filter-dismiss-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginLeft: 4, flexShrink: 0,
          }}
        >
          <IcoClose />
        </span>
      ) : hasDropdown ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', marginLeft: 4, flexShrink: 0,
          color: open ? 'var(--filter-chip-open-caret)' : 'var(--color-text-caption)',
        }}>
          <IcoChevron open={!!open} />
        </span>
      ) : null}
    </button>
  )
}
