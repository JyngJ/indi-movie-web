import React from 'react'

interface GenreChipProps {
  children: React.ReactNode
}

export function GenreChip({ children }: GenreChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        fontSize: 'var(--text-caption)',
        padding: '4px 8px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-surface-raised)',
        color: 'var(--color-text-caption)',
        border: '1px solid var(--color-border)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
