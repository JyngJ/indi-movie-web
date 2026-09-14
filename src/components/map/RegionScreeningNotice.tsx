'use client'

import { Button, Icon, IconButton } from '@/components/primitives'

/**
 * 지역 필터 때문에 화면에서 빠진 상영을 알리는 안내 카드.
 *
 * 지도는 지역을 고르면 그 지역 bounds로 이동한다. 그래서 같은 영화가 다른 지역에서
 * 상영 중이어도 화면 밖이라 포스터 말풍선이 안 보인다 — 2026-09 실측으로
 * (지역×영화) 조합의 81%가 다른 지역에도 상영이 있었다. 뷰포트는 그대로 두기로 했으므로
 * 화면 밖 상영은 숫자와 진입점으로만 알린다.
 *
 * 토스트가 아니라 카드인 이유: 사라지면 안 되는 정보다. 지역을 바꾸기 전까지 계속 참이고,
 * 누를 곳이 있어야 다음 행동으로 이어진다.
 */
export function RegionScreeningNotice({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: 'var(--spacing-2) var(--gutter) 0',
        padding: 'var(--spacing-3)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-popover)',
        boxShadow: 'var(--shadow-popover)',
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--text-body)',
          lineHeight: 1.5,
          color: 'var(--color-text-body)',
          wordBreak: 'keep-all',
        }}
      >
        {message}
      </span>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {actionLabel}
        </Button>
      )}

      <IconButton variant="ghost" size={32} aria-label="안내 닫기" onClick={onDismiss} style={{ flexShrink: 0 }}>
        <Icon name="x" size={16} />
      </IconButton>
    </div>
  )
}
