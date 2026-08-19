'use client'

/**
 * 온/오프 스위치 — 알림 설정 등 즉시 반영되는 토글.
 * 색·크기는 토큰만 쓴다. 체크박스를 시각적으로 감춰서 키보드·스크린리더 동작을 그대로 얻는다.
 */
export function Switch({ checked, onChange, disabled, label }: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  /** 스크린리더용 — 시각 라벨은 호출부(MenuRow 등)가 그린다 */
  label: string
}) {
  return (
    <label style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center',
      width: 44, height: 24, flexShrink: 0,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
    }}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'inherit' }}
      />
      <span aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: 'var(--radius-pill)',
        backgroundColor: checked ? 'var(--color-primary-base)' : 'var(--color-neutral-300)',
        transition: 'background-color 150ms ease',
      }} />
      <span aria-hidden style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        backgroundColor: 'var(--color-surface-card)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'left 150ms cubic-bezier(0.32, 0.72, 0, 1)',
      }} />
    </label>
  )
}
