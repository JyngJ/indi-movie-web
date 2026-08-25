import { Icon } from '@/components/primitives'

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
  /** 'favorite' — 관심 칩. 선택 시 빨강(error-mid)으로 다른 필터와 구분 (2026-08-18) */
  tone?: 'default' | 'favorite'
}

export function FilterChip({ label, value, open, selected, hasDropdown, onClick, onClear, chipRef, separator = '·', rc, tone = 'default' }: FilterChipProps) {
  /* 2.0/FilterPill 상태 — 색은 전부 --filter-chip-* 토큰. 호버 색까지 상태별로 토큰이 갖는다 */
  let bg = 'var(--filter-chip-bg)'
  let bgHover = 'var(--filter-chip-bg-hover)'
  let border = '1px solid var(--filter-chip-bd)'
  let fg = 'var(--filter-chip-fg)'
  let pl = '14px'
  let pr = hasDropdown ? '10px' : '14px'

  if (open && !selected) {
    bg = 'var(--filter-chip-open-bg)'
    bgHover = 'var(--filter-chip-open-bg-hover)'
    border = '1px solid var(--filter-chip-open-bd)'
    fg = 'var(--filter-chip-open-fg)'
  } else if (selected) {
    // 관심 칩만 빨강 계열 — 다른 선택 칩과 같은 문법(옅은 배경 + 진한 테두리·글자) (2026-08-18)
    bg = tone === 'favorite' ? 'var(--filter-chip-fav-bg)' : 'var(--filter-chip-on-bg)'
    bgHover = tone === 'favorite' ? 'var(--filter-chip-fav-bg-hover)' : 'var(--filter-chip-on-bg-hover)'
    border = tone === 'favorite' ? '1px solid var(--filter-chip-fav-bd)' : '1px solid var(--filter-chip-on-bd)'
    fg = tone === 'favorite' ? 'var(--filter-chip-fav-text)' : 'var(--filter-chip-on-fg)'
    if (onClear) pr = '6px'
  }

  return (
    <button className="filter-chip"
      ref={chipRef}
      data-rc={rc ? `filter-chip-${rc}` : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        height: 'var(--filter-chip-height)', paddingLeft: pl, paddingRight: pr,
        borderRadius: 'var(--radius-pill)', border,
        ['--chip-bg' as string]: bg,
        ['--chip-bg-hover' as string]: bgHover,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        gap: 4, minHeight: 'unset',
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
          fontWeight: 'var(--filter-chip-label-weight)' as unknown as number,
          color: fg,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {tone === 'favorite' && (
            <Icon name="heart" size={12} fill="currentColor" color="currentColor" strokeWidth={0} />
          )}
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
          <Icon name="x" size={10} color="var(--color-text-sub)" />
        </span>
      ) : hasDropdown ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', marginLeft: 4, flexShrink: 0,
          color: open ? 'var(--filter-chip-open-caret)' : 'var(--color-text-caption)',
        }}>
          <Icon name="chevron-down" size={11} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 180ms ease' }} />
        </span>
      ) : null}
    </button>
  )
}
