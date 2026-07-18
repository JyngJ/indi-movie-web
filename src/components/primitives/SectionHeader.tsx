import React from 'react'

interface SectionHeaderProps {
  title: React.ReactNode
  emoji?: React.ReactNode
  description?: React.ReactNode
  isDesktop?: boolean
  /** 제목 줄 오른쪽 끝에 붙는 요소 (예: 좌우 스크롤 버튼) */
  trailing?: React.ReactNode
}

export function SectionHeader({ title, emoji, description, isDesktop = false, trailing }: SectionHeaderProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            minWidth: 0,
            fontSize: isDesktop ? 'var(--text-h2)' : 'var(--text-h3)',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {emoji}
          {title}
        </h2>
        {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      </div>
      {description && (
        <p
          style={{
            margin: '4px 0 0',
            padding: '0 16px',
            fontSize: isDesktop ? 'var(--text-meta)' : 'var(--text-caption)',
            color: 'var(--color-text-caption)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </>
  )
}
