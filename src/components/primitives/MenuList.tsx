'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

/** 설정 탭과 같은 카드형 메뉴 리스트 컨테이너 */
export function MenuCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ margin: '12px 16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', ...style }}>
      {children}
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  backgroundColor: 'var(--color-surface-card)',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  minHeight: 'unset',
  borderBottom: '1px solid var(--color-border)',
  textDecoration: 'none',
  fontFamily: 'inherit',
}

/** 메뉴 행 — href면 Link, onClick이면 button. last=true면 하단 보더 제거 */
export function MenuRow({
  icon,
  title,
  description,
  href,
  onClick,
  last,
  disabled,
  tone = 'default',
}: {
  icon?: ReactNode
  title: string
  description?: string
  href?: string
  onClick?: () => void
  last?: boolean
  disabled?: boolean
  tone?: 'default' | 'danger'
}) {
  const titleColor = tone === 'danger' ? 'var(--color-error)' : 'var(--color-text-primary)'
  const inner = (
    <>
      {icon && (
        <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-sub)' }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: titleColor }}>{title}</div>
        {description && <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 4 }}>{description}</div>}
      </div>
      {href && <ChevronRight size={18} strokeWidth={1.75} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />}
    </>
  )
  const style = { ...rowStyle, borderBottom: last ? 'none' : rowStyle.borderBottom, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }
  if (href && !disabled) {
    return <Link href={href} style={style}>{inner}</Link>
  }
  return (
    <button type="button" style={style} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  )
}
