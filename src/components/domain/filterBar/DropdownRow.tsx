import { Icon } from '@/components/primitives'

/* -- DropdownRow -------------------------------------------------- */
interface DropdownRowProps {
  kind: 'radio' | 'checkbox'
  label: string
  sub?: string
  selected: boolean
  onClick: () => void
  isLast?: boolean
  /** 라벨 오른쪽 배지 (예: "현재 위치") */
  badge?: string
  /** 스크롤 타겟팅용 — 드롭다운이 열릴 때 이 행으로 이동할 수 있게 */
  rowRef?: React.Ref<HTMLButtonElement>
}

export function DropdownRow({ kind, label, sub, selected, onClick, isLast, badge, rowRef }: DropdownRowProps) {
  return (
    <button
      ref={rowRef}
      data-rc={`filter-row-${kind}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: sub ? 'flex-start' : 'center',
        gap: 12,
        padding: '12px 16px',
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
        {selected && <Icon name="check" size={11} color="var(--color-on-accent)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: selected ? 600 : 500,
          color: selected ? 'var(--filter-row-label-sel)' : 'var(--color-text-body)',
          lineHeight: 1.3,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
        }}>
          {label}
          {badge && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 'var(--text-badge)',
              fontWeight: 600,
              lineHeight: 1,
              padding: 'var(--spacing-1) var(--spacing-2)',
              borderRadius: 'var(--radius-badge)',
              backgroundColor: 'var(--color-primary-subtle-l)',
              color: 'var(--color-primary-base)',
              whiteSpace: 'nowrap',
            }}>
              {badge}
            </span>
          )}
        </div>
        {sub && (
          <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  )
}
