import React from 'react'

interface GenreChipProps {
  children: React.ReactNode
}

export function GenreChip({ children }: GenreChipProps) {
  return (
    <span
      style={{
        fontSize: 'var(--text-caption)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-full)',
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
