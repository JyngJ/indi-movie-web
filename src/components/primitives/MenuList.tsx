'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'

/** 설정 탭과 같은 카드형 메뉴 리스트 컨테이너.
 *  바깥 테두리는 뺀다(2026-08-20) — 행마다 구분선이 있고 흰 면이 회색 배경 위에 떠 있어
 *  테두리가 한 겹 더 붙으면 상자 안에 상자처럼 보였다. */
export function MenuCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ margin: '12px var(--gutter) 0', borderRadius: 'var(--radius-control)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 'var(--gutter)',
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
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-control)', backgroundColor: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-sub)' }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: titleColor }}>{title}</div>
        {description && <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 4 }}>{description}</div>}
      </div>
      {href && <Icon name="chevron-right" size={18} strokeWidth={1.75} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />}
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
