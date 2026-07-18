import React from 'react'

interface SectionHeaderProps {
  title: React.ReactNode
  emoji?: React.ReactNode
  description?: React.ReactNode
  isDesktop?: boolean
}

export function SectionHeader({ title, emoji, description, isDesktop = false }: SectionHeaderProps) {
  return (
    <>
      <h2
        style={{
          margin: 0,
          padding: '0 16px',
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
