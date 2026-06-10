import { IcoClose, IcoChevronLeft } from './icons'

/* ── 공통 패널 래퍼 ── */
export function PanelShell({
  onClose,
  onBack,
  title,
  embedded,
  children,
}: {
  onClose: () => void
  onBack?: () => void
  title?: string
  /** 좌측 도크에 내장될 때 true — 카드 모서리/배경 없이 도크에 꽉 채워 표시 */
  embedded?: boolean
  children: React.ReactNode
}) {
  const btn: React.CSSProperties = {
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer',
    color: 'var(--color-text-body)', borderRadius: 8, flexShrink: 0,
  }
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: embedded ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
      borderRadius: embedded ? 0 : 20,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: onBack ? 8 : 16,
        paddingRight: 8,
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        gap: 4,
      }}>
        {onBack && (
          <button style={btn} onClick={onBack}><IcoChevronLeft /></button>
        )}
        <span style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        <button style={btn} onClick={onClose}><IcoClose /></button>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
        {children}
      </div>
    </div>
  )
}
