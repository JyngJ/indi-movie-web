import { IconButton } from './IconButton'
import { Icon } from './Icon'

/* ── 공통 패널 래퍼 ── */
export function PanelShell({
  onClose,
  onBack,
  trailing,
  title,
  embedded,
  children,
}: {
  onClose: () => void
  onBack?: () => void
  title?: string
  /** 닫기 왼쪽 위젯 (하트 등) */
  trailing?: React.ReactNode
  /** 좌측 도크에 내장될 때 true — 카드 모서리/배경 없이 도크에 꽉 채워 표시 */
  embedded?: boolean
  children: React.ReactNode
}) {
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
          <IconButton variant="ghost" size={32} aria-label="뒤로가기" onClick={onBack}><Icon name="chevron-left" size="lg" /></IconButton>
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
        {trailing}
        <IconButton variant="ghost" size={32} aria-label="닫기" onClick={onClose}><Icon name="x" size={18} /></IconButton>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
        {children}
      </div>
    </div>
  )
}
