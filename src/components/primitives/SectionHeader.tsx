import React from 'react'

interface SectionHeaderProps {
  title: React.ReactNode
  emoji?: React.ReactNode
  description?: React.ReactNode
  isDesktop?: boolean
  /** trailing이 붙는 위치: 데스크톱에선 제목+설명 블록 세로 중앙, 모바일에선 제목 줄만 (예: 좌우 스크롤 버튼) */
  trailing?: React.ReactNode
}

export function SectionHeader({ title, emoji, description, isDesktop = false, trailing }: SectionHeaderProps) {
  const titleEl = (
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
  )

  const descEl = description && (
    <p
      style={{
        margin: '4px 0 0',
        padding: isDesktop ? 0 : '0 16px',
        fontSize: isDesktop ? 'var(--text-meta)' : 'var(--text-caption)',
        color: 'var(--color-text-caption)',
        lineHeight: 1.5,
      }}
    >
      {description}
    </p>
  )

  // 데스크톱: trailing을 제목+설명 블록 전체의 세로 중앙에 맞춤
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px' }}>
        <div style={{ minWidth: 0 }}>
          {titleEl}
          {descEl}
        </div>
        {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      </div>
    )
  }

  // 모바일: trailing은 제목 줄에만 맞추고, 설명은 그 아래 별도 줄
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px' }}>
        {titleEl}
        {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      </div>
      {descEl}
    </>
  )
}
